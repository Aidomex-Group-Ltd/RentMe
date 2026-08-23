import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenancyAccess, isPropertyManager } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { tenancyAfterMoveIn, assertTenancyTransition } from "@/lib/tms-state-machine";

// GET /api/move-in - Get move-in record for a tenancy
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const tenancyId = searchParams.get("tenancyId");
    if (!tenancyId) {
      return NextResponse.json({ error: "tenancyId is required" }, { status: 400 });
    }

    const { allowed, error: accessError } = await requireTenancyAccess(auth.session, tenancyId);
    if (accessError) return accessError;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const record = await prisma.moveInRecord.findUnique({
      where: { tenancyId },
      include: {
        inspector: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ record: record || null });
  } catch (error) {
    console.error("Move-in fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch move-in record" }, { status: 500 });
  }
}

// POST /api/move-in - Create/update move-in record
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { tenancyId, scheduledDate, checklistData, photos, meterReadings, conditionNotes } = body;

    if (!tenancyId) {
      return NextResponse.json({ error: "tenancyId is required" }, { status: 400 });
    }

    const { allowed, tenancy, error: accessError } = await requireTenancyAccess(
      auth.session,
      tenancyId
    );
    if (accessError) return accessError;
    if (!allowed || !tenancy) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.moveInRecord.findUnique({ where: { tenancyId } });

    let record;
    if (existing) {
      // Update
      const updateData: Record<string, any> = {};
      if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
      if (checklistData) updateData.checklistData = checklistData;
      if (photos) updateData.photos = photos;
      if (meterReadings) updateData.meterReadings = meterReadings;
      if (conditionNotes) updateData.conditionNotes = conditionNotes;

      record = await prisma.moveInRecord.update({
        where: { tenancyId },
        data: updateData,
      });
    } else {
      // Create
      record = await prisma.moveInRecord.create({
        data: {
          tenancyId,
          inspectorId: auth.session.user.id,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          checklistData: checklistData || null,
          photos: photos || [],
          meterReadings: meterReadings || null,
          conditionNotes: conditionNotes || null,
        },
      });
    }

    return NextResponse.json({ record }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Move-in save error:", error);
    return NextResponse.json({ error: "Failed to save move-in record" }, { status: 500 });
  }
}

// PATCH /api/move-in - Confirm or complete move-in
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { tenancyId, action } = body; // action: "confirm" or "complete"

    if (!tenancyId || !action) {
      return NextResponse.json(
        { error: "tenancyId and action are required" },
        { status: 400 }
      );
    }

    const { allowed, tenancy, error: accessError } = await requireTenancyAccess(
      auth.session,
      tenancyId
    );
    if (accessError) return accessError;
    if (!allowed || !tenancy) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const record = await prisma.moveInRecord.findUnique({ where: { tenancyId } });
    if (!record) {
      return NextResponse.json({ error: "No move-in record found" }, { status: 404 });
    }

    if (action === "confirm") {
      // Tenant confirms move-in
      if (tenancy.tenantId !== auth.session.user.id) {
        return NextResponse.json(
          { error: "Only the tenant can confirm move-in" },
          { status: 403 }
        );
      }

      await prisma.moveInRecord.update({
        where: { tenancyId },
        data: { tenantConfirmed: true, confirmedAt: new Date() },
      });
    } else if (action === "complete") {
      // Landlord/agent completes move-in
      if (!isPropertyManager(auth.session.user.role)) {
        return NextResponse.json(
          { error: "Only landlords/agents can complete move-in" },
          { status: 403 }
        );
      }

      if (!record.tenantConfirmed) {
        return NextResponse.json(
          { error: "Tenant must confirm move-in first" },
          { status: 409 }
        );
      }

      await prisma.moveInRecord.update({
        where: { tenancyId },
        data: { completedAt: new Date() },
      });

      // Transition tenancy to ACTIVE
      if (tenancy.status === "PENDING") {
        assertTenancyTransition(tenancy.status, "ACTIVE");
        await prisma.tenancy.update({
          where: { id: tenancyId },
          data: { status: "ACTIVE", moveInDate: new Date() },
        });

        // Update unit status
        if (tenancy.unitId) {
          await prisma.unit.update({
            where: { id: tenancy.unitId },
            data: { status: "OCCUPIED" },
          });
        }
      }

      // Notify tenant
      await prisma.notification.create({
        data: {
          userId: tenancy.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Move-in complete",
          body: "Your move-in has been completed. Welcome to your new home!",
          link: `/dashboard/tenant`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: `MOVE_IN_${action.toUpperCase()}`,
        entity: "MoveInRecord",
        entityId: tenancyId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Move-in action error:", error);
    const message = error instanceof Error ? error.message : "Failed to process move-in";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
