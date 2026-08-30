import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { cachePropertyList, invalidatePropertyCaches } from "@/lib/cache";
import { slugify } from "@/lib/utils";
import { getDistrictsByRegion, type Region } from "@/lib/uganda-districts";
import { notifyLandlordListingSubmitted, notifyAdminNewListing } from "@/lib/notifications";
import { sanitizeText } from "@/lib/sanitize";

// GET /api/properties - List properties with search & filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") || "";
    const propertyType = searchParams.get("type") || "";
    const minRent = searchParams.get("minRent") || "";
    const maxRent = searchParams.get("maxRent") || "";
    const bedrooms = searchParams.get("bedrooms") || "";
    const bathrooms = searchParams.get("bathrooms") || "";
    const district = searchParams.get("district") || "";
    const city = searchParams.get("city") || "";
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const statusParam = searchParams.get("status");
    const mine =
      searchParams.get("mine") === "1" || searchParams.get("mine") === "true";
    const furnished = searchParams.get("furnished") || "";
    const hasParking = searchParams.get("parking") || "";
    const hasSecurity = searchParams.get("security") || "";
    const selfContained = searchParams.get("selfContained") || "";
    const region = searchParams.get("region") || "";

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
    };

    if (mine) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      where.userId = session.user.id;

      // Landlord dashboard: show all own statuses unless a specific status is requested
      if (statusParam && statusParam.toUpperCase() !== "ALL") {
        where.status = statusParam as Prisma.EnumPropertyStatusFilter;
      }
    } else if (statusParam && statusParam.toUpperCase() !== "ALL") {
      where.status = statusParam as Prisma.EnumPropertyStatusFilter;
    } else if (!statusParam) {
      where.status = "ACTIVE";
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { neighborhood: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (minRent || maxRent) {
      const rentFilter: Prisma.IntFilter = {};
      if (minRent) rentFilter.gte = parseInt(minRent, 10);
      if (maxRent) rentFilter.lte = parseInt(maxRent, 10);
      where.rent = rentFilter;
    }

    if (bedrooms) {
      where.bedrooms = parseInt(bedrooms, 10);
    }

    if (bathrooms) {
      where.bathrooms = parseInt(bathrooms, 10);
    }

    if (district) {
      where.district = { contains: district, mode: "insensitive" };
    }

    // Region filter: expand region name to matching districts
    if (region && !district) {
      const regionDistricts = getDistrictsByRegion(region as Region);
      if (regionDistricts.length > 0) {
        where.district = { in: regionDistricts, mode: "insensitive" };
      }
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    if (furnished === "true") {
      where.isFurnished = true;
    }

    if (hasParking === "true") {
      where.hasParking = true;
    }

    if (hasSecurity === "true") {
      where.hasSecurity = true;
    }

    if (selfContained === "true") {
      where.isSelfContained = true;
    }

    let orderBy: Prisma.PropertyOrderByWithRelationInput = { listedAt: "desc" };
    switch (sort) {
      case "newest":
        orderBy = { listedAt: "desc" };
        break;
      case "price_low":
        orderBy = { rent: "asc" };
        break;
      case "price_high":
        orderBy = { rent: "desc" };
        break;
      case "most_viewed":
        orderBy = { viewCount: "desc" };
        break;
      case "most_saved":
        orderBy = { saveCount: "desc" };
        break;
      default:
        orderBy = { listedAt: "desc" };
    }

    const skip = (page - 1) * limit;

    const loadProperties = async () => {
      const [properties, total] = await Promise.all([
        prisma.property.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: {
            images: {
              orderBy: [{ isCover: "desc" }, { order: "asc" }],
              take: 5,
            },
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                landlord: {
                  select: { verificationStatus: true, responseRate: true },
                },
                agent: {
                  select: { verificationStatus: true, responseRate: true },
                },
              },
            },
          },
        }),
        prisma.property.count({ where }),
      ]);

      return {
        properties,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    };

    // Public listings are cached in-process (no Redis / no paid service).
    // Owner "mine" views stay uncached so landlords always see fresh PENDING_REVIEW rows.
    let payload: Awaited<ReturnType<typeof loadProperties>>;
    let cacheStatus: "HIT" | "MISS" | "BYPASS" = "BYPASS";

    if (mine) {
      payload = await loadProperties();
    } else {
      const queryKey = searchParams.toString();
      const result = await cachePropertyList(queryKey, loadProperties);
      payload = result.data;
      cacheStatus = result.cache;
    }

    return NextResponse.json(payload, {
      headers: {
        "X-Rent Mesh-Cache": cacheStatus,
        "Cache-Control": mine ? "private, no-store" : "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Properties fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}

/** Empty string / null → undefined so optional number fields do not become NaN. */
const optionalCoercedNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
}, z.coerce.number().optional());

/** Empty / missing → 0 for bedrooms/bathrooms. */
const optionalCount = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  return value;
}, z.coerce.number().min(0).max(20).default(0));

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const createPropertySchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters.")
    .max(200, "Title must be 200 characters or fewer."),
  // Optional — empty descriptions are stored as ""; non-empty ones need substance.
  description: z.preprocess(
    (value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return value.trim();
      return value;
    },
    z
      .string()
      .max(5000, "Description must be 5,000 characters or fewer.")
      .refine(
        (v) => v === "" || v.length >= 20,
        "Description must be at least 20 characters."
      )
      .default("")
  ),
  propertyType: z.string().min(1, "Please select a property type."),
  bedrooms: optionalCount,
  bathrooms: optionalCount,
  rent: z.coerce.number().min(1000, "Rent must be at least UGX 1,000."),
  deposit: optionalCoercedNumber,
  agencyFee: optionalCoercedNumber,
  serviceCharge: optionalCoercedNumber,
  paymentFrequency: z
    .enum(["MONTHLY", "WEEKLY", "DAILY", "QUARTERLY", "ANNUALLY"])
    .default("MONTHLY"),
  /** Landlord-chosen minimum months due upfront; null/omitted derives from frequency */
  minimumMonths: z.coerce.number().int().min(1).max(12).optional(),
  district: optionalTrimmedString,
  city: optionalTrimmedString,
  neighborhood: optionalTrimmedString,
  address: optionalTrimmedString,
  latitude: optionalCoercedNumber,
  longitude: optionalCoercedNumber,
  isFurnished: z.boolean().default(false),
  isSelfContained: z.boolean().default(false),
  hasCompound: z.boolean().default(false),
  hasBalcony: z.boolean().default(false),
  hasGarden: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  hasSecurity: z.boolean().default(false),
  hasWater: z.boolean().default(true),
  hasElectricity: z.boolean().default(true),
  hasInternet: z.boolean().default(false),
  hasGenerator: z.boolean().default(false),
  hasAirConditioning: z.boolean().default(false),
  hasSecurityGuard: z.boolean().default(false),
  isGatedCommunity: z.boolean().default(false),
  allowsPets: z.boolean().default(false),
  availableFrom: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional()
  ),
  imageUrls: z
    .array(z.string().min(1))
    .max(20)
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database is not configured",
          },
        },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be signed in to create a listing",
          },
        },
        { status: 401 }
      );
    }

    if (
      session.user.role !== "LANDLORD" &&
      session.user.role !== "AGENT" &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only landlords and agents can create property listings. Please register as a landlord or agent.",
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = createPropertySchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields.",
            fields: fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const slug = `${slugify(data.title)}-${Date.now().toString(36)}`;
    const imageUrls = data.imageUrls ?? [];

    const property = await prisma.property.create({
      data: {
        title: data.title,
        description: sanitizeText(data.description || "", 5000),
        slug,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms ?? 0,
        bathrooms: data.bathrooms ?? 0,
        rent: data.rent,
        deposit: data.deposit ?? null,
        agencyFee: data.agencyFee ?? null,
        serviceCharge: data.serviceCharge ?? null,
        paymentFrequency: data.paymentFrequency,
        minimumMonths: data.minimumMonths ?? null,
        district: data.district ?? null,
        city: data.city ?? null,
        neighborhood: data.neighborhood ?? null,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isFurnished: data.isFurnished,
        isSelfContained: data.isSelfContained,
        hasCompound: data.hasCompound,
        hasBalcony: data.hasBalcony,
        hasGarden: data.hasGarden,
        hasParking: data.hasParking,
        hasSecurity: data.hasSecurity,
        hasWater: data.hasWater,
        hasElectricity: data.hasElectricity,
        hasInternet: data.hasInternet,
        hasGenerator: data.hasGenerator,
        hasAirConditioning: data.hasAirConditioning,
        hasSecurityGuard: data.hasSecurityGuard,
        isGatedCommunity: data.isGatedCommunity,
        allowsPets: data.allowsPets,
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
        userId: session.user.id,
        isAgentListing: session.user.role === "AGENT",
        status: "PENDING_REVIEW",
        images:
          imageUrls.length > 0
            ? {
                create: imageUrls.map((url, index) => ({
                  url,
                  alt: data.title,
                  order: index,
                  isCover: index === 0,
                })),
              }
            : undefined,
      },
      include: {
        images: {
          orderBy: [{ isCover: "desc" }, { order: "asc" }],
        },
      },
    });

    if (session.user.role === "LANDLORD") {
      await prisma.landlord.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          totalListings: 1,
          activeListings: 1,
        },
        update: {
          totalListings: { increment: 1 },
          activeListings: { increment: 1 },
        },
      });
    } else if (session.user.role === "AGENT") {
      await prisma.agent.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          totalProperties: 1,
          activeProperties: 1,
        },
        update: {
          totalProperties: { increment: 1 },
          activeProperties: { increment: 1 },
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Property",
        entityId: property.id,
        newData: {
          title: data.title,
          rent: data.rent,
          district: data.district,
          imageCount: imageUrls.length,
        },
      },
    });

    invalidatePropertyCaches(property.id, property.slug);

    // ── Fire-and-forget email notifications ─────────────────────
    const notificationData = {
      propertyId: property.id,
      propertyTitle: data.title,
      rent: data.rent,
      district: data.district,
      city: data.city || undefined,
      neighborhood: data.neighborhood || undefined,
      landlordName: session.user.name || "Landlord",
      landlordEmail: session.user.email || undefined,
      landlordPhone: session.user.phone || undefined,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      propertyType: data.propertyType,
      submittedAt: new Date().toISOString(),
    };
    // Never await — fire-and-forget so the response is not delayed
    notifyLandlordListingSubmitted(notificationData).catch(() => {});
    notifyAdminNewListing(notificationData).catch(() => {});

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields.",
            fields: fieldErrors,
          },
        },
        { status: 400 }
      );
    }
    console.error("Property creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create property. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
