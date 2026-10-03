import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import DriverProfile from "@/models/driverProfile.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const cleanEmail = session.user.email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const body = await req.json().catch(() => ({}));
        const targetRole = body?.targetRole || (user.role === "partner" || user.role === "driver" ? "user" : "partner");

        // Never trust client to switch to admin
        if (targetRole === "admin") {
            return NextResponse.json({
                success: false,
                message: "Unauthorized: Admin privileges cannot be self-assigned.",
            }, { status: 403 });
        }

        if (targetRole === "partner" || targetRole === "driver") {
            // Check suspension
            if (user.status === "SUSPENDED") {
                return NextResponse.json({
                    success: false,
                    message: "Your driver account is currently suspended. Please contact platform support.",
                    status: "SUSPENDED",
                }, { status: 403 });
            }

            // Check driver approval status
            const driverProfile = await DriverProfile.findOne({ user: user._id });
            const isApproved = (user.partnerStatus === "approved" || driverProfile?.approvalStatus === "APPROVED");

            if (!isApproved) {
                const currentStatus = driverProfile?.approvalStatus || user.partnerStatus || "NOT_APPLIED";
                let message = "You need an approved driver account to access driver mode.";
                let redirectUrl = "/driver/apply";

                if (currentStatus === "pending" || currentStatus === "PENDING") {
                    message = "Your driver application is currently pending admin review. You cannot go online until approved.";
                    redirectUrl = "/driver/dashboard";
                } else if (currentStatus === "rejected" || currentStatus === "REJECTED") {
                    message = `Your driver application was rejected. Reason: ${user.rejectionReason || driverProfile?.rejectionReason || "Requirements not met."}`;
                    redirectUrl = "/driver/apply";
                }

                return NextResponse.json({
                    success: false,
                    requiresApproval: true,
                    status: currentStatus,
                    message,
                    redirectUrl,
                }, { status: 403 });
            }

            user.role = "partner";
            await user.save();

            return NextResponse.json({
                success: true,
                message: "Switched to Driver mode successfully.",
                role: user.role,
            }, { status: 200 });

        } else {
            // Switching to Customer / User mode
            user.role = "user";
            user.isOnline = false; // Going customer mode takes driver offline
            await user.save();

            if (user.partnerStatus === "approved") {
                await DriverProfile.findOneAndUpdate(
                    { user: user._id },
                    { $set: { isOnline: false } }
                );
            }

            return NextResponse.json({
                success: true,
                message: "Switched to Customer mode.",
                role: "user",
            }, { status: 200 });
        }

    } catch (error: any) {
        console.error("switch-role error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to switch role" },
            { status: 500 }
        );
    }
}
