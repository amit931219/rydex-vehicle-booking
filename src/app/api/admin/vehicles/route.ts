import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        await connectDb();

        const searchParams = req.nextUrl.searchParams;
        const statusFilter = searchParams.get("status") || "all";

        const query: any = {};
        if (statusFilter === "pending") {
            query.status = "pending";
        } else if (statusFilter === "approved") {
            query.status = "approved";
        } else if (statusFilter === "rejected") {
            query.status = "rejected";
        } else if (statusFilter === "suspended") {
            query.status = "suspended";
        }

        const vehicles = await Vehicle.find(query)
            .populate("owner", "name email mobileNumber role partnerStatus status")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            total: vehicles.length,
            vehicles,
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/admin/vehicles error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch vehicles" },
            { status: 500 }
        );
    }
}

