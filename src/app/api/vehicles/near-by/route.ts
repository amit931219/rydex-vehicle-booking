import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDb();
        const body = await req.json().catch(() => ({}));
        const { latitude, longitude, vehicleType } = body;

        // 1. Find all drivers currently busy with an active trip to exclude them
        const busyBookings = await Booking.find({
            bookingStatus: { $in: ["confirmed", "started"] }
        }).select("driver").lean();
        const busyDriverIds = busyBookings.map((b) => String(b.driver));

        // Base criteria: Driver must be APPROVED, ACTIVE (not suspended), and ONLINE
        const baseDriverCriteria: any = {
            role: { $in: ["partner", "driver"] },
            partnerStatus: "approved",
            status: { $ne: "SUSPENDED" },
            isOnline: true,
            _id: { $nin: busyDriverIds }
        };

        let partners: any[] = [];
        const hasCoords = typeof latitude === "number" && typeof longitude === "number" && 
                          !isNaN(latitude) && !isNaN(longitude) && (latitude !== 0 || longitude !== 0);

        if (hasCoords) {
            // A. Search within 25km radius first
            try {
                partners = await User.find({
                    ...baseDriverCriteria,
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [longitude, latitude]
                            },
                            $maxDistance: 25000
                        }
                    }
                }).lean();
            } catch (geoErr) {
                console.error("Geo near query error (25km):", geoErr);
            }

            // B. If no drivers within 25km, expand to 100km
            if (!partners || partners.length === 0) {
                try {
                    partners = await User.find({
                        ...baseDriverCriteria,
                        location: {
                            $near: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: [longitude, latitude]
                                },
                                $maxDistance: 100000
                            }
                        }
                    }).lean();
                } catch (e) {
                    console.error("Geo near query error (100km):", e);
                }
            }
        }

        // C. If still none found, match any online approved driver who isn't busy
        if (!partners || partners.length === 0) {
            partners = await User.find(baseDriverCriteria).lean();
        }

        const eligiblePartnerIds = partners.map((p) => p._id);

        // 2. Query vehicles belonging to eligible drivers
        // Must be APPROVED and marked ACTIVE
        const vehicleFilter: any = {
            status: "approved",
            isActive: true,
            approvalStatus: { $ne: "SUSPENDED" },
            owner: { $in: eligiblePartnerIds }
        };

        if (vehicleType && vehicleType !== "all" && String(vehicleType).trim() !== "") {
            vehicleFilter.type = vehicleType;
        }

        let vehicles = eligiblePartnerIds.length > 0 ? await Vehicle.find(vehicleFilter).lean() : [];

        // 3. Fallback fleet for demo / testing if no online vehicles match
        if (vehicles.length === 0) {
            let defaultDriver = await User.findOne({ 
                role: { $in: ["partner", "driver"] }, 
                partnerStatus: "approved",
                status: { $ne: "SUSPENDED" }
            });
            if (!defaultDriver) {
                defaultDriver = await User.findOne({ email: "driver@rydex.com" });
            }

            if (defaultDriver) {
                const defaultFleet = [
                    { type: "bike", vehicleModel: "Honda Activa 6G (Fast & Quick)", number: "DL-01-CD-5678", baseFare: 25, pricePerKM: 8, waitingCharge: 1 },
                    { type: "auto", vehicleModel: "Bajaj Compact Auto (Everyday)", number: "DL-01-EF-9012", baseFare: 35, pricePerKM: 10, waitingCharge: 1.5 },
                    { type: "car", vehicleModel: "Maruti Dzire White (Comfort)", number: "DL-01-AB-1234", baseFare: 60, pricePerKM: 14, waitingCharge: 2 },
                    { type: "loading", vehicleModel: "Tata Ace Helper (Cargo)", number: "DL-01-GH-3456", baseFare: 120, pricePerKM: 18, waitingCharge: 3 },
                    { type: "truck", vehicleModel: "Eicher Pro 2049 (Heavy)", number: "DL-01-IJ-7890", baseFare: 250, pricePerKM: 28, waitingCharge: 5 }
                ];

                for (const item of defaultFleet) {
                    if (!vehicleType || vehicleType === "all" || vehicleType === item.type) {
                        let existing = await Vehicle.findOne({ number: item.number });
                        if (!existing) {
                            existing = await Vehicle.create({
                                ...item,
                                owner: defaultDriver._id,
                                status: "approved",
                                approvalStatus: "APPROVED",
                                isActive: true
                            });
                        }
                        vehicles.push(JSON.parse(JSON.stringify(existing)));
                    }
                }
            }
        }

        return NextResponse.json(vehicles, { status: 200 });

    } catch (error: any) {
        console.error("near by vehicles error:", error);
        return NextResponse.json(
            { success: false, message: `near by vehicles error: ${error?.message || error}` },
            { status: 500 }
        );
    }
}
