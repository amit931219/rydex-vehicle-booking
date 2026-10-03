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

        await connectDb();

        const driver = await User.findById(driverId);
        if (!driver) {
            return NextResponse.json({ success: false, message: "Driver not found" }, { status: 404 });
        }

        driver.status = "ACTIVE";
        driver.partnerStatus = "approved";
        driver.suspendedReason = undefined;
        await driver.save();

        await DriverProfile.findOneAndUpdate(
            { user: driver._id },
            {
                $set: {
                    status: "ACTIVE",
                    approvalStatus: "APPROVED",
                    suspendedReason: undefined,
                },
            },
            { upsert: true }
        );

        // Reactivate vehicles
        await Vehicle.updateMany(
            { owner: driver._id },
            { $set: { status: "approved", approvalStatus: "APPROVED", isActive: true, suspendedReason: undefined } }
        );

        return NextResponse.json({
            success: true,
            message: `Driver ${driver.name} has been reactivated.`,
            driver: {
                _id: driver._id,
                name: driver.name,
                status: driver.status,
                partnerStatus: driver.partnerStatus,
            },
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/admin/drivers/[id]/reactivate error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to reactivate driver" },
            { status: 500 }
        );
    }
}

