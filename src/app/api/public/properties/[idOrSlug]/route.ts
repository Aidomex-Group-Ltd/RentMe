import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PUBLIC_PROPERTY_SELECT } from "@/lib/public-property";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizePublicProperty } from "@/lib/public-property";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { idOrSlug: string } }
) {
  try {
    const rl = checkRateLimit(getClientIp(req.headers), PUBLIC_DETAIL_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const key = params.idOrSlug;
    const where = {
      OR: [{ id: key }, { slug: key }],
      deletedAt: null,
      status: "ACTIVE" as const,
    };

    let property: any = null;

    // Step 1: Try the full detail query with videos, amenities, and units.
    try {
      property = await prisma.property.findFirst({
        where,
        select: {
          ...PUBLIC_PROPERTY_SELECT,
          videos: {
            select: { id: true, url: true, thumbnail: true, order: true },
            orderBy: { order: "asc" },
          },
          amenities: {
            select: { amenity: { select: { id: true, name: true, icon: true } } },
          },
          units: {
            where: { status: "AVAILABLE" },
            select: {
              id: true,
              unitNumber: true,
              unitType: true,
              bedrooms: true,
              bathrooms: true,
              rent: true,
              status: true,
            },
            orderBy: { unitNumber: "asc" },
          },
        },
      });
    } catch (detailError) {
      // Step 2: If the full query fails (schema drift), fall back to
      // the basic public select that we know works from the list endpoint.
      console.warn("Detail query failed, falling back to list select:",
        detailError instanceof Error ? detailError.message : detailError);
      property = await prisma.property.findFirst({
        where,
        select: PUBLIC_PROPERTY_SELECT,
      });
    }

    if (!property) {
      return NextResponse.json(
        { error: "Property no longer available." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { property: sanitizePublicProperty(property as unknown as Record<string, unknown>) },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Public property detail error:", error);
    return NextResponse.json(
      { error: "We couldn't load this property right now. Please try again." },
      { status: 500 }
    );
  }
}
