import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await connectDb()
        const bookingId = (await context.params).id
        const booking = await Booking.findById(bookingId).populate("user vehicle driver")
        if (!booking) {
            return NextResponse.json(
                { success: false, message: "booking is not found." },
                { status: 404 }
            )
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        booking.pickUpOtp = otp
        booking.pickUpOtpExpires = new Date(Date.now() + 2 * 60 * 60 * 1000)
        booking.paymentStatus = "cash"
        booking.bookingStatus = "confirmed"
        await booking.save()

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "ride-confirmed",
                userId: booking.driver?._id || booking.driver,
                bookingId: booking._id.toString(),
                data: {
                    bookingId: booking._id,
                    status: "confirmed",
                    pickUpOtp: otp,
                    booking
                }
            })
        } catch (socketErr: any) {
            console.error("Socket emit ride-confirmed error:", socketErr?.message || socketErr)
        }

        return NextResponse.json(
            { success: true, pickUpOtp: otp, booking },
            { status: 200 }
        )

    } catch (error) {
        return NextResponse.json(
            { success: false, message: `cash confirm error ${error}` },
            { status: 500 }
        )
    }
}
