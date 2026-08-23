import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireRole,
  requirePropertyAccess,
  isPropertyManager,
} from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { assertTenancyTransition } from "@/lib/tms-state-machine";

// GET /api/tenancies - List tenancies (filtered by role)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const role = auth.session.user.role;
    const where: any = {};

    // Tenant sees only their own tenancies
    if (role === "TENANT") {
      where.tenantId = auth.session.user.id;
    }

    // Landlord/Agent sees tenancies on their properties
    if (role === "LANDLORD" || role === "AGENT") {
      where.property = { userId: auth.session.user.id };
    }

    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;

    const [tenancies, total] = await Promise.all([
      prisma.tenancy.findMany({
        where,
        include: {
          property: {
            select: { id: true, title: true, rent: true, district: true, city: true },
          },
          unit: { select: { id: true, unitNumber: true } },
          tenant: { select: { id: true, name: true, avatar: true, email: true, phone: true } },
          leases: {
            where: { status: { in: ["ACTIVE", "EXPIRING"] } },
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { id: true, endDate: true, rentAmount: true, status: true },
          },
          _count: {
            select: {
              rentCharges: { where: { status: { in: ["PENDING", "OVERDUE"] } } },
              maintenanceRequests: { where: { status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.tenancy.count({ where }),
    ]);

    return NextResponse.json({
      tenancies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Tenancies fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch tenancies" }, { status: 500 });
  }
}

// POST /api/tenancies - Create a tenancy (landlord/agent only)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole("LANDLORD", "AGENT", "ADMIN");
    if (auth.error) return auth.error;

    const body = await req.json();
    const { propertyId, unitId, tenantId, moveInDate } = body;

    if (!propertyId || !tenantId) {
      return NextResponse.json(
        { error: "propertyId and tenantId are required" },
        { status: 400 }
      );
    }

    // Verify property access
    const access = await requirePropertyAccess(auth.session, propertyId);
    if (access.error) return access.error;

    // Verify tenant exists
    const tenant = await prisma.user.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check for conflicting active tenancy on the same unit
    if (unitId) {
      const conflict = await prisma.tenancy.findFirst({
        where: {
          unitId,
          status: { in: ["PENDING", "ACTIVE", "NOTICE_GIVEN"] },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Unit already has an active tenancy" },
          { status: 409 }
        );
      }
    }

    // Check tenant doesn't already have an active tenancy on this property
    const existingTenancy = await prisma.tenancy.findFirst({
      where: {
        propertyId,
        tenantId,
        status: { in: ["PENDING", "ACTIVE", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"] },
      },
    });
    if (existingTenancy) {
      return NextResponse.json(
        { error: "This tenant already has an active tenancy on this property" },
        { status: 409 }
      );
    }

    const tenancy = await prisma.tenancy.create({
      data: {
        propertyId,
        unitId: unitId || null,
        tenantId,
        moveInDate: moveInDate ? new Date(moveInDate) : null,
        status: "PENDING",
      },
    });

    // Update unit status if applicable
    if (unitId) {
      await prisma.unit.update({
        where: { id: unitId },
        data: { status: "RESERVED" },
      });
    }

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: tenantId,
        type: "APPLICATION_UPDATE",
        title: "Tenancy created",
        body: "A tenancy has been created for you. Please review and complete move-in.",
        link: `/dashboard/tenant`,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "TENANCY_CREATED",
        entity: "Tenancy",
        entityId: tenancy.id,
        newData: { propertyId, tenantId, unitId },
      },
    });

    return NextResponse.json({ tenancy }, { status: 201 });
  } catch (error) {
    console.error("Tenancy creation error:", error);
    return NextResponse.json(
      { error: "Failed to create tenancy" },
      { status: 500 }
    );
  }
}

// PATCH /api/tenancies - Update tenancy status
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { tenancyId, status } = body;

    if (!tenancyId || !status) {
      return NextResponse.json(
        { error: "tenancyId and status are required" },
        { status: 400 }
      );
    }

    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: {
        property: { select: { userId: true, agentId: true } },
      },
    });
    if (!tenancy) {
      return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
    }

    // Authorization: tenant can only update their own tenancy's limited statuses
    const role = auth.session.user.role;
    if (role === "TENANT") {
      if (tenancy.tenantId !== auth.session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Tenants can only give notice, not change other statuses
      if (!["NOTICE_GIVEN"].includes(status)) {
        return NextResponse.json(
          { error: "Tenants can only set status to NOTICE_GIVEN" },
          { status: 403 }
        );
      }
    } else if (!isPropertyManager(role) && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate transition
    assertTenancyTransition(tenancy.status, status);

    const updateData: Record<string, any> = { status };

    // Auto-set dates based on status
    if (status === "ACTIVE") {
      updateData.moveInDate = tenancy.moveInDate || new Date();
    } else if (status === "NOTICE_GIVEN") {
      updateData.noticeGivenAt = new Date();
      // Default 30-day notice period
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      updateData.noticeDeadline = deadline;
    } else if (status === "MOVE_OUT_SCHEDULED") {
      updateData.moveOutDate = body.moveOutDate ? new Date(body.moveOutDate) : null;
    } else if (status === "ENDED" || status === "TERMINATED") {
      updateData.moveOutDate = tenancy.moveOutDate || new Date();
    }

    const updated = await prisma.tenancy.update({
      where: { id: tenancyId },
      data: updateData,
    });

    // Update unit status if applicable
    if (tenancy.unitId) {
      if (status === "ACTIVE") {
        await prisma.unit.update({ where: { id: tenancy.unitId }, data: { status: "OCCUPIED" } });
      } else if (status === "ENDED" || status === "TERMINATED") {
        await prisma.unit.update({ where: { id: tenancy.unitId }, data: { status: "AVAILABLE" } });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "TENANCY_STATUS_CHANGED",
        entity: "Tenancy",
        entityId: tenancyId,
        oldData: { status: tenancy.status },
        newData: { status },
      },
    });

    return NextResponse.json({ tenancy: updated });
  } catch (error) {
    console.error("Tenancy update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update tenancy";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
