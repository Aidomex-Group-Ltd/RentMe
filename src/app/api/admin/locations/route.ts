export const dynamic = "force-dynamic";

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
    const type = searchParams.get("type") || "";
    const parentId = searchParams.get("parentId") || "";
    const q = searchParams.get("q") || "";

    const where: any = {};
    if (type) where.type = type;
    if (parentId) where.parentId = parentId;
    if (q) where.name = { contains: q, mode: "insensitive" };

    const locations = await prisma.location.findMany({
      where,
      include: {
        _count: { select: { children: true, properties: true } },
      },
      orderBy: { name: "asc" },
      take: 200,
    });

    return NextResponse.json({ locations });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, type, parentId, latitude, longitude } = await req.json();
    if (!name || !type) {
      return NextResponse.json({ error: "name and type required" }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        name,
        type,
        parentId: parentId || null,
        latitude: latitude || null,
        longitude: longitude || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Location",
        entityId: location.id,
        newData: { name, type, parentId },
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Location already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { locationId, isActive } = await req.json();
    if (!locationId) {
      return NextResponse.json({ error: "locationId required" }, { status: 400 });
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    const existing = await prisma.location.findUnique({ where: { id: locationId } });
    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const location = await prisma.location.update({
      where: { id: locationId },
      data: { isActive },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Location",
        entityId: locationId,
        oldData: { isActive: existing.isActive },
        newData: { isActive },
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Admin locations PATCH error:", error);
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}
