export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const q = searchParams.get("q") || "";
    const district = searchParams.get("district") || "";
    const propertyType = searchParams.get("propertyType") || "";
    const verified = searchParams.get("verified");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const where: Prisma.PropertyWhereInput = { deletedAt: null };
    if (status) where.status = status as Prisma.PropertyWhereInput["status"];
    if (district) where.district = { contains: district, mode: "insensitive" };
    if (propertyType) where.propertyType = propertyType;
    if (verified === "true") where.isVerified = true;
    if (verified === "false") where.isVerified = false;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { neighborhood: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

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
    console.error("Admin properties GET error:", error);
    return NextResponse.json({ error: "Failed to load properties" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
    const status = body.status as string | undefined;
    const isVerified = body.isVerified as boolean | undefined;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const allowed = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "RENTED", "SUSPENDED", "ARCHIVED"];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true, status: true, isVerified: true, userId: true, slug: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...(status
          ? {
              status: status as
                | "DRAFT"
                | "PENDING_REVIEW"
                | "ACTIVE"
                | "RENTED"
                | "SUSPENDED"
                | "ARCHIVED",
            }
          : {}),
        ...(isVerified !== undefined ? { isVerified } : {}),
      },
    });

    if (status === "ACTIVE" && existing.status !== "ACTIVE") {
      await prisma.notification.create({
        data: {
          userId: property.userId,
          type: "LISTING_APPROVED",
          title: "Listing approved",
          body: "Your listing has been approved and is now live.",
          link: `/properties/${property.slug}`,
        },
      });
    } else if (status === "SUSPENDED" && existing.status !== "SUSPENDED") {
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
        userId: auth.user.id,
        action: "UPDATE",
        entity: "Property",
        entityId: propertyId,
        oldData: { status: existing.status, isVerified: existing.isVerified },
        newData: {
          status: status ?? existing.status,
          isVerified: isVerified ?? existing.isVerified,
        },
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error("Admin properties PATCH error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}
