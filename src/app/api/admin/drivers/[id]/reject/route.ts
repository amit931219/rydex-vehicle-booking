import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import DriverProfile from "@/models/driverProfile.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        const driverId = (await context.params).id;
        const body = await req.json().catch(() => ({}));
        const reason = body?.reason || "Application requirements were not met.";

        await connectDb();

        const driver = await User.findById(driverId);
        if (!driver) {
            return NextResponse.json({ success: false, message: "Driver not found" }, { status: 404 });
        }

        driver.partnerStatus = "rejected";
        driver.rejectionReason = reason;
        driver.isOnline = false;
        await driver.save();

        await DriverProfile.findOneAndUpdate(
            { user: driver._id },
            {
                $set: {
                    approvalStatus: "REJECTED",
                    rejectionReason: reason,
                    isOnline: false,
                },
            },
            { upsert: true }
        );

        // Deactivate vehicle
        await Vehicle.updateMany({ owner: driver._id }, { isActive: false });

        return NextResponse.json({
            success: true,
            message: `Driver application for ${driver.name} was rejected.`,
            rejectionReason: reason,
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/admin/drivers/[id]/reject error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to reject driver" },
            { status: 500 }
        );
    }
}

