import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { cachePropertyDetail, invalidatePropertyCaches } from "@/lib/cache";
import { buildPublicSafetyAlert } from "@/lib/flagging";
import { sanitizeText } from "@/lib/sanitize";

// GET /api/properties/[id] - Get property details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const isSlug = !id.match(/^[c]/); // cuid starts with 'c'

    const { data: property, cache: cacheStatus } = await cachePropertyDetail(
      id,
      async () =>
        prisma.property.findFirst({
          where: isSlug ? { slug: id } : { id },
          include: {
            images: {
              orderBy: { order: "asc" },
            },
            videos: {
              orderBy: { order: "asc" },
            },
            amenities: {
              include: { amenity: true },
            },
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                createdAt: true,
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
              where: { isApproved: true, isHidden: false },
              include: {
                user: {
                  select: { id: true, name: true, avatar: true },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            _count: {
              select: {
                savedBy: true,
                reviews: true,
              },
            },
          },
        })
    );

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const session = await getServerSession(authOptions);
    const isOwner = session?.user?.id === property.user.id;
    const isAdmin = session?.user?.role === "ADMIN";

    const ownerVerified =
      property.user.landlord?.verificationStatus === "VERIFIED" ||
      property.user.agent?.verificationStatus === "VERIFIED";

    const safety = buildPublicSafetyAlert({
      isFlagged: property.isFlagged,
      flagReason: property.flagReason,
      status: property.status,
      isVerified: property.isVerified,
      imageCount: property.images.length,
      rent: property.rent,
      bedrooms: property.bedrooms,
      propertyType: property.propertyType,
      description: property.description,
      listedAt: property.listedAt,
      ownerCreatedAt: property.user.createdAt,
      ownerVerified,
      isOwner: Boolean(isOwner),
    });

    let alreadyReported = false;
    if (session?.user?.id && !isOwner) {
      const existingReport = await prisma.report.findFirst({
        where: {
          reporterId: session.user.id,
          propertyId: property.id,
          status: { in: ["PENDING", "UNDER_REVIEW"] },
        },
        select: { id: true },
      });
      alreadyReported = Boolean(existingReport);
    }

    // Fire-and-forget view increment so cache still helps the heavy read path
    void prisma.property
      .update({
        where: { id: property.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((error) => console.error("View count update failed:", error));

    const hidePhone = safety.hideDirectContact && !isOwner && !isAdmin;

    return NextResponse.json(
      {
        property: {
          ...property,
          viewCount: property.viewCount + 1,
          user: {
            ...property.user,
            phone: hidePhone ? null : property.user.phone,
          },
          safety,
          alreadyReported,
          isOwner,
        },
      },
      {
        headers: {
          "X-RentMe-Cache": cacheStatus,
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Property fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch property" },
      { status: 500 }
    );
  }
}// ── Input schema: only allow fields owners may change ──────────────
const optionalTrimmed = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().optional()
);
const optionalCount = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : v),
  z.coerce.number().min(0).max(20).optional()
);
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().optional()
);

const updatePropertySchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  description: z.preprocess(
    (v) => (v === null || v === undefined ? undefined : v),
    z.string().max(5000).optional()
  ),
  propertyType: z.string().min(1).optional(),
  bedrooms: optionalCount,
  bathrooms: optionalCount,
  rent: z.coerce.number().min(1000).optional(),
  deposit: optionalNumber,
  agencyFee: optionalNumber,
  serviceCharge: optionalNumber,
  paymentFrequency: z.enum(["MONTHLY", "WEEKLY", "DAILY", "QUARTERLY", "ANNUALLY"]).optional(),
  minimumMonths: z.coerce.number().int().min(1).max(12).optional(),
  district: optionalTrimmed,
  city: optionalTrimmed,
  neighborhood: optionalTrimmed,
  address: optionalTrimmed,
  latitude: optionalNumber,
  longitude: optionalNumber,
  isFurnished: z.boolean().optional(),
  isSelfContained: z.boolean().optional(),
  hasCompound: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  hasSecurity: z.boolean().optional(),
  hasWater: z.boolean().optional(),
  hasElectricity: z.boolean().optional(),
  hasInternet: z.boolean().optional(),
  hasGenerator: z.boolean().optional(),
  hasAirConditioning: z.boolean().optional(),
  hasSecurityGuard: z.boolean().optional(),
  isGatedCommunity: z.boolean().optional(),
  allowsPets: z.boolean().optional(),
  availableFrom: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().optional()
  ),
});

// PATCH /api/properties/[id] - Update a property
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: { userId: true, slug: true, title: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (property.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parse = updatePropertySchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        {
          error: "Invalid fields",
          fields: Object.fromEntries(
            parse.error.issues.map((i) => [i.path.join("."), i.message])
          ),
        },
        { status: 400 }
      );
    }

    const data = parse.data;

    // Block non-admins from changing sensitive flags
    if (session.user.role !== "ADMIN") {
      delete (data as Record<string, unknown>).isVerified;
      delete (data as Record<string, unknown>).isFlagged;
      delete (data as Record<string, unknown>).status;
    }

    // Sanitize description if provided
    if (data.description !== undefined && data.description !== null) {
      (data as Record<string, unknown>).description = sanitizeText(data.description, 5000);
    }

    // Compute slug from title if title changed
    if (data.title && data.title !== property.title) {
      const { slugify } = await import("@/lib/utils");
      (data as Record<string, unknown>).slug = `${slugify(data.title)}-${Date.now().toString(36)}`;
    }

    const updated = await prisma.property.update({
      where: { id: params.id },
      data,
      include: {
        images: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Property",
        entityId: params.id,
        newData: data,
      },
    });

    invalidatePropertyCaches(updated.id, updated.slug);

    return NextResponse.json({ property: updated });
  } catch (error) {
    console.error("Property update error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

// DELETE /api/properties/[id] - Soft delete a property
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: { userId: true, slug: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (property.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.property.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    invalidatePropertyCaches(params.id, property.slug);

    return NextResponse.json({ message: "Property deleted" });
  } catch (error) {
    console.error("Property delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete property" },
      { status: 500 }
    );
  }
}
