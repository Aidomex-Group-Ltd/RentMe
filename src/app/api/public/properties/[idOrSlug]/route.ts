import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PUBLIC_PROPERTY_SELECT, sanitizePublicProperty } from "@/lib/public-property";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/public/properties/[idOrSlug] — guest property detail.
 *
 * Read-only, unauthenticated. Same privacy boundary as the public list
 * endpoint: ACTIVE listings only, explicit public field selection, owner
 * reduced to display identity, address stripped, no tenant/financial/
 * administrative data. 404 (not 403) for anything a guest may not see so
 * the public detail page can render "no longer available" gracefully.
 */

const PUBLIC_DETAIL_RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60_000,
  keyPrefix: "public-api",
} as const;

// Bump this on every deploy so we can confirm the new code is live in production.
const ROUTE_VERSION = "v3-robust-2026-08-24";

export async function GET(
  req: NextRequest,
  { params }: { params: { idOrSlug: string } }
) {
  const headers: Record<string, string> = { "X-Route-Version": ROUTE_VERSION };

  try {
    // ── Step 1: Rate limit ──────────────────────────────────────────
    const rl = checkRateLimit(getClientIp(req.headers), PUBLIC_DETAIL_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { ...headers, "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    // ── Step 2: Parse params ────────────────────────────────────────
    const key = params?.idOrSlug;
    if (!key) {
      console.error(`[${ROUTE_VERSION}] params.idOrSlug is missing`);
      return NextResponse.json(
        { error: "Invalid property identifier." },
        { status: 400, headers }
      );
    }

    // ── Step 3: Build the WHERE clause ──────────────────────────────
    const where = {
      OR: [{ id: key }, { slug: key }],
      deletedAt: null,
      status: "ACTIVE" as const,
    };

    // ── Step 4: Single query — use the same select as the list
    //     endpoint (known to work) plus the extra detail fields.
    //     If the detail fields cause a schema-mismatch error,
    //     catch it and fall back to the list select.
    let property: any = null;

    // Try the full detail select first (includes videos, amenities, units).
    try {
      property = await prisma.property.findFirst({
        where,
        select: {
          ...PUBLIC_PROPERTY_SELECT,
          videos: {
            select: { id: true, url: true, thumbnail: true, order: true },
            orderBy: { order: "asc" as const },
          },
          amenities: {
            select: { amenity: { select: { id: true, name: true, icon: true } } },
          },
          units: {
            where: { status: "AVAILABLE" as const },
            select: {
              id: true, unitNumber: true, unitType: true,
              bedrooms: true, bathrooms: true, rent: true, status: true,
            },
            orderBy: { unitNumber: "asc" as const },
          },
        },
      });
    } catch (detailErr) {
      // The full query failed — probably a production schema drift.
      // Log the error server-side and fall back to the minimal select.
      console.error(
        `[${ROUTE_VERSION}] Detail query failed for key="${key}":`,
        detailErr instanceof Error ? detailErr.message : String(detailErr),
      );
      property = await prisma.property.findFirst({
        where,
        select: PUBLIC_PROPERTY_SELECT,
      });
    }

    // ── Step 5: Property not found ──────────────────────────────────
    if (!property) {
      return NextResponse.json(
        { error: "Property no longer available." },
        { status: 404, headers }
      );
    }

    // ── Step 6: Sanitize for public consumption ─────────────────────
    const sanitized = sanitizePublicProperty(property as unknown as Record<string, unknown>);

    // ── Step 7: Serialize and respond ───────────────────────────────
    // NextResponse.json uses structured-clone + JSON.stringify internally.
    // Wrap in a try-catch to surface serialization issues (BigInt,
    // circular refs, etc.) rather than a generic 500.
    try {
      return NextResponse.json(
        { property: sanitized },
        {
          status: 200,
          headers: { ...headers, "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
        }
      );
    } catch (serializeErr) {
      console.error(
        `[${ROUTE_VERSION}] JSON serialization failed for key="${key}":`,
        serializeErr instanceof Error ? serializeErr.message : String(serializeErr),
      );
      return NextResponse.json(
        { error: "Property data could not be serialized." },
        { status: 500, headers }
      );
    }
  } catch (error) {
    // Outermost catch — covers everything else.
    console.error(
      `[${ROUTE_VERSION}] Public property detail error for key="${params?.idOrSlug}":`,
      error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
    );
    return NextResponse.json(
      { error: "We couldn't load this property right now. Please try again." },
      { status: 500, headers }
    );
  }
}
