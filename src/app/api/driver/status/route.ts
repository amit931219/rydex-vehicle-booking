import { requireAuth } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import DriverProfile from "@/models/driverProfile.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth();
        if (authResult.errorResponse) return authResult.errorResponse;

        const { user } = authResult.authContext;
        await connectDb();

        const driverProfile = await DriverProfile.findOne({ user: user._id });
        const vehicle = await Vehicle.findOne({ owner: user._id });

        const driverApprovalStatus = driverProfile?.approvalStatus || 
            (user.partnerStatus === "approved" ? "APPROVED" : user.partnerStatus === "rejected" ? "REJECTED" : user.role === "partner" ? "PENDING" : "NOT_APPLIED");

        const vehicleApprovalStatus = vehicle?.approvalStatus || 
            (vehicle?.status === "approved" ? "APPROVED" : vehicle?.status === "rejected" ? "REJECTED" : vehicle ? "PENDING" : "NONE");

        const isDriverApproved = driverApprovalStatus === "APPROVED" && user.status !== "SUSPENDED";
        const isVehicleApproved = vehicleApprovalStatus === "APPROVED" && vehicle?.isActive === true;
        const canGoOnline = isDriverApproved && isVehicleApproved;

        return NextResponse.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status || "ACTIVE",
                partnerStatus: user.partnerStatus,
                isOnline: user.isOnline,
            },
            driverApprovalStatus,
            driverStatus: driverProfile?.status || user.status || "ACTIVE",
            rejectionReason: driverProfile?.rejectionReason || user.rejectionReason,
            suspendedReason: driverProfile?.suspendedReason || user.suspendedReason,
            vehicle: vehicle ? {
                _id: vehicle._id,
                type: vehicle.type,
                vehicleModel: vehicle.vehicleModel,
                number: vehicle.number,
                status: vehicle.status,
                approvalStatus: vehicleApprovalStatus,
                isActive: vehicle.isActive,
                rejectionReason: vehicle.rejectionReason,
            } : null,
            isOnline: Boolean(user.isOnline),
            isAvailable: driverProfile?.isAvailable ?? true,
            canGoOnline,
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/driver/status error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch driver status" },
            { status: 500 }
        );
    }
}

