import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireRole,
  requirePropertyAccess,
  isPropertyManager,
} from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { assertApplicationTransition } from "@/lib/tms-state-machine";

// GET /api/applications/[id] - Get application details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        property: {
          select: {
            id: true, title: true, rent: true, district: true, city: true,
            bedrooms: true, bathrooms: true, propertyType: true,
            userId: true,
          },
        },
        tenant: {
          select: { id: true, name: true, avatar: true, email: true, phone: true },
        },
        unit: { select: { id: true, unitNumber: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Authorization: tenant can see their own; landlord/agent can see applications on their properties
    const role = auth.session.user.role;
    if (role === "TENANT" && application.tenantId !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isPropertyManager(role) && application.property.userId !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error("Application fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
  }
}

// PATCH /api/applications/[id] - Update application status (review/approve/reject/withdraw)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { status, reviewNotes, unitId } = body;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        property: { select: { id: true, userId: true, title: true, rent: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const role = auth.session.user.role;

    // Tenant can only withdraw their own application
    if (role === "TENANT") {
      if (application.tenantId !== auth.session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (status !== "WITHDRAWN") {
        return NextResponse.json(
          { error: "Tenants can only withdraw applications" },
          { status: 403 }
        );
      }
    } else if (isPropertyManager(role)) {
      if (application.property.userId !== auth.session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate state transition
    assertApplicationTransition(application.status, status);

    const updateData: Record<string, any> = {
      status,
      reviewNotes: reviewNotes || null,
      reviewedAt: new Date(),
    };

    if (unitId) {
      updateData.unitId = unitId;
    }

    const updated = await prisma.application.update({
      where: { id: params.id },
      data: updateData,
    });

    // On APPROVAL: create tenancy + lease skeleton
    if (status === "APPROVED") {
      const tenancy = await prisma.tenancy.create({
        data: {
          propertyId: application.propertyId,
          unitId: unitId || null,
          tenantId: application.tenantId,
          status: "PENDING",
          moveInDate: application.preferredMoveIn,
        },
      });

      // Link tenancy back to application
      await prisma.application.update({
        where: { id: params.id },
        data: { tenancyId: tenancy.id },
      });

      // Update unit status
      if (unitId) {
        await prisma.unit.update({
          where: { id: unitId },
          data: { status: "RESERVED" },
        });
      }

      // Notify tenant
      await prisma.notification.create({
        data: {
          userId: application.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Application approved!",
          body: `Your application for "${application.property.title}" has been approved. A tenancy has been created.`,
          link: `/dashboard/tenant`,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: auth.session.user.id,
          action: "APPLICATION_APPROVED",
          entity: "Application",
          entityId: params.id,
          newData: { tenancyId: tenancy.id, unitId },
        },
      });
    } else if (status === "REJECTED") {
      // Notify tenant
      await prisma.notification.create({
        data: {
          userId: application.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Application update",
          body: `Your application for "${application.property.title}" was not successful.`,
          link: `/dashboard/tenant`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: `APPLICATION_${status}`,
        entity: "Application",
        entityId: params.id,
        oldData: { status: application.status },
        newData: { status, reviewNotes },
      },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Application update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update application";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
