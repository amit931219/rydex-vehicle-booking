import { requireAuth } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import DriverProfile from "@/models/driverProfile.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAuth();
        if (authResult.errorResponse) return authResult.errorResponse;

        const { user } = authResult.authContext;
        await connectDb();

        const driverProfile = await DriverProfile.findOne({ user: user._id });
        const vehicle = await Vehicle.findOne({ owner: user._id });

        return NextResponse.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                mobileNumber: user.mobileNumber,
                role: user.role,
                status: user.status || "ACTIVE",
                partnerStatus: user.partnerStatus,
                rejectionReason: user.rejectionReason,
                suspendedReason: user.suspendedReason,
            },
            driverProfile: driverProfile || null,
            vehicle: vehicle || null,
        }, { status: 200 });
    } catch (error: any) {
        console.error("GET /api/driver/apply error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch driver application data" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth();
        if (authResult.errorResponse) return authResult.errorResponse;

        const { user } = authResult.authContext;
        await connectDb();

        const body = await req.json().catch(() => ({}));
        const {
            name,
            mobileNumber,
            licenseNumber,
            licenseDocument,
            experienceYears,
            vehicleType,
            vehicleModel,
            vehicleNumber,
            rcDocument,
            insuranceDocument,
        } = body;

        // Validation
        if (!mobileNumber || String(mobileNumber).trim().length < 10) {
            return NextResponse.json(
                { success: false, message: "A valid 10-digit mobile number is required." },
                { status: 400 }
            );
        }

        if (!licenseNumber || String(licenseNumber).trim().length < 5) {
            return NextResponse.json(
                { success: false, message: "Valid driving license number is required." },
                { status: 400 }
            );
        }

        if (!vehicleType || !["bike", "car", "loading", "truck", "auto"].includes(vehicleType)) {
            return NextResponse.json(
                { success: false, message: "Valid vehicle type (bike, car, auto, loading, truck) is required." },
                { status: 400 }
            );
        }

        if (!vehicleModel || String(vehicleModel).trim().length < 2) {
            return NextResponse.json(
                { success: false, message: "Vehicle model is required (e.g. Maruti Swift, Honda Activa)." },
                { status: 400 }
            );
        }

        if (!vehicleNumber || String(vehicleNumber).trim().length < 4) {
            return NextResponse.json(
                { success: false, message: "Vehicle registration plate number is required." },
                { status: 400 }
            );
        }

        // Set safe defaults for fare based on vehicle type
        const defaultFares: Record<string, { baseFare: number; pricePerKM: number; waitingCharge: number }> = {
            bike: { baseFare: 25, pricePerKM: 8, waitingCharge: 1 },
            auto: { baseFare: 35, pricePerKM: 10, waitingCharge: 1.5 },
            car: { baseFare: 60, pricePerKM: 14, waitingCharge: 2 },
            loading: { baseFare: 120, pricePerKM: 18, waitingCharge: 3 },
            truck: { baseFare: 250, pricePerKM: 28, waitingCharge: 5 },
        };

        const fareConfig = defaultFares[vehicleType] || { baseFare: 50, pricePerKM: 12, waitingCharge: 2 };

        // 1. Update User document with PENDING driver status
        const dbUser = await User.findById(user._id);
        if (!dbUser) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        if (name && String(name).trim()) {
            dbUser.name = String(name).trim();
        }
        dbUser.mobileNumber = String(mobileNumber).trim();
        // Never allow switching to ADMIN. Set driver/partner role with pending status
        dbUser.role = "partner";
        dbUser.partnerStatus = "pending";
        dbUser.rejectionReason = undefined;
        dbUser.partnerOnBoardingSteps = 4;
        dbUser.isOnline = false;
        await dbUser.save();

        // 2. Create or Update DriverProfile
        const profileData = {
            user: dbUser._id,
            approvalStatus: "PENDING" as const,
            status: "ACTIVE" as const,
            isOnline: false,
            isAvailable: true,
            licenseNumber: String(licenseNumber).trim().toUpperCase(),
            licenseDocument: licenseDocument || undefined,
            experienceYears: Number(experienceYears) || 0,
            rejectionReason: undefined,
            approvedBy: undefined,
            approvedAt: undefined,
        };

        const driverProfile = await DriverProfile.findOneAndUpdate(
            { user: dbUser._id },
            { $set: profileData },
            { upsert: true, new: true }
        );

        // 3. Create or Update Vehicle document
        const cleanNumber = String(vehicleNumber).trim().toUpperCase();

        // Check if vehicle number belongs to another user
        const existingVehicle = await Vehicle.findOne({ number: cleanNumber });
        if (existingVehicle && existingVehicle.owner.toString() !== dbUser._id.toString()) {
            return NextResponse.json(
                { success: false, message: "A vehicle with this registration number is already registered by another driver." },
                { status: 409 }
            );
        }

        const vehicleData = {
            owner: dbUser._id,
            type: vehicleType,
            vehicleModel: String(vehicleModel).trim(),
            number: cleanNumber,
            status: "pending" as const,
            approvalStatus: "PENDING" as const,
            rcNumber: cleanNumber,
            rcDocument: rcDocument || undefined,
            insuranceDocument: insuranceDocument || undefined,
            baseFare: fareConfig.baseFare,
            pricePerKM: fareConfig.pricePerKM,
            waitingCharge: fareConfig.waitingCharge,
            rejectionReason: undefined,
            isActive: false, // Inactive until admin approves
            approvedBy: undefined,
            approvedAt: undefined,
        };

        const vehicle = await Vehicle.findOneAndUpdate(
            { owner: dbUser._id },
            { $set: vehicleData },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            message: "Driver application and vehicle submitted successfully. Your application is now PENDING admin review.",
            driverProfile,
            vehicle,
        }, { status: 201 });

    } catch (error: any) {
        console.error("POST /api/driver/apply error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to submit driver application" },
            { status: 500 }
        );
    }
}

