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
        const reason = body?.reason || "Account suspended due to policy violation or security review.";

        await connectDb();

        const driver = await User.findById(driverId);
        if (!driver) {
            return NextResponse.json({ success: false, message: "Driver not found" }, { status: 404 });
        }

        // Suspend driver
        driver.status = "SUSPENDED";
        driver.partnerStatus = "suspended";
        driver.suspendedReason = reason;
        driver.isOnline = false;
        await driver.save();

        await DriverProfile.findOneAndUpdate(
            { user: driver._id },
            {
                $set: {
                    status: "SUSPENDED",
                    approvalStatus: "SUSPENDED",
                    suspendedReason: reason,
                    isOnline: false,
                    isAvailable: false,
                },
            },
            { upsert: true }
        );

        // Deactivate all vehicles owned by this driver
        await Vehicle.updateMany(
            { owner: driver._id },
            { $set: { isActive: false, status: "suspended", approvalStatus: "SUSPENDED", suspendedReason: reason } }
        );

        return NextResponse.json({
            success: true,
            message: `Driver ${driver.name} has been suspended.`,
            driver: {
                _id: driver._id,
                name: driver.name,
                status: driver.status,
                suspendedReason: reason,
            },
        }, { status: 200 });

    } catch (error: any) {
        console.error("POST /api/admin/drivers/[id]/suspend error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to suspend driver" },
            { status: 500 }
        );
    }
}

