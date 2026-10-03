import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.id && !session?.user?.email) {
            return NextResponse.json(
                { message: "unauthorize" },
                { status: 400 }
            );
        }

        const {
            driverId,
            vehicleId,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare,
            mobileNumber,
            paymentMethod,
        } = await req.json();

        if (!driverId || !vehicleId || !pickUpLocation?.coordinates || !dropLocation?.coordinates) {
            return NextResponse.json(
                { message: "missing required details" },
                { status: 400 }
            );
        }
        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json(
                { message: "user not found" },
                { status: 400 }
            );
        }

        let driver = await User.findById(driverId);
        if (!driver) {
            driver = await User.findOne({ 
                role: { $in: ["partner", "driver"] }, 
                partnerStatus: "approved", 
                status: { $ne: "SUSPENDED" },
                isOnline: true 
            });
        }
        if (!driver || driver.partnerStatus !== "approved" || driver.status === "SUSPENDED") {
            return NextResponse.json(
                { message: "Selected driver is not approved or currently suspended." },
                { status: 400 }
            );
        }

        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle || vehicle.status !== "approved" || !vehicle.isActive) {
            return NextResponse.json(
                { message: "Selected vehicle is not approved or currently inactive." },
                { status: 400 }
            );
        }

        const staleThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // Auto-cancel any stale uncompleted bookings older than 2 hours so user is never locked out
        await Booking.updateMany(
            {
                user: user._id,
                bookingStatus: { $in: ["requested", "awaiting_payment", "confirmed", "started"] },
                createdAt: { $lt: staleThreshold }
            },
            { bookingStatus: "cancelled" }
        );

        // Cancel any pending requested/awaiting_payment bookings
        await Booking.updateMany(
            {
                user: user._id,
                bookingStatus: { $in: ["requested", "awaiting_payment"] }
            },
            { bookingStatus: "cancelled" }
        );

        const existing = await Booking.findOne({
            user: user._id,
            bookingStatus: {
                $in: ["confirmed", "started"]
            },
            createdAt: { $gte: staleThreshold }
        });

        if (existing) {
            return NextResponse.json(
                { message: "You already have an active ride in progress", booking: existing },
                { status: 409 }
            );
        }

        const booking = await Booking.create({
            user: user._id,
            driver: driver._id,
            vehicle: vehicleId,
            pickUpAddress,
            dropAddress,
            pickUpLocation,
            dropLocation,
            fare,
            userMobileNumber: mobileNumber || "9999999999",
            driverMobileNumber: driver.mobileNumber || "9988776655",
            bookingStatus: "requested",
            paymentStatus: paymentMethod === "online" ? "pending" : "cash"
        });

        try {
            await axios.post(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/emit`, {
                event: "new-booking",
                userId: driver._id.toString(),
                data: booking
            }, { 
                timeout: 3000,
                headers: {
                    "x-internal-secret": process.env.INTERNAL_SOCKET_SECRET || "rydex_internal_secret_2026"
                }
            });
        } catch (socketErr: any) {
            console.error("Socket emit new-booking non-fatal error:", socketErr?.message || socketErr);
        }

        return NextResponse.json(
            booking, { status: 200 }
        );

    } catch (error: any) {
        return NextResponse.json(
            { message: `create booking error ${error?.message || error}` },
            { status: 500 }
        );
    }
}
