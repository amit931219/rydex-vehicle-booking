import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json(
                { message: "Email and OTP are required" },
                { status: 400 }
            );
        }

        const cleanEmail = String(email).toLowerCase().trim();
        const cleanOtp = String(otp).trim();

        let user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return NextResponse.json(
                { message: "User not found with this email" },
                { status: 400 }
            );
        }

        if (user.isEmailVerified) {
            return NextResponse.json(
                { message: "Email is already verified. Please login.", success: true },
                { status: 200 }
            );
        }

        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return NextResponse.json(
                { message: "OTP has expired. Please register again to get a new code." },
                { status: 400 }
            );
        }

        if (!user.otp || user.otp.trim() !== cleanOtp) {
            return NextResponse.json(
                { message: "Invalid OTP code. Please enter the 6-digit code sent to your email." },
                { status: 400 }
            );
        }

        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        if (!user.role) {
            user.role = "user";
        }
        await user.save();

        return NextResponse.json(
            { message: "Email verified successfully! You can now log in.", success: true },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Verify email error:", error);
        return NextResponse.json(
            { message: `Verification error: ${error?.message || error}` },
            { status: 500 }
        );
    }
}
