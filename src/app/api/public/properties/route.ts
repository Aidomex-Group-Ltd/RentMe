import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  PUBLIC_PROPERTY_SELECT,
  sanitizePublicProperty,
} from "@/lib/public-property";

/**
 * GET /api/public/properties — guest property discovery (Stage: public access).
 *
 * Read-only, unauthenticated, and deliberately narrow:
 * - Only ACTIVE, non-deleted listings are ever returned (status filter is
 *   server-authoritative; guest input cannot widen it).
 * - Explicit field selection: no owner IDs, emails, tenant data, financial
 *   or administrative fields leave the database.
 * - Landlord identity is limited to display name + avatar + public
 *   verification badges (same information shown on listing cards).
 */

const PUBLIC_LIST_RATE_LIMIT = {
  maxRequests: 60,
  windowMs: 60_000,
  keyPrefix: "public-api",
} as const;

export async function GET(req: NextRequest) {
  try {
    // Light abuse protection for an unauthenticated endpoint.
    const rl = checkRateLimit(getClientIp(req.headers), PUBLIC_LIST_RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const num = (v: string | null) => parseInt(v || "", 10);

    const q = searchParams.get("q") || "";
    const propertyType = searchParams.get("type") || "";
    const minRent = searchParams.get("minRent") || "";
    const maxRent = searchParams.get("maxRent") || "";
    const bedrooms = searchParams.get("bedrooms");
    const bathrooms = searchParams.get("bathrooms");
    const district = searchParams.get("district") || "";
    const city = searchParams.get("city") || "";
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, num(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, num(searchParams.get("limit")) || 20));
    const furnished = searchParams.get("furnished") || "";
    const parking = searchParams.get("parking") || "";
    const security = searchParams.get("security") || "";

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      status: "ACTIVE", // server-authoritative: guests only ever see live listings
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { neighborhood: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }
    if (propertyType) where.propertyType = propertyType;
    if (minRent || maxRent) {
      where.rent = {};
      if (minRent && !Number.isNaN(num(minRent))) where.rent.gte = num(minRent);
      if (maxRent && !Number.isNaN(num(maxRent))) where.rent.lte = num(maxRent);
    }
    if (bedrooms !== null && !Number.isNaN(num(bedrooms))) where.bedrooms = num(bedrooms);
    if (bathrooms !== null && !Number.isNaN(num(bathrooms))) where.bathrooms = num(bathrooms);
    if (district) where.district = { contains: district, mode: "insensitive" };
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (furnished === "true") where.isFurnished = true;
    if (parking === "true") where.hasParking = true;
    if (security === "true") where.hasSecurity = true;

    let orderBy: Prisma.PropertyOrderByWithRelationInput = { listedAt: "desc" };
    switch (sort) {
      case "price_low": orderBy = { rent: "asc" }; break;
      case "price_high": orderBy = { rent: "desc" }; break;
      case "most_viewed": orderBy = { viewCount: "desc" }; break;
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: PUBLIC_PROPERTY_SELECT,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json(
      {
        properties: properties.map(sanitizePublicProperty),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Public properties error:", error);
    return NextResponse.json(
      { error: "We couldn't load properties right now. Please try again." },
      { status: 500 }
    );
  }
}
