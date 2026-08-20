import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { cachePropertyList, invalidatePropertyCaches } from "@/lib/cache";
import { slugify } from "@/lib/utils";
import { notifyLandlordListingSubmitted, notifyAdminNewListing } from "@/lib/notifications";

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
        "X-RentMe-Cache": cacheStatus,
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

const createPropertySchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  propertyType: z.string().min(1),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  rent: z.number().min(1000),
  deposit: z.number().optional(),
  agencyFee: z.number().optional(),
  serviceCharge: z.number().optional(),
  paymentFrequency: z
    .enum(["MONTHLY", "WEEKLY", "DAILY", "QUARTERLY", "ANNUALLY"])
    .default("MONTHLY"),
  district: z.string().min(1),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
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
  availableFrom: z.string().optional(),
  imageUrls: z.array(z.string().url()).max(20).optional(),
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
        description: data.description,
        slug,
        propertyType: data.propertyType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        rent: data.rent,
        deposit: data.deposit,
        agencyFee: data.agencyFee,
        serviceCharge: data.serviceCharge,
        paymentFrequency: data.paymentFrequency,
        district: data.district,
        city: data.city,
        neighborhood: data.neighborhood,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
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
