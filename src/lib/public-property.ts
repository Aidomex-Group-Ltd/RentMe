import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

/**
 * Cached property fetch for SSR pages (layout metadata + JSON-LD).
 * Uses Next.js `unstable_cache` so multiple calls in the same request
 * (layout + page) only hit the database once.
 */
const PROPERTY_SELECT_FULL = {
  id: true,
  userId: true,
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
  isVerified: true,
  isFlagged: true,
  flagReason: true,
  listedAt: true,
  images: {
    orderBy: [{ isCover: "desc" }, { order: "asc" }],
    take: 20,
    select: { id: true, url: true, alt: true, order: true, isCover: true },
  },
  videos: {
    orderBy: { order: "asc" },
    select: { id: true, url: true, thumbnail: true, order: true },
  },
  amenities: {
    select: { amenity: { select: { id: true, name: true, icon: true } } },
  },
  user: {
    select: {
      id: true,
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
  reviews: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
  units: {
    where: { status: "AVAILABLE" as const },
    orderBy: { unitNumber: "asc" as const },
  },
};

/**
 * Resilient property fetch: tries the full select first, then falls back
 * to a minimal select on schema mismatch (production Prisma client drift).
 */
async function fetchProperty(key: string) {
  const where = {
    OR: [{ id: key }, { slug: key }],
    deletedAt: null,
    status: "ACTIVE" as const,
  };

  try {
    return await prisma.property.findFirst({ where, select: PROPERTY_SELECT_FULL as any });
  } catch (err) {
    console.warn(
      "Full property query failed, using minimal select:",
      err instanceof Error ? err.message : err,
    );
    return await prisma.property.findFirst({ where, select: PROPERTY_SELECT_MINIMAL as any });
  }
}

/**
 * Minimal fallback select: only the fields guaranteed to exist across all
 * schema versions (no videos, amenities, units, or reviews relations).
 */
const PROPERTY_SELECT_MINIMAL = {
  id: true,
  userId: true,
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
  isVerified: true,
  isFlagged: true,
  flagReason: true,
  listedAt: true,
  images: {
    orderBy: [{ isCover: "desc" }, { order: "asc" }],
    take: 20,
    select: { id: true, url: true, alt: true, order: true, isCover: true },
  },
  user: {
    select: {
      id: true,
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
  reviews: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
};

export const getPublicProperty = unstable_cache(
  (key: string) => fetchProperty(key),
  ["public-property"],
  { revalidate: 300, tags: ["property"] }
);

export type PublicPropertyData = NonNullable<Awaited<ReturnType<typeof getPublicProperty>>>;


/**
 * Narrow field set for the anonymous LIST endpoint (/api/public/properties).
 * Fewer fields than getPublicProperty: list payloads stay light and leak less.
 */
export const PUBLIC_PROPERTY_SELECT: Prisma.PropertySelect = {
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
  saveCount: true,
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
  images: {
    orderBy: [{ isCover: "desc" }, { order: "asc" }],
    take: 5,
  },
  user: {
    select: {
      name: true,
      avatar: true,
      phone: true,
      landlord: {
        select: { verificationStatus: true, responseRate: true },
      },
      agent: {
        select: { verificationStatus: true, responseRate: true },
      },
    },
  },
};

/**
 * Defense-in-depth scrub for anything returned to anonymous callers:
 * strips precise street address and owner internal IDs/emails.
 */
export function sanitizePublicProperty(property: Record<string, unknown>) {
  const out = { ...property };
  delete out.address;
  if (out.user && typeof out.user === "object") {
    const u = { ...(out.user as Record<string, unknown>) };
    delete u.id;
    delete u.email;
    out.user = u;
  }
  return out;
}
