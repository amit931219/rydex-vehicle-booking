import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        const vehicleId = (await context.params).id;
        const body = await req.json().catch(() => ({}));
        const reason = body?.reason || "Vehicle documents or inspection did not meet safety standards.";

        await connectDb();

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
        }

        vehicle.status = "rejected";
        vehicle.approvalStatus = "REJECTED";
        vehicle.isActive = false;
        vehicle.rejectionReason = reason;
        await vehicle.save();

        return NextResponse.json({
            success: true,
            message: `Vehicle ${vehicle.number} has been rejected.`,
            vehicle,
        }, { status: 200 });

    } catch (error: any) {
        console.error("Vehicle reject error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to reject vehicle" },
            { status: 500 }
        );
    }
}

