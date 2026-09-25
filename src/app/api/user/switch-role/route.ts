import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const cleanEmail = session.user.email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const body = await req.json().catch(() => ({}));
        const targetRole = body?.targetRole || (user.role === "partner" ? "user" : "partner");

        user.role = targetRole;

        if (targetRole === "partner") {
            user.partnerStatus = "approved";
            user.isOnline = true;
            user.partnerOnBoardingSteps = 4;
            if (!user.mobileNumber) user.mobileNumber = "9876543210";
            if (!user.location?.coordinates) {
                user.location = { type: "Point", coordinates: [77.2167, 28.6328] };
            }

            let vehicle = await Vehicle.findOne({ owner: user._id });
            if (!vehicle) {
                await Vehicle.create({
                    owner: user._id,
                    type: "car",
                    vehicleModel: "Maruti Suzuki Dzire (Partner Active)",
                    number: `DL-01-AB-${Math.floor(1000 + Math.random() * 9000)}`,
                    baseFare: 60,
                    pricePerKM: 14,
                    waitingCharge: 2,
                    status: "approved",
                    isActive: true,
                });
            } else {
                vehicle.status = "approved";
                vehicle.isActive = true;
                await vehicle.save();
            }
        }

        await user.save();

        return NextResponse.json({
            message: `Successfully switched to ${targetRole} mode`,
            role: user.role,
        }, { status: 200 });
    } catch (error: any) {
        console.error("switch-role error:", error);
        return NextResponse.json(
            { message: error?.message || "Failed to switch role" },
            { status: 500 }
        );
    }
}
