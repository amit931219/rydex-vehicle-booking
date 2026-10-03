import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

async function handleApprove(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        const { user: adminUser } = authResult.authContext;
        const vehicleId = (await context.params).id;

        await connectDb();

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return NextResponse.json({ success: false, message: "Vehicle not found" }, { status: 404 });
        }

        vehicle.status = "approved";
        vehicle.approvalStatus = "APPROVED";
        vehicle.isActive = true;
        vehicle.rejectionReason = undefined;
        vehicle.approvedBy = adminUser._id;
        vehicle.approvedAt = new Date();
        await vehicle.save();

        // Advance partner onboarding step if legacy partner
        const owner = await User.findById(vehicle.owner);
        if (owner && owner.partnerOnBoardingSteps < 7) {
            owner.partnerOnBoardingSteps = 7;
            await owner.save();
        }

        return NextResponse.json({
            success: true,
            message: `Vehicle ${vehicle.number} approved successfully and marked active.`,
            vehicle,
        }, { status: 200 });

    } catch (error: any) {
        console.error("Vehicle approve error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to approve vehicle" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    return handleApprove(req, context);
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    return handleApprove(req, context);
}

