import mongoose, { Document } from "mongoose";

export type vehicleType =
    "bike" |
    "car"  |
    "loading"|
    "truck" |
    "auto";

export interface IVehicle extends Document {
    owner: mongoose.Types.ObjectId;
    type: vehicleType;
    vehicleModel: string;
    number: string;
    imageUrl?: string;
    baseFare?: number;
    pricePerKM?: number;
    waitingCharge?: number;
    status: "approved" | "pending" | "rejected" | "suspended";
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
    rcNumber?: string;
    rcDocument?: string;
    insuranceDocument?: string;
    rejectionReason?: string;
    suspendedReason?: string;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const vehicleSchema = new mongoose.Schema<IVehicle>({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ["bike", "car", "loading", "truck", "auto"],
        required: true
    },
    number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    vehicleModel: {
        type: String,
        required: true
    },
    imageUrl: String,
    baseFare: Number,
    pricePerKM: Number,
    waitingCharge: Number,
    status: {
        type: String,
        enum: ["approved", "rejected", "pending", "suspended"],
        default: "pending",
        index: true
    },
    approvalStatus: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
        default: "PENDING",
        index: true
    },
    rcNumber: String,
    rcDocument: String,
    insuranceDocument: String,
    rejectionReason: String,
    suspendedReason: String,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    approvedAt: Date,
    isActive: {
        type: Boolean,
        default: false,
        index: true
    },
}, { timestamps: true });

const Vehicle = mongoose.models.Vehicle || mongoose.model<IVehicle>("Vehicle", vehicleSchema);
export default Vehicle;
