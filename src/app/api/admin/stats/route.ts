import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        await connectDb();

        const [
            totalUsers,
            totalDrivers,
            pendingDrivers,
            approvedDrivers,
            suspendedDrivers,
            onlineDrivers,
            totalVehicles,
            pendingVehicles,
            approvedVehicles,
            totalBookings,
            completedBookings,
            revenueStats
        ] = await Promise.all([
            User.countDocuments({ role: "user" }),
            User.countDocuments({ role: { $in: ["partner", "driver"] } }),
            User.countDocuments({ role: { $in: ["partner", "driver"] }, partnerStatus: "pending" }),
            User.countDocuments({ role: { $in: ["partner", "driver"] }, partnerStatus: "approved", status: { $ne: "SUSPENDED" } }),
            User.countDocuments({ $or: [{ status: "SUSPENDED" }, { partnerStatus: "suspended" }] }),
            User.countDocuments({ role: { $in: ["partner", "driver"] }, isOnline: true }),
            Vehicle.countDocuments(),
            Vehicle.countDocuments({ status: "pending" }),
            Vehicle.countDocuments({ status: "approved" }),
            Booking.countDocuments(),
            Booking.countDocuments({ bookingStatus: "completed" }),
            Booking.aggregate([
                { $match: { bookingStatus: "completed" } },
                {
                    $group: {
                        _id: null,
                        totalFare: { $sum: "$fare" },
                        totalCommission: { $sum: "$adminCommission" },
                        totalPartnerEarnings: { $sum: "$partnerAmount" }
                    }
                }
            ])
        ]);

        const financial = revenueStats[0] || { totalFare: 0, totalCommission: 0, totalPartnerEarnings: 0 };

        return NextResponse.json({
            success: true,
            stats: {
                totalUsers,
                totalDrivers,
                pendingDrivers,
                approvedDrivers,
                suspendedDrivers,
                onlineDrivers,
                totalVehicles,
                pendingVehicles,
                approvedVehicles,
                totalBookings,
                completedBookings,
                totalFare: financial.totalFare,
                totalCommission: financial.totalCommission,
                totalPartnerEarnings: financial.totalPartnerEarnings,
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/admin/stats error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch platform statistics" },
            { status: 500 }
        );
    }
}

