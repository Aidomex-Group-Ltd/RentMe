import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin-only routes
    if (pathname.startsWith("/admin")) {
      if (!token || token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Dashboard routes require auth
    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Messages require auth
    if (pathname.startsWith("/messages")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Protected API routes
    if (pathname.startsWith("/api/properties") && req.method === "POST") {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (pathname.startsWith("/api/upload")) {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (pathname.startsWith("/api/conversations") && req.method === "POST") {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (pathname.startsWith("/api/reports") && req.method === "POST") {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let middleware handle auth checks
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/messages/:path*",
    "/api/properties/:path*",
    "/api/upload/:path*",
    "/api/conversations/:path*",
    "/api/reports/:path*",
    "/api/viewings/:path*",
    "/api/applications/:path*",
    "/api/notifications/:path*",
  ],
};
