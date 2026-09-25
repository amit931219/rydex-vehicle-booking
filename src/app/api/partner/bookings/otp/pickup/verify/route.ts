import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { bookingId, otp } = await req.json()
        const booking = await Booking.findById(bookingId).populate("user vehicle driver")
        if (!booking) {
            return NextResponse.json(
                { message: "booking not found" },
                { status: 400 }
            )
        }

        if (!booking.pickUpOtp) {
            return NextResponse.json(
                { message: "pickup otp not generated" },
                { status: 400 }
            )
        }
        if (booking.pickUpOtp != otp) {
            return NextResponse.json(
                { message: "incorrect pickup otp" },
                { status: 400 }
            )
        }
        if (booking.pickUpOtpExpires && booking.pickUpOtpExpires < new Date()) {
            return NextResponse.json(
                { message: "otp expired" },
                { status: 400 }
            )
        }

        const dropOtp = Math.floor(1000 + Math.random() * 9000).toString()
        booking.bookingStatus = "started"
        booking.pickUpOtp = ""
        booking.pickUpOtpExpires = undefined
        booking.dropOtp = dropOtp
        booking.dropOtpExpires = new Date(Date.now() + 2 * 60 * 60 * 1000)
        await booking.save()

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "ride-started",
                userId: booking.user?._id || booking.user,
                bookingId: booking._id.toString(),
                data: {
                    bookingId: booking._id,
                    status: "started",
                    dropOtp,
                    booking
                }
            })
        } catch (socketErr: any) {
            console.error("Socket emit ride-started error:", socketErr?.message || socketErr)
        }

        return NextResponse.json(
            { message: "pickUp otp verified", success: true, dropOtp, booking },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            { message: "pick up otp verify error" },
            { status: 500 }
        )
    }
}
