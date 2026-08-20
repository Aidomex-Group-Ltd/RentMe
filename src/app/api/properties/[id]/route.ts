import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { cachePropertyDetail, invalidatePropertyCaches } from "@/lib/cache";

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

    // Fire-and-forget view increment so cache still helps the heavy read path
    void prisma.property
      .update({
        where: { id: property.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((error) => console.error("View count update failed:", error));

    return NextResponse.json(
      {
        property: {
          ...property,
          viewCount: property.viewCount + 1,
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
}

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
      select: { userId: true, slug: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (property.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: body,
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
        newData: body,
      },
    });

    invalidatePropertyCaches(updated.id, updated.slug);

    return NextResponse.json({ property: updated });
  } catch (error) {
    console.error("Property update error:", error);
    return NextResponse.json(
      { error: "Failed to update property" },
      { status: 500 }
    );
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
