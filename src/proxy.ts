import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"

const PUBLIC_ROUTES = ["/", "/user/book", "/user/search"]

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname)
    ) {
        return NextResponse.next()
    }

    if (PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.next()
    }

    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next()
    }

    // Vehicle search must be publicly accessible so customers can check fares and available rides
    if (pathname.startsWith("/api/vehicles/near-by")) {
        return NextResponse.next()
    }

    const session = await auth()
    if (!session || !session.user) {
        if (pathname.startsWith("/api")) {
            return NextResponse.json({ message: "unauthorized" }, { status: 401 })
        }
        return NextResponse.redirect(new URL("/", req.url))
    }

    const role = session.user?.role

    if (pathname.startsWith("/admin")) {
        if (role !== "admin") {
            return NextResponse.redirect(new URL("/", req.url))
        }
    }

    if (pathname.startsWith("/partner")) {
        if (pathname.startsWith("/partner/onboarding")) {
            return NextResponse.next()
        }
        if (role !== "partner") {
            return NextResponse.redirect(new URL("/", req.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
}