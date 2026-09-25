import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDb();
        const { id } = await context.params;
        
        if (!id) {
            return NextResponse.json({ message: "Booking ID is required" }, { status: 400 });
        }

        const booking = await Booking.findById(id).populate("user vehicle driver");

        if (!booking) {
            return NextResponse.json({ message: "Booking not found" }, { status: 404 });
        }

        return NextResponse.json({ booking }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json(
            { message: `Error fetching booking: ${error?.message || error}` },
            { status: 500 }
        );
    }
}
