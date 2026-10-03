import { requireAuth } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireAuth();
        if (authResult.errorResponse) return authResult.errorResponse;

        const { user } = authResult.authContext;
        const vehicleId = (await context.params).id;

        await connectDb();

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
        }

        const isAdmin = user.role?.toLowerCase() === "admin";
        const isOwner = vehicle.owner.toString() === user._id.toString();

        if (!isAdmin && !isOwner) {
            return NextResponse.json(
                { success: false, message: "Forbidden: You are not authorized to modify this vehicle." },
                { status: 403 }
            );
        }

        const isApproved = vehicle.status === "approved" || vehicle.approvalStatus === "APPROVED";
        if (!isApproved) {
            return NextResponse.json(
                { success: false, message: `Cannot activate vehicle. Current status is ${vehicle.status}. Only approved vehicles can be activated.` },
                { status: 400 }
            );
        }

        const body = await req.json().catch(() => ({}));
        const newActiveState = typeof body.isActive === "boolean" ? body.isActive : !vehicle.isActive;

        vehicle.isActive = newActiveState;
        await vehicle.save();

        return NextResponse.json({
            success: true,
            message: `Vehicle ${vehicle.number} is now ${newActiveState ? "ACTIVE" : "INACTIVE"}.`,
            isActive: newActiveState,
            vehicle,
        }, { status: 200 });

    } catch (error: any) {
        console.error("Vehicle toggle-active error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to update vehicle active status" },
            { status: 500 }
        );
    }
}

