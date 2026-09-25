import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await context.params).id;
        await connectDb();
        const booking = await Booking.findById(id);

        if (!booking || booking.bookingStatus !== "requested") {
            return NextResponse.json(
                { message: "Booking not found or not in requested state" },
                { status: 400 }
            );
        }

        // Assign current partner as driver
        const session = await auth();
        if (session?.user?.email) {
            const partner = await User.findOne({ email: session.user.email });
            if (partner) {
                booking.driver = partner._id;
                booking.driverMobileNumber = partner.mobileNumber || booking.driverMobileNumber || "9988776655";
            }
        }

        // Generate 4-digit Pickup OTP immediately when accepted
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        booking.pickUpOtp = otp;
        booking.pickUpOtpExpires = new Date(Date.now() + 2 * 60 * 60 * 1000);
        booking.bookingStatus = "confirmed";
        if (!booking.paymentStatus || booking.paymentStatus === "pending") {
            booking.paymentStatus = "cash";
        }
        await booking.save();
        await booking.populate("user vehicle driver");

        // Non-blocking socket notifications
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "accept-booking",
                userId: booking.user?._id?.toString() || booking.user?.toString(),
                data: "confirmed"
            }, { timeout: 3000 });
        } catch (socketErr: any) {
            console.error("Socket emit accept-booking error:", socketErr?.message || socketErr);
        }

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "ride-confirmed",
                userId: booking.user?._id?.toString() || booking.user?.toString(),
                bookingId: booking._id.toString(),
                data: {
                    bookingId: booking._id,
                    status: "confirmed",
                    pickUpOtp: otp,
                    booking
                }
            }, { timeout: 3000 });
        } catch (socketErr: any) {
            console.error("Socket emit ride-confirmed error:", socketErr?.message || socketErr);
        }

        // Email user with pickup OTP
        if (booking.user?.email) {
            sendMail(
                booking.user.email,
                "Ride Confirmed - Driver On The Way! - RYDEX",
                `<div style="font-family:sans-serif;padding:20px">
                    <h2>Driver Assigned!</h2>
                    <p>Your driver is on the way to pick you up.</p>
                    <p>Your Pickup PIN / OTP is:</p>
                    <h1 style="letter-spacing:6px;color:#000;">${otp}</h1>
                    <p>Share this PIN with your driver when they arrive to start the ride.</p>
                    <br/>
                    <b>RYDEX Fleet</b>
                </div>`
            ).catch(e => console.error("Email send non-fatal error:", e?.message));
        }

        return NextResponse.json(
            { success: true, booking, pickUpOtp: otp },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { message: `accept booking error ${error?.message || error}` },
            { status: 500 }
        );
    }
}
