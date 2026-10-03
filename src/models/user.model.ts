import mongoose, { Document } from "mongoose";

type VideoKycStatus =
   "not_required"
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: "user" | "partner" | "driver" | "admin";
    status?: "ACTIVE" | "SUSPENDED";
    isEmailVerified?: boolean;
    otp?: string;
    otpExpiresAt?: Date;
    partnerOnBoardingSteps: number;
    mobileNumber?: string;
    partnerStatus: "pending" | "approved" | "rejected" | "suspended";
    rejectionReason?: string;
    suspendedReason?: string;
    videoKycStatus: VideoKycStatus;
    videoKycRoomId?: string;
    videoKycRejectionReason?: string;
    socketId: string | null;
    location?: {
        type: "Point";
        coordinates: [number, number];
    };
    isOnline: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const pointSchema = new mongoose.Schema({
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number] }
}, { _id: false });

const userSchema = new mongoose.Schema<IUser>({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "partner", "driver", "admin"]
    },
    status: {
        type: String,
        default: "ACTIVE",
        enum: ["ACTIVE", "SUSPENDED"]
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    partnerOnBoardingSteps: {
        type: Number,
        min: 0,
        max: 8,
        default: 0
    },
    mobileNumber: {
        type: String
    },
    partnerStatus: {
        type: String,
        enum: ["pending", "approved", "rejected", "suspended"],
        default: "pending"
    },
    rejectionReason: {
        type: String
    },
    suspendedReason: {
        type: String
    },
    videoKycStatus: {
        type: String,
        enum: ["not_required", "pending", "in_progress", "approved", "rejected"],
        default: "not_required"
    },
    videoKycRoomId: {
        type: String
    },
    videoKycRejectionReason: {
        type: String
    },
    otp: {
        type: String
    },
    otpExpiresAt: {
        type: Date
    },
    socketId: {
        type: String,
        default: null
    },
    location: {
        type: pointSchema,
        default: undefined
    },
    isOnline: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

userSchema.index({ location: "2dsphere" }, { sparse: true });

const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export default User;