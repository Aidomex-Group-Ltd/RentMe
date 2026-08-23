import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenancyAccess, isPropertyManager } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { tenancyAfterMoveOut, assertTenancyTransition } from "@/lib/tms-state-machine";

// GET /api/move-out - Get move-out record for a tenancy
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

    const record = await prisma.moveOutRecord.findUnique({
      where: { tenancyId },
      include: {
        inspector: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ record: record || null });
  } catch (error) {
    console.error("Move-out fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch move-out record" }, { status: 500 });
  }
}

// POST /api/move-out - Create/update move-out record
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const {
      tenancyId,
      expectedMoveOut,
      checklistData,
      photos,
      damageAssessment,
      outstandingRent,
      damageCharges,
      finalNotes,
    } = body;

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

    const existing = await prisma.moveOutRecord.findUnique({ where: { tenancyId } });

    let record;
    if (existing) {
      const updateData: Record<string, any> = {};
      if (expectedMoveOut) updateData.expectedMoveOut = new Date(expectedMoveOut);
      if (checklistData) updateData.checklistData = checklistData;
      if (photos) updateData.photos = photos;
      if (damageAssessment) updateData.damageAssessment = damageAssessment;
      if (outstandingRent !== undefined) updateData.outstandingRent = outstandingRent;
      if (damageCharges !== undefined) updateData.damageCharges = damageCharges;
      if (finalNotes) updateData.finalNotes = finalNotes;

      record = await prisma.moveOutRecord.update({
        where: { tenancyId },
        data: updateData,
      });
    } else {
      record = await prisma.moveOutRecord.create({
        data: {
          tenancyId,
          inspectorId: auth.session.user.id,
          noticeGivenAt: tenancy.noticeGivenAt,
          expectedMoveOut: expectedMoveOut ? new Date(expectedMoveOut) : null,
          checklistData: checklistData || null,
          photos: photos || [],
          damageAssessment: damageAssessment || null,
          outstandingRent: outstandingRent || 0,
          damageCharges: damageCharges || 0,
          finalNotes: finalNotes || null,
        },
      });
    }

    return NextResponse.json({ record }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Move-out save error:", error);
    return NextResponse.json({ error: "Failed to save move-out record" }, { status: 500 });
  }
}

// PATCH /api/move-out - Confirm or complete move-out
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { tenancyId, action } = body;

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

    const record = await prisma.moveOutRecord.findUnique({ where: { tenancyId } });
    if (!record) {
      return NextResponse.json({ error: "No move-out record found" }, { status: 404 });
    }

    if (action === "confirm") {
      // Tenant confirms move-out details
      if (tenancy.tenantId !== auth.session.user.id) {
        return NextResponse.json(
          { error: "Only the tenant can confirm move-out" },
          { status: 403 }
        );
      }

      // Calculate deposit settlement
      const lease = await prisma.lease.findFirst({
        where: { tenancyId, status: { in: ["ACTIVE", "EXPIRING", "TERMINATED"] } },
        orderBy: { endDate: "desc" },
      });

      const depositAmount = lease?.depositAmount || 0;
      const totalDeductions = record.damageCharges + record.outstandingRent;
      const refund = Math.max(0, depositAmount - totalDeductions);

      await prisma.moveOutRecord.update({
        where: { tenancyId },
        data: {
          tenantConfirmed: true,
          confirmedAt: new Date(),
          depositDeductions: totalDeductions,
          depositRefund: refund,
        },
      });
    } else if (action === "complete") {
      // Landlord/agent completes move-out
      if (!isPropertyManager(auth.session.user.role)) {
        return NextResponse.json(
          { error: "Only landlords/agents can complete move-out" },
          { status: 403 }
        );
      }

      if (!record.tenantConfirmed) {
        return NextResponse.json(
          { error: "Tenant must confirm move-out details first" },
          { status: 409 }
        );
      }

      await prisma.moveOutRecord.update({
        where: { tenancyId },
        data: { completedAt: new Date(), actualMoveOut: new Date() },
      });

      // Transition tenancy to ENDED
      if (["ACTIVE", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"].includes(tenancy.status)) {
        assertTenancyTransition(tenancy.status, "ENDED");
        await prisma.tenancy.update({
          where: { id: tenancyId },
          data: { status: "ENDED", moveOutDate: new Date() },
        });

        // Release unit
        if (tenancy.unitId) {
          await prisma.unit.update({
            where: { id: tenancy.unitId },
            data: { status: "AVAILABLE" },
          });
        }
      }

      // Notify tenant
      await prisma.notification.create({
        data: {
          userId: tenancy.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Move-out complete",
          body: `Your move-out has been completed. Deposit refund: UGX ${(record.depositRefund || 0).toLocaleString()}.`,
          link: `/dashboard/tenant`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: `MOVE_OUT_${action.toUpperCase()}`,
        entity: "MoveOutRecord",
        entityId: tenancyId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Move-out action error:", error);
    const message = error instanceof Error ? error.message : "Failed to process move-out";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
