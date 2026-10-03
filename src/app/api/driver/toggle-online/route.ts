import { requireAuth } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import DriverProfile from "@/models/driverProfile.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth();
        if (authResult.errorResponse) return authResult.errorResponse;

        const { user } = authResult.authContext;
        await connectDb();

        // 1. Verify Driver approval
        const driverProfile = await DriverProfile.findOne({ user: user._id });
        const isDriverApproved = (driverProfile?.approvalStatus === "APPROVED" || user.partnerStatus === "approved") && 
                                 user.status !== "SUSPENDED" && 
                                 driverProfile?.status !== "SUSPENDED";

        if (!isDriverApproved) {
            return NextResponse.json({
                success: false,
                message: "You cannot go online because your driver account is not approved or is currently suspended.",
                driverApprovalStatus: driverProfile?.approvalStatus || user.partnerStatus || "PENDING",
            }, { status: 403 });
        }

        // 2. Verify Vehicle approval and active state
        const vehicle = await Vehicle.findOne({ owner: user._id });
        if (!vehicle) {
            return NextResponse.json({
                success: false,
                message: "You cannot go online without a registered vehicle. Please submit your vehicle details.",
            }, { status: 403 });
        }

        const isVehicleApproved = (vehicle.approvalStatus === "APPROVED" || vehicle.status === "approved") && vehicle.isActive;
        if (!isVehicleApproved) {
            return NextResponse.json({
                success: false,
                message: `You cannot go online because your vehicle is ${vehicle.status || "pending approval"} or inactive.`,
                vehicleStatus: vehicle.status,
                vehicleApprovalStatus: vehicle.approvalStatus,
            }, { status: 403 });
        }

        // 3. Process online toggle
        const body = await req.json().catch(() => ({}));
        const targetOnline = typeof body.isOnline === "boolean" ? body.isOnline : !user.isOnline;

        // Update User and DriverProfile
        await User.findByIdAndUpdate(user._id, { isOnline: targetOnline });
        if (driverProfile) {
            driverProfile.isOnline = targetOnline;
            await driverProfile.save();
        }

        return NextResponse.json({
            success: true,
            message: targetOnline ? "You are now ONLINE and ready to receive rides." : "You are now OFFLINE.",
            isOnline: targetOnline,
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/driver/toggle-online error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to toggle online status" },
            { status: 500 }
        );
    }
}

