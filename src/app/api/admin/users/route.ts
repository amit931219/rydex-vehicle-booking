import { requireAdmin } from "@/lib/auth-guards";
import connectDb from "@/lib/db";
import User from "@/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireAdmin();
        if (authResult.errorResponse) return authResult.errorResponse;

        await connectDb();

        const searchParams = req.nextUrl.searchParams;
        const role = searchParams.get("role");

        const query: any = {};
        if (role && role !== "all") {
            query.role = role;
        }

        const users = await User.find(query)
            .select("-password -otp -otpExpiresAt")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            total: users.length,
            users,
        }, { status: 200 });

    } catch (error: any) {
        console.error("GET /api/admin/users error:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch users" },
            { status: 500 }
        );
    }
}

