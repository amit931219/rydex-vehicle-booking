import mongoose, { Document } from "mongoose";

export type DriverApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type DriverStatus = "ACTIVE" | "SUSPENDED";

export interface IDriverProfile extends Document {
    user: mongoose.Types.ObjectId;
    approvalStatus: DriverApprovalStatus;
    status: DriverStatus;
    isOnline: boolean;
    isAvailable: boolean;
    licenseNumber?: string;
    licenseDocument?: string;
    experienceYears?: number;
    rejectionReason?: string;
    suspendedReason?: string;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const driverProfileSchema = new mongoose.Schema<IDriverProfile>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
    },
    approvalStatus: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
        default: "PENDING",
        index: true
    },
    status: {
        type: String,
        enum: ["ACTIVE", "SUSPENDED"],
        default: "ACTIVE",
        index: true
    },
    isOnline: {
        type: Boolean,
        default: false,
        index: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    licenseNumber: {
        type: String,
        trim: true
    },
    licenseDocument: {
        type: String
    },
    experienceYears: {
        type: Number,
        default: 0
    },
    rejectionReason: {
        type: String
    },
    suspendedReason: {
        type: String
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    approvedAt: {
        type: Date
    }
}, { timestamps: true });

const DriverProfile = mongoose.models.DriverProfile || mongoose.model<IDriverProfile>("DriverProfile", driverProfileSchema);
export default DriverProfile;

