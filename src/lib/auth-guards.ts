import { auth } from "@/auth";
import connectDb from "@/lib/db";
import User, { IUser } from "@/models/user.model";
import DriverProfile, { IDriverProfile } from "@/models/driverProfile.model";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export interface AuthContext {
    session: any;
    user: IUser;
}

/**
 * Normalizes role comparison so that 'driver' and 'partner' are treated interchangeably.
 */
export function isRoleMatch(userRole?: string, allowedRoles: string[] = []): boolean {
    if (!userRole) return false;
    const lowerRole = userRole.toLowerCase();
    return allowedRoles.some((role) => {
        const lowerAllowed = role.toLowerCase();
        if ((lowerAllowed === "driver" || lowerAllowed === "partner") && 
            (lowerRole === "driver" || lowerRole === "partner")) {
            return true;
        }
        return lowerAllowed === lowerRole;
    });
}

/**
 * Retrieves the current authenticated user and the corresponding database document.
 */
export async function getAuthUser(): Promise<AuthContext | null> {
    try {
        const session = await auth();
        if (!session?.user) return null;

        await connectDb();

        let user: IUser | null = null;
        if (session.user.id) {
            user = await User.findById(session.user.id);
        }
        if (!user && session.user.email) {
            user = await User.findOne({ email: session.user.email.toLowerCase().trim() });
        }

        if (!user) return null;
        return { session, user };
    } catch (err) {
        console.error("getAuthUser error:", err);
        return null;
    }
}

/**
 * Requires the request to have an authenticated user.
 * Returns either `{ authContext }` or `{ errorResponse }`.
 */
export async function requireAuth(): Promise<
    { authContext: AuthContext; errorResponse?: never } | { authContext?: never; errorResponse: NextResponse }
> {
    const authContext = await getAuthUser();
    if (!authContext) {
        return {
            errorResponse: NextResponse.json(
                { success: false, message: "Unauthorized. Please log in to proceed." },
                { status: 401 }
            ),
        };
    }
    return { authContext };
}

/**
 * Requires the authenticated user to have one of the specified roles.
 */
export async function requireRole(allowedRoles: ("user" | "driver" | "partner" | "admin")[]): Promise<
    { authContext: AuthContext; errorResponse?: never } | { authContext?: never; errorResponse: NextResponse }
> {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult;

    const { authContext } = authResult;
    if (!isRoleMatch(authContext.user.role, allowedRoles)) {
        return {
            errorResponse: NextResponse.json(
                { success: false, message: "Forbidden: You do not have permission to access this resource." },
                { status: 403 }
            ),
        };
    }

    return { authContext };
}

/**
 * Requires the user to have ADMIN role.
 */
export async function requireAdmin(): Promise<
    { authContext: AuthContext; errorResponse?: never } | { authContext?: never; errorResponse: NextResponse }
> {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult;

    const { authContext } = authResult;
    if (authContext.user.role?.toLowerCase() !== "admin") {
        return {
            errorResponse: NextResponse.json(
                { success: false, message: "Forbidden: Admin privileges required." },
                { status: 403 }
            ),
        };
    }

    return { authContext };
}

/**
 * Requires the user to be an APPROVED and ACTIVE driver/partner.
 * Also verifies driver is not suspended.
 */
export async function requireActiveApprovedDriver(): Promise<
    | { authContext: AuthContext; driverProfile?: IDriverProfile; errorResponse?: never }
    | { authContext?: never; driverProfile?: never; errorResponse: NextResponse }
> {
    const authResult = await requireAuth();
    if (authResult.errorResponse) return authResult;

    const { authContext } = authResult;
    const { user } = authContext;

    // Verify role is driver or partner
    if (!isRoleMatch(user.role, ["driver", "partner"])) {
        return {
            errorResponse: NextResponse.json(
                { success: false, message: "Forbidden: Only registered drivers can access this endpoint." },
                { status: 403 }
            ),
        };
    }

    // Verify user account is not suspended
    if (user.status === "SUSPENDED") {
        return {
            errorResponse: NextResponse.json(
                { success: false, message: "Your driver account is suspended. Please contact platform support." },
                { status: 403 }
            ),
        };
    }

    // Verify partnerStatus is approved
    if (user.partnerStatus !== "approved") {
        return {
            errorResponse: NextResponse.json(
                { success: false, message: `Your driver account is ${user.partnerStatus || "pending"}. You cannot perform this action until approved.` },
                { status: 403 }
            ),
        };
    }

    const driverProfile = await DriverProfile.findOne({ user: user._id });
    if (driverProfile) {
        if (driverProfile.approvalStatus !== "APPROVED" || driverProfile.status === "SUSPENDED") {
            return {
                errorResponse: NextResponse.json(
                    { success: false, message: "Your driver profile is not currently active and approved." },
                    { status: 403 }
                ),
            };
        }
    }

    return { authContext, driverProfile: driverProfile || undefined };
}

/**
 * Validates resource ownership to prevent Insecure Direct Object Reference (IDOR).
 */
export function isResourceOwnerOrAdmin(
    resourceOwnerId: string | mongoose.Types.ObjectId,
    currentUserId: string | mongoose.Types.ObjectId,
    isAdmin: boolean
): boolean {
    if (isAdmin) return true;
    return resourceOwnerId.toString() === currentUserId.toString();
}

