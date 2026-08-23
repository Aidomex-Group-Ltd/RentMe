import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePropertyAccess, isPropertyManager } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { assertUnitTransition } from "@/lib/tms-state-machine";

// GET /api/properties/[id]/units - List units for a property
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const access = await requirePropertyAccess(auth.session, params.id);
    if (access.error) return access.error;

    const units = await prisma.unit.findMany({
      where: { propertyId: params.id },
      include: {
        _count: {
          select: {
            tenancies: { where: { status: { in: ["PENDING", "ACTIVE", "NOTICE_GIVEN"] } } },
          },
        },
      },
      orderBy: { unitNumber: "asc" },
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error("Units fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}

// POST /api/properties/[id]/units - Create a unit
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    if (!isPropertyManager(auth.session.user.role)) {
      return NextResponse.json(
        { error: "Only landlords, agents, or admins can create units" },
        { status: 403 }
      );
    }

    const access = await requirePropertyAccess(auth.session, params.id);
    if (access.error) return access.error;

    const body = await req.json();
    const unitNumber = typeof body.unitNumber === "string" ? body.unitNumber.trim() : "";
    if (!unitNumber) {
      return NextResponse.json({ error: "unitNumber is required" }, { status: 400 });
    }

    // Check for duplicate unit number
    const existing = await prisma.unit.findUnique({
      where: { propertyId_unitNumber: { propertyId: params.id, unitNumber } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Unit "${unitNumber}" already exists for this property` },
        { status: 409 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        propertyId: params.id,
        unitNumber,
        unitType: body.unitType || null,
        bedrooms: body.bedrooms ?? null,
        bathrooms: body.bathrooms ?? null,
        rent: body.rent ?? null,
        deposit: body.deposit ?? null,
        amenities: Array.isArray(body.amenities) ? body.amenities : [],
        notes: body.notes || null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "UNIT_CREATED",
        entity: "Unit",
        entityId: unit.id,
        newData: unit,
      },
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    console.error("Unit creation error:", error);
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
  }
}

// PATCH /api/properties/[id]/units - Update a unit (unitId in body)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    if (!isPropertyManager(auth.session.user.role)) {
      return NextResponse.json(
        { error: "Only landlords, agents, or admins can update units" },
        { status: 403 }
      );
    }

    const access = await requirePropertyAccess(auth.session, params.id);
    if (access.error) return access.error;

    const body = await req.json();
    const unitId = typeof body.unitId === "string" ? body.unitId.trim() : "";
    if (!unitId) {
      return NextResponse.json({ error: "unitId is required" }, { status: 400 });
    }

    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit || unit.propertyId !== params.id) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Status transition check
    if (body.status && body.status !== unit.status) {
      assertUnitTransition(unit.status, body.status);
    }

    const updateData: Record<string, any> = {};
    if (body.unitType !== undefined) updateData.unitType = body.unitType;
    if (body.bedrooms !== undefined) updateData.bedrooms = body.bedrooms;
    if (body.bathrooms !== undefined) updateData.bathrooms = body.bathrooms;
    if (body.rent !== undefined) updateData.rent = body.rent;
    if (body.deposit !== undefined) updateData.deposit = body.deposit;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.amenities !== undefined) updateData.amenities = body.amenities;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const updated = await prisma.unit.update({ where: { id: unitId }, data: updateData });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "UNIT_UPDATED",
        entity: "Unit",
        entityId: unitId,
        oldData: unit,
        newData: updated,
      },
    });

    return NextResponse.json({ unit: updated });
  } catch (error) {
    console.error("Unit update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update unit";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/properties/[id]/units - Soft-disable a unit
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    if (!isPropertyManager(auth.session.user.role)) {
      return NextResponse.json(
        { error: "Only landlords, agents, or admins can delete units" },
        { status: 403 }
      );
    }

    const access = await requirePropertyAccess(auth.session, params.id);
    if (access.error) return access.error;

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    if (!unitId) {
      return NextResponse.json({ error: "unitId query param is required" }, { status: 400 });
    }

    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit || unit.propertyId !== params.id) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Cannot delete an occupied unit
    if (unit.status === "OCCUPIED") {
      return NextResponse.json(
        { error: "Cannot delete a unit with an active tenancy" },
        { status: 409 }
      );
    }

    await prisma.unit.delete({ where: { id: unitId } });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "UNIT_DELETED",
        entity: "Unit",
        entityId: unitId,
        oldData: unit,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unit delete error:", error);
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
  }
}
