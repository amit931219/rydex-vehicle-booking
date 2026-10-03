import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session || (!session.user?.email && !session.user?.id)) {
            return NextResponse.json({ message: "unauthorized" }, { status: 400 })
        }

        const partner = await User.findOne({
            $or: [
                ...(session.user.email ? [{ email: session.user.email }] : []),
                ...(session.user.id ? [{ _id: session.user.id }] : [])
            ]
        })
        if (!partner) {
            return NextResponse.json({ message: "partner not found" }, { status: 400 })
        } 

        let bookings = await Booking.find({
            driver: partner._id,
            bookingStatus: "requested"
        }).populate("user vehicle driver").sort({ createdAt: -1 })

        if (bookings.length === 0) {
            bookings = await Booking.find({
                bookingStatus: "requested"
            }).populate("user vehicle driver").sort({ createdAt: -1 })
        }

        return NextResponse.json(bookings, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ message: `fetch pending req error ${error?.message || error}` }, { status: 500 })
    }
}