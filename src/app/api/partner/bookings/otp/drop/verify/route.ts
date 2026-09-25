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

        if (!booking.dropOtp) {
            return NextResponse.json(
                { message: "drop otp not generated" },
                { status: 400 }
            )
        }
        if (booking.dropOtp != otp) {
            return NextResponse.json(
                { message: "incorrect drop otp" },
                { status: 400 }
            )
        }
        if (booking.dropOtpExpires && booking.dropOtpExpires < new Date()) {
            return NextResponse.json(
                { message: "otp expired" },
                { status: 400 }
            )
        }

        if (booking.paymentStatus === "cash") {
            const adminCommission = booking.fare * 0.10
            const partnerAmount = booking.fare - adminCommission
            booking.adminCommission = adminCommission
            booking.partnerAmount = partnerAmount
        }
        booking.paymentStatus = "paid"
        booking.bookingStatus = "completed"
        booking.dropOtp = ""
        booking.dropOtpExpires = undefined
        await booking.save()

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "ride-completed",
                userId: booking.user?._id || booking.user,
                bookingId: booking._id.toString(),
                data: {
                    bookingId: booking._id,
                    status: "completed",
                    booking
                }
            })
        } catch (socketErr: any) {
            console.error("Socket emit ride-completed error:", socketErr?.message || socketErr)
        }

        return NextResponse.json(
            { message: "drop otp verified", success: true, booking },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            { message: "drop otp verify error" },
            { status: 500 }
        )
    }
}
