export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const parentId = searchParams.get("parentId") || "";
    const q = searchParams.get("q") || "";

    const where: Prisma.LocationWhereInput = {};
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
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const name = typeof body.name === "string" ? sanitizeText(body.name.trim(), 200) : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";
    const parentId = typeof body.parentId === "string" ? body.parentId.trim() : null;
    const latitude = typeof body.latitude === "number" ? body.latitude : null;
    const longitude = typeof body.longitude === "number" ? body.longitude : null;

    if (!name || !type) {
      return NextResponse.json({ error: "name and type required" }, { status: 400 });
    }

    if (latitude != null && (latitude < -90 || latitude > 90)) {
      return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
    }
    if (longitude != null && (longitude < -180 || longitude > 180)) {
      return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
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
        userId: auth.user.id,
        action: "CREATE",
        entity: "Location",
        entityId: location.id,
        newData: { name, type, parentId },
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("P2002")) {
      return NextResponse.json({ error: "Location already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const locationId = typeof body.locationId === "string" ? body.locationId : "";
    const isActive = body.isActive;

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
        userId: auth.user.id,
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
