import connectDb from "@/lib/db";
import { sendMail } from "@/lib/sendMail";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { message: "Email and password are required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { message: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const cleanEmail = String(email).toLowerCase().trim();
        const cleanName = (name || "Rider").trim();

        await connectDb();
        let user = await User.findOne({ email: cleanEmail });

        if (user && user.isEmailVerified) {
            return NextResponse.json(
                { message: "Email already exists! Please log in." },
                { status: 400 }
            );
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const hashedPassword = await bcrypt.hash(password, 10);

        if (user && !user.isEmailVerified) {
            user.name = cleanName;
            user.password = hashedPassword;
            user.email = cleanEmail;
            user.otp = otp;
            user.otpExpiresAt = otpExpiresAt;
            user.role = "user";
            await user.save();
        } else {
            user = await User.create({
                name: cleanName,
                email: cleanEmail,
                password: hashedPassword,
                otp,
                otpExpiresAt,
                role: "user",
                isEmailVerified: false,
            });
        }

        try {
            await sendMail(
                cleanEmail,
                "Your RYDEX Verification Code",
                `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>RYDEX Verification Code</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 24px; margin: 0;">
                    <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0 0 8px 0; letter-spacing: 2px;">RYDEX</h1>
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Premium Vehicle Booking</p>
                        <h2 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0;">Verify your email address</h2>
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
                            Hello ${cleanName}, thank you for signing up with RYDEX. Please use the following 6-digit verification code to complete your registration:
                        </p>
                        <div style="background-color: #f3f4f6; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px;">
                            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #111827; font-family: monospace;">${otp}</span>
                        </div>
                        <p style="color: #9ca3af; font-size: 12px; line-height: 1.4; margin: 0 0 8px 0;">
                            This code is valid for 15 minutes. If you did not request this, please ignore this email.
                        </p>
                        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
                            (Tip: If this email was in your spam or junk folder, please mark it as "Not Spam" to receive ride updates).
                        </p>
                    </div>
                </body>
                </html>`
            );
        } catch (mailError: any) {
            console.error("Failed to send verification email:", mailError?.message || mailError);
            return NextResponse.json(
                { message: `Failed to send verification email: ${mailError?.message || "Email server error"}` },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Verification code sent to your email!", email: user.email },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Register error:", error);
        return NextResponse.json(
            { message: `Register error: ${error?.message || error}` },
            { status: 500 }
        );
    }
}
