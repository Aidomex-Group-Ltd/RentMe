import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { Prisma } from "@prisma/client";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "ACTIVE";
    const furnished = searchParams.get("furnished") || "";
    const hasParking = searchParams.get("parking") || "";
    const hasSecurity = searchParams.get("security") || "";
    const selfContained = searchParams.get("selfContained") || "";

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status as any;
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

    if (minRent) {
      where.rent = { ...where.rent, gte: parseInt(minRent) };
    }

    if (maxRent) {
      where.rent = { ...where.rent, lte: parseInt(maxRent) };
    }

    if (bedrooms) {
      where.bedrooms = parseInt(bedrooms);
    }

    if (bathrooms) {
      where.bathrooms = parseInt(bathrooms);
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

    let orderBy: Prisma.PropertyOrderByWithRelationInput = {};
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

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: {
            where: { isCover: true },
            take: 1,
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

    return NextResponse.json({
      properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

// POST /api/properties - Create a new property listing
const createPropertySchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  propertyType: z.string(),
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  rent: z.number().min(1000),
  deposit: z.number().optional(),
  agencyFee: z.number().optional(),
  serviceCharge: z.number().optional(),
  paymentFrequency: z.enum(["MONTHLY", "WEEKLY", "DAILY", "QUARTERLY", "ANNUALLY"]).default("MONTHLY"),
  district: z.string(),
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
});

export async function POST(req: NextRequest) {
  try {
    const session = await import("next-auth").then(({ getServerSession }) =>
      getServerSession(authOptions)
    );

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "LANDLORD" && session.user.role !== "AGENT" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only landlords and agents can create listings" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = createPropertySchema.parse(body);

    const slug = slugify(data.title) + "-" + Date.now().toString(36);

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
        images: {
          create: [],
        },
      },
      include: {
        images: true,
      },
    });

    // Update listing counts
    if (session.user.role === "LANDLORD") {
      await prisma.landlord.update({
        where: { userId: session.user.id },
        data: {
          totalListings: { increment: 1 },
          activeListings: { increment: 1 },
        },
      });
    } else if (session.user.role === "AGENT") {
      await prisma.agent.update({
        where: { userId: session.user.id },
        data: {
          totalProperties: { increment: 1 },
          activeProperties: { increment: 1 },
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Property",
        entityId: property.id,
        newData: { title: data.title, rent: data.rent, district: data.district },
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Property creation error:", error);
    return NextResponse.json(
      { error: "Failed to create property" },
      { status: 500 }
    );
  }
}
