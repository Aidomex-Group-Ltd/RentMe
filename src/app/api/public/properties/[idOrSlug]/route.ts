import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
    const property = await prisma.property.findFirst({
      where: {
        OR: [{ id: key }, { slug: key }],
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        propertyType: true,
        rent: true,
        deposit: true,
        agencyFee: true,
        paymentFrequency: true,
        bedrooms: true,
        bathrooms: true,
        district: true,
        city: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        viewCount: true,
        status: true,
        isVerified: true,
        isFurnished: true,
        isSelfContained: true,
        hasWater: true,
        hasElectricity: true,
        hasInternet: true,
        hasParking: true,
        hasSecurity: true,
        hasGarden: true,
        hasAirConditioning: true,
        hasSecurityGuard: true,
        isGatedCommunity: true,
        hasCompound: true,
        hasBalcony: true,
        allowsPets: true,
        listedAt: true,
        images: { orderBy: [{ isCover: "desc" }, { order: "asc" }] },
        videos: {
          select: { id: true, url: true, thumbnail: true, order: true },
          orderBy: { order: "asc" },
        },
        amenities: {
          select: { amenity: { select: { id: true, name: true, icon: true } } },
        },
        user: {
          select: {
            name: true,
            avatar: true,
            phone: true,
            landlord: {
              select: {
                verificationStatus: true,
                responseRate: true,
                responseTimeHours: true,
                totalListings: true,
                activeListings: true,
              },
            },
            agent: {
              select: {
                verificationStatus: true,
                responseRate: true,
                responseTimeHours: true,
                totalProperties: true,
                activeProperties: true,
              },
            },
          },
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

    if (!property) {
      return NextResponse.json(
        { error: "Property no longer available." },
        { status: 404 }
      );
    }

    // Defense-in-depth scrubbing of anything not intended for guests.
    const detail = property as unknown as Record<string, unknown>;
    delete detail.address;
    if (detail.user && typeof detail.user === "object") {
      const u = detail.user as Record<string, unknown>;
      delete u.id;
      delete u.email;
    }

    return NextResponse.json(
      { property: detail },
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
