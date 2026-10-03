import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import DriverProfile from "@/models/driverProfile.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        await connectDb();

        const searchParams = req.nextUrl.searchParams;
        const statusFilter = searchParams.get("status") || "all";

        // Query criteria for users who are drivers / partners
        const userQuery: any = {
            role: { $in: ["partner", "driver"] },
        };

        if (statusFilter === "pending") {
            userQuery.partnerStatus = "pending";
        } else if (statusFilter === "approved") {
            userQuery.partnerStatus = "approved";
            userQuery.status = { $ne: "SUSPENDED" };
        } else if (statusFilter === "rejected") {
            userQuery.partnerStatus = "rejected";
        } else if (statusFilter === "suspended") {
            userQuery.$or = [{ status: "SUSPENDED" }, { partnerStatus: "suspended" }];
            delete userQuery.partnerStatus;
        }

        const drivers = await User.find(userQuery).sort({ createdAt: -1 }).lean();
        const driverIds = drivers.map((d) => d._id);

        // Fetch corresponding DriverProfiles and Vehicles
        const profiles = await DriverProfile.find({ user: { $in: driverIds } }).lean();
        const profileMap = new Map(profiles.map((p) => [String(p.user), p]));

        const vehicles = await Vehicle.find({ owner: { $in: driverIds } }).lean();
        const vehicleMap = new Map();
        vehicles.forEach((v) => {
            const key = String(v.owner);
            if (!vehicleMap.has(key)) vehicleMap.set(key, []);
            vehicleMap.get(key).push(v);
        });

        const enrichedDrivers = drivers.map((d) => {
            const profile = profileMap.get(String(d._id)) || null;
            const attachedVehicles = vehicleMap.get(String(d._id)) || [];
            return {
                ...d,
                driverProfile: profile,
                vehicles: attachedVehicles,
                approvalStatus: profile?.approvalStatus || (d.partnerStatus === "approved" ? "APPROVED" : d.partnerStatus === "rejected" ? "REJECTED" : "PENDING"),
                isSuspended: d.status === "SUSPENDED" || d.partnerStatus === "suspended",
            };
        });

        return NextResponse.json({
            success: true,
            total: enrichedDrivers.length,
            drivers: enrichedDrivers,
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/admin/drivers error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch drivers" },
            { status: 500 }
        );
    }
}

