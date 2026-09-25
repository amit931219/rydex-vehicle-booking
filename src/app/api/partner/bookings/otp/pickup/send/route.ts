import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import Booking from "@/models/booking.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb()
        const { bookingId } = await req.json()
        const booking = await Booking.findById(bookingId).populate("user")
        if (!booking) {
            return NextResponse.json(
                { message: "booking not found" },
                { status: 400 }
            )
        }

        const otp = booking.pickUpOtp || Math.floor(1000 + Math.random() * 9000).toString()
        booking.pickUpOtp = otp
        booking.pickUpOtpExpires = new Date(Date.now() + 2 * 60 * 60 * 1000)
        await booking.save()

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "otp-updated",
                userId: booking.user?._id,
                bookingId: booking._id.toString(),
                data: {
                    bookingId: booking._id,
                    pickUpOtp: otp
                }
            })
        } catch (socketErr: any) {
            console.error("Socket emit otp-updated error:", socketErr?.message || socketErr)
        }

        if (booking.user?.email) {
            sendMail(booking.user.email, "Your Pickup OTP - RYDEX", 
                `
        <div style="font-family:sans-serif;padding:20px">
          <h2>Ride OTP</h2>
          <p>Your pickup OTP is:</p>
          <h1 style="letter-spacing:6px">${otp}</h1>
          <p>Share this OTP with your driver to start the ride.</p>
          <br/>
          <b>RYDEX</b>
        </div>
        `).catch(e => console.error("Email send non-fatal error:", e.message))
        }

        return NextResponse.json(
            { message: "pick up otp sent", otp },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            { message: "pick up otp error" },
            { status: 500 }
        )
    }
}
