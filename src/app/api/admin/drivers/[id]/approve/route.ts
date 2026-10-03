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

        const { user: adminUser } = authResult.authContext;
        const driverId = (await context.params).id;

        await connectDb();

        const driver = await User.findById(driverId);
        if (!driver) {
            return NextResponse.json({ success: false, message: "Driver not found" }, { status: 404 });
        }

        // Update User
        driver.role = "partner";
        driver.partnerStatus = "approved";
        driver.status = "ACTIVE";
        driver.partnerOnBoardingSteps = 4;
        driver.rejectionReason = undefined;
        driver.suspendedReason = undefined;
        await driver.save();

        // Update DriverProfile
        const now = new Date();
        await DriverProfile.findOneAndUpdate(
            { user: driver._id },
            {
                $set: {
                    approvalStatus: "APPROVED",
                    status: "ACTIVE",
                    approvedBy: adminUser._id,
                    approvedAt: now,
                    rejectionReason: undefined,
                    suspendedReason: undefined,
                },
            },
            { upsert: true }
        );

        // Also check if driver has a pending vehicle; if so, approve and activate it so driver can take rides
        const vehicle = await Vehicle.findOne({ owner: driver._id });
        if (vehicle && vehicle.status === "pending") {
            vehicle.status = "approved";
            vehicle.approvalStatus = "APPROVED";
            vehicle.isActive = true;
            vehicle.approvedBy = adminUser._id;
            vehicle.approvedAt = now;
            await vehicle.save();
        }

        return NextResponse.json({
            success: true,
            message: `Driver ${driver.name} approved successfully.`,
            driver: {
                _id: driver._id,
                name: driver.name,
                partnerStatus: driver.partnerStatus,
                status: driver.status,
            },
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/admin/drivers/[id]/approve error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to approve driver" },
            { status: 500 }
        );
    }
}

