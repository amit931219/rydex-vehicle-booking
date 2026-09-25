import { auth } from "@/auth"
import connectDb from "@/lib/db"
import Booking from "@/models/booking.model"
import User from "@/models/user.model"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        await connectDb()
        const session = await auth()
        if (!session || (!session.user?.email && !session.user?.id)) {
            return NextResponse.json({ message: "unauthorized" }, { status: 400 })
        }

        const user = await User.findOne({
            $or: [
                ...(session.user.email ? [{ email: session.user.email }] : []),
                ...(session.user.id ? [{ _id: session.user.id }] : [])
            ]
        })

        if (!user) {
            return NextResponse.json({ message: "user not found" }, { status: 404 })
        }

        const booking = await Booking.findOne({
            driver: user._id,
            bookingStatus: { $in: ["awaiting_payment", "confirmed", "started"] }
        }).populate("user vehicle driver").sort({ createdAt: -1 })

        return NextResponse.json(booking, { status: 200 })
    } catch (error: any) {
        return NextResponse.json(
            { message: `get active ride for partner error ${error?.message || error}` },
            { status: 500 }
        )
    }
}
