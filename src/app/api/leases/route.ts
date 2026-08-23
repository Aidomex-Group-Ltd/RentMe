import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireRole,
  requireLeaseAccess,
  isPropertyManager,
} from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { assertLeaseTransition } from "@/lib/tms-state-machine";

// GET /api/leases - List leases (filtered by role)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const tenancyId = searchParams.get("tenancyId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const role = auth.session.user.role;
    const where: any = {};

    if (role === "TENANT") {
      where.tenancy = { tenantId: auth.session.user.id };
    } else if (role === "LANDLORD" || role === "AGENT") {
      where.property = { userId: auth.session.user.id };
    }

    if (tenancyId) where.tenancyId = tenancyId;
    if (status) where.status = status;

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        include: {
          tenancy: {
            include: {
              tenant: { select: { id: true, name: true, avatar: true } },
              unit: { select: { id: true, unitNumber: true } },
            },
          },
          property: { select: { id: true, title: true, district: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.lease.count({ where }),
    ]);

    return NextResponse.json({
      leases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Leases fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch leases" }, { status: 500 });
  }
}

// POST /api/leases - Create a lease (landlord/agent only)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole("LANDLORD", "AGENT", "ADMIN");
    if (auth.error) return auth.error;

    const body = await req.json();
    const {
      tenancyId,
      startDate,
      endDate,
      rentAmount,
      depositAmount,
      paymentFrequency,
      gracePeriodDays,
      noticePeriodDays,
    } = body;

    if (!tenancyId || !startDate || !endDate || rentAmount === undefined) {
      return NextResponse.json(
        { error: "tenancyId, startDate, endDate, and rentAmount are required" },
        { status: 400 }
      );
    }

    // Verify tenancy access
    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { property: { select: { userId: true, agentId: true } } },
    });
    if (!tenancy) {
      return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
    }

    if (
      tenancy.property.userId !== auth.session.user.id &&
      tenancy.property.agentId !== auth.session.user.id &&
      auth.session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "endDate must be after startDate" },
        { status: 400 }
      );
    }

    // Validate rent amount
    if (typeof rentAmount !== "number" || rentAmount < 0) {
      return NextResponse.json(
        { error: "rentAmount must be a non-negative number" },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.create({
      data: {
        tenancyId,
        propertyId: tenancy.propertyId,
        unitId: tenancy.unitId,
        startDate: start,
        endDate: end,
        rentAmount: Math.round(rentAmount),
        depositAmount: depositAmount ? Math.round(depositAmount) : null,
        paymentFrequency: paymentFrequency || "MONTHLY",
        gracePeriodDays: gracePeriodDays ?? 0,
        noticePeriodDays: noticePeriodDays ?? 30,
        status: "DRAFT",
      },
    });

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: tenancy.tenantId,
        type: "APPLICATION_UPDATE",
        title: "New lease created",
        body: "A new lease has been prepared for your tenancy. Please review it.",
        link: `/dashboard/tenant`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "LEASE_CREATED",
        entity: "Lease",
        entityId: lease.id,
        newData: { tenancyId, rentAmount, startDate, endDate },
      },
    });

    return NextResponse.json({ lease }, { status: 201 });
  } catch (error) {
    console.error("Lease creation error:", error);
    return NextResponse.json({ error: "Failed to create lease" }, { status: 500 });
  }
}

// PATCH /api/leases - Update lease status / terms
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { leaseId, status, ...updates } = body;

    if (!leaseId) {
      return NextResponse.json({ error: "leaseId is required" }, { status: 400 });
    }

    const { allowed, lease, error: accessError } = await requireLeaseAccess(auth.session, leaseId);
    if (accessError) return accessError;
    if (!allowed || !lease) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Status transition
    if (status && status !== lease.status) {
      assertLeaseTransition(lease.status, status);

      // Only property managers can activate leases
      if (status === "ACTIVE" && !isPropertyManager(auth.session.user.role)) {
        return NextResponse.json(
          { error: "Only landlords/agents can activate leases" },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (updates.rentAmount !== undefined) updateData.rentAmount = Math.round(updates.rentAmount);
    if (updates.depositAmount !== undefined) updateData.depositAmount = updates.depositAmount ? Math.round(updates.depositAmount) : null;
    if (updates.paymentFrequency) updateData.paymentFrequency = updates.paymentFrequency;
    if (updates.gracePeriodDays !== undefined) updateData.gracePeriodDays = updates.gracePeriodDays;
    if (updates.noticePeriodDays !== undefined) updateData.noticePeriodDays = updates.noticePeriodDays;
    if (updates.documentUrl) updateData.documentUrl = updates.documentUrl;
    if (updates.renewalRent !== undefined) updateData.renewalRent = updates.renewalRent;
    if (updates.renewalTerms) updateData.renewalTerms = updates.renewalTerms;

    // Tenant signing
    if (status === "ACTIVE" && auth.session.user.role === "TENANT") {
      updateData.signedAt = new Date();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const updated = await prisma.lease.update({
      where: { id: leaseId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "LEASE_UPDATED",
        entity: "Lease",
        entityId: leaseId,
        oldData: { status: lease.status },
        newData: updateData,
      },
    });

    return NextResponse.json({ lease: updated });
  } catch (error) {
    console.error("Lease update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update lease";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
