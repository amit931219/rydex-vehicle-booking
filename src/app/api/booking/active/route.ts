import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        await connectDb()
        const session = await auth()
        if (!session?.user?.email && !session?.user?.id) {
            return NextResponse.json({ booking: null })
        }

        const user = await User.findOne({
            $or: [
                ...(session.user.email ? [{ email: session.user.email }] : []),
                ...(session.user.id ? [{ _id: session.user.id }] : [])
            ]
        })

        if (!user) {
            return NextResponse.json({ booking: "idle" })
        }

        const booking = await Booking.findOne({
            user: user._id,
            bookingStatus: { $in: ["requested", "awaiting_payment", "confirmed", "started"] }
        }).populate("user vehicle driver").sort({ createdAt: -1 })

        if (!booking) {
            return NextResponse.json({ booking: "idle" })
        }

        return NextResponse.json({ booking }, { status: 200 })

    } catch (error: any) {
        return NextResponse.json(
            { message: `get active booking error ${error?.message || error}` },
            { status: 500 }
        )
    }
}
