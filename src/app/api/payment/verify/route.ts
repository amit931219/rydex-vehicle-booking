import connectDb from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Booking from "@/models/booking.model";
import axios from "axios";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { bookingId, razorpay_payment_id, razorpay_signature, razorpay_order_id } = await req.json()
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ success: false, message: "invalid signature" })
        }
        const booking = await Booking.findById(bookingId).populate("user vehicle driver")
        if (!booking) {
            return NextResponse.json(
                { success: false, message: "booking is not found." },
                { status: 404 }
            )
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        const adminCommission = booking.fare * 0.10
        const partnerAmount = booking.fare - adminCommission
        booking.adminCommission = adminCommission
        booking.partnerAmount = partnerAmount
        booking.paymentStatus = "paid"
        booking.bookingStatus = "confirmed"
        booking.pickUpOtp = otp
        booking.pickUpOtpExpires = new Date(Date.now() + 2 * 60 * 60 * 1000)
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
            { success: true, adminCommission, partnerAmount, pickUpOtp: otp },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            { success: false, message: `verify payment error ${error}` },
            { status: 500 }
        )
    }
}
