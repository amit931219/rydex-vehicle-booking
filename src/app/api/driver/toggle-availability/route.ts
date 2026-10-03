import { requireActiveApprovedDriver } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import DriverProfile from "@/models/driverProfile.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireActiveApprovedDriver();
        if (authResult.errorResponse) return authResult.errorResponse;

        const { user } = authResult.authContext;
        await connectDb();

        const body = await req.json().catch(() => ({}));
        let driverProfile = await DriverProfile.findOne({ user: user._id });

        if (!driverProfile) {
            driverProfile = await DriverProfile.create({
                user: user._id,
                approvalStatus: "APPROVED",
                status: "ACTIVE",
                isOnline: user.isOnline,
                isAvailable: true,
            });
        }

        const targetAvailable = typeof body.isAvailable === "boolean" ? body.isAvailable : !driverProfile.isAvailable;
        driverProfile.isAvailable = targetAvailable;
        await driverProfile.save();

        return NextResponse.json({
            success: true,
            message: targetAvailable ? "Status set to AVAILABLE for rides." : "Status set to BUSY / UNAVAILABLE.",
            isAvailable: targetAvailable,
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/driver/toggle-availability error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to toggle availability" },
            { status: 500 }
        );
    }
}

