import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { deletedAt: null };
    if (status) where.status = status;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          images: { where: { isCover: true }, take: 1 },
          _count: { select: { savedBy: true, reports: true } },
        },
        orderBy: { listedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      properties,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { propertyId, status, isVerified } = await req.json();

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(status && { status }),
        ...(isVerified !== undefined && { isVerified }),
      },
    });

    // Notify property owner about status change
    if (status === "ACTIVE") {
      await prisma.notification.create({
        data: {
          userId: property.userId,
          type: "LISTING_APPROVED",
          title: "Listing approved",
          body: "Your listing has been approved and is now live.",
          link: `/properties/${property.slug}`,
        },
      });
    } else if (status === "SUSPENDED") {
      await prisma.notification.create({
        data: {
          userId: property.userId,
          type: "LISTING_REJECTED",
          title: "Listing suspended",
          body: "Your listing has been suspended. Please review and update it.",
          link: `/dashboard/landlord`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Property",
        entityId: propertyId,
        newData: { status, isVerified },
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
