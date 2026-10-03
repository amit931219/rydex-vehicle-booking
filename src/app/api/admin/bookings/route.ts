import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        await connectDb();

        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get("status");

        const query: any = {};
        if (status && status !== "all") {
            query.bookingStatus = status;
        }

        const bookings = await Booking.find(query)
            .populate("user", "name email mobileNumber")
            .populate("driver", "name email mobileNumber partnerStatus")
            .populate("vehicle", "type vehicleModel number")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return NextResponse.json({
            success: true,
            total: bookings.length,
            bookings,
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/admin/bookings error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch bookings" },
            { status: 500 }
        );
    }
}

