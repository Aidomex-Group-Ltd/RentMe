import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  RateLimits,
} from "@/lib/rate-limit";

/** Check that state-changing requests originate from our own origin. */
function isInvalidOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return false;
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  // Allow requests with no origin (same-origin browser requests, server-to-server)
  if (!origin && !referer) return false;

  // Allow configured site URL, the request Host, and Vercel deployment URL
  const allowedHosts = new Set<string>();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "";
  if (siteUrl) {
    try {
      allowedHosts.add(new URL(siteUrl).host.toLowerCase());
    } catch {
      /* ignore invalid site URL */
    }
  }
  if (host) allowedHosts.add(host.toLowerCase());
  if (process.env.VERCEL_URL) {
    allowedHosts.add(process.env.VERCEL_URL.toLowerCase());
  }

  if (allowedHosts.size === 0) return false;

  const hostAllowed = (value: string | null): boolean => {
    if (!value) return true;
    try {
      const valueHost = new URL(value).host.toLowerCase();
      return [...allowedHosts].some((h) => valueHost === h || valueHost.endsWith(`.${h}`));
    } catch {
      return [...allowedHosts].some((h) => value.toLowerCase().includes(h));
    }
  };

  if (origin && !hostAllowed(origin)) return true;
  if (referer && !hostAllowed(referer)) return true;

  return false;
}

function applyRateLimit(
  req: Request,
  config: typeof RateLimits[keyof typeof RateLimits]
): NextResponse | null {
  const ip = getClientIp(req.headers);
  const result = checkRateLimit(ip, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(result.resetMs / 1000)),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null; // allowed
}

/**
 * Optional apex redirect. Only enabled when PRODUCTION_DOMAIN is set and
 * differs from the request host — keeps rent-me-seven.vercel.app usable
 * until the custom domain is cut over.
 */
const PRODUCTION_HOST = (process.env.PRODUCTION_DOMAIN || "").replace(/\/$/, "");
const REDIRECT_HOSTS = new Set(
  (process.env.REDIRECT_FROM_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
);

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ── PUBLIC GUEST ROUTES ────────────────────────────────────
    // Frictionless discovery: these paths pass through untouched — no
    // session check, no redirect, no popup. Authentication is requested
    // only when a visitor takes an action that requires an account
    // (apply, save, message, dashboards). Keep this list authoritative:
    // public routes must never inherit dashboard auth rules added below.
    //
    // SECURITY: the only public API surface is /api/public/* (read-only,
    // self-rate-limited at the route). Page prefixes must never leak into
    // /api/* or the CSRF/rate-limit/auth gates below would be skipped.
    if (pathname.startsWith("/api/public")) {
      return NextResponse.next();
    }

    const isApiPath = pathname.startsWith("/api/");
    const PUBLIC_PAGES = [
      "/search",
      "/properties",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
    ];
    const isPublicPage =
      !isApiPath &&
      (pathname === "/" ||
        PUBLIC_PAGES.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`)
        ));
    if (isPublicPage) {
      return NextResponse.next();
    }

    // ── Domain redirect (opt-in via PRODUCTION_DOMAIN + REDIRECT_FROM_HOSTS)
    const host = (req.headers.get("host") || "").toLowerCase();
    if (
      PRODUCTION_HOST &&
      REDIRECT_HOSTS.has(host) &&
      host !== PRODUCTION_HOST.toLowerCase()
    ) {
      const target = new URL(req.url);
      target.host = PRODUCTION_HOST;
      target.protocol = "https:";
      return NextResponse.redirect(target, 301);
    }

    // ── CSRF Origin check for state-changing API routes ────────
    if (
      pathname.startsWith("/api/") &&
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      req.method !== "OPTIONS"
    ) {
      if (isInvalidOrigin(req)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CSRF_REJECTED",
              message: "Request origin is not allowed.",
            },
          },
          { status: 403 }
        );
      }
    }

    // ── Rate limiting for sensitive API endpoints ───────────────

    // Auth endpoints (register, login, password reset, credentials callback)
    if (
      pathname.startsWith("/api/auth/register") ||
      pathname.startsWith("/api/auth/forgot-password") ||
      pathname.startsWith("/api/auth/reset-password") ||
      pathname.startsWith("/api/auth/callback/credentials")
    ) {
      const blocked = applyRateLimit(req, RateLimits.auth);
      if (blocked) return blocked;
    }

    // Property creation
    if (pathname.startsWith("/api/properties") && req.method === "POST") {
      const blocked = applyRateLimit(req, RateLimits.propertyCreate);
      if (blocked) return blocked;
    }

    // Upload
    if (pathname.startsWith("/api/upload") && req.method === "POST") {
      const blocked = applyRateLimit(req, RateLimits.upload);
      if (blocked) return blocked;
    }

    // Property / user reports
    if (pathname.startsWith("/api/reports") && req.method === "POST") {
      const blocked = applyRateLimit(req, RateLimits.reports);
      if (blocked) return blocked;
    }

    // Chatbot
    if (pathname.startsWith("/api/chatbot") && req.method === "POST") {
      const blocked = applyRateLimit(req, RateLimits.chatbot);
      if (blocked) return blocked;
    }

    // Inspections
    if (pathname.startsWith("/api/inspections") && req.method === "POST") {
      const blocked = applyRateLimit(req, RateLimits.inspections);
      if (blocked) return blocked;
    }

    // ── Page-level auth checks ─────────────────────────────────

    // Admin-only routes
    if (pathname.startsWith("/admin")) {
      if (!token) {
        const login = new URL("/login", req.url);
        login.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(login);
      }
      if (token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // Dashboard routes require auth — preserve intended destination
    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        const login = new URL("/login", req.url);
        login.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(login);
      }
    }

    // Messages require auth — preserve intended destination
    if (pathname.startsWith("/messages")) {
      if (!token) {
        const login = new URL("/login", req.url);
        login.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(login);
      }
    }

    // ── API auth checks ────────────────────────────────────────

    // Protected API routes — property creation
    if (pathname.startsWith("/api/properties") && req.method === "POST") {
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    if (pathname.startsWith("/api/upload")) {
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    if (pathname.startsWith("/api/conversations") && req.method === "POST") {
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    if (pathname.startsWith("/api/reports") && req.method === "POST") {
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
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
    // Include bare /admin — :path* alone is unreliable across Next matcher versions
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/messages",
    "/messages/:path*",
    "/api/properties",
    "/api/properties/:path*",
    "/api/upload",
    "/api/upload/:path*",
    "/api/conversations",
    "/api/conversations/:path*",
    "/api/reports",
    "/api/reports/:path*",
    "/api/admin",
    "/api/admin/:path*",
    "/api/viewings",
    "/api/viewings/:path*",
    "/api/applications",
    "/api/applications/:path*",
    "/api/notifications",
    "/api/notifications/:path*",
    "/api/chatbot",
    "/api/chatbot/:path*",
    "/api/inspections",
    "/api/inspections/:path*",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/callback/credentials",
  ],
};
