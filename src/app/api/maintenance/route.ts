import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requirePropertyAccess,
  requireMaintenanceAccess,
  isPropertyManager,
} from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { assertMaintenanceTransition } from "@/lib/tms-state-machine";

// GET /api/maintenance - List maintenance requests
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const tenancyId = searchParams.get("tenancyId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const role = auth.session.user.role;
    const where: any = {};

    if (role === "TENANT") {
      where.tenantId = auth.session.user.id;
    } else if (role === "LANDLORD" || role === "AGENT") {
      where.property = { userId: auth.session.user.id };
    } else if (role !== "ADMIN") {
      // Maintenance staff sees only assigned
      where.assignedToId = auth.session.user.id;
    }

    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (tenancyId) where.tenancyId = tenancyId;

    const [requests, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        include: {
          tenancy: {
            select: { id: true },
            include: {
              unit: { select: { unitNumber: true } },
              property: { select: { title: true } },
            },
          },
          tenant: { select: { id: true, name: true, avatar: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
          _count: { select: { updates: true } },
        },
        orderBy: [
          { priority: "asc" }, // URGENT first
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    // Summary stats for landlord/agent views
    let summary = null;
    if (isPropertyManager(role)) {
      const summaryWhere = { ...where };
      const [open, urgent, overdue] = await Promise.all([
        prisma.maintenanceRequest.count({
          where: {
            ...summaryWhere,
            status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
          },
        }),
        prisma.maintenanceRequest.count({
          where: {
            ...summaryWhere,
            priority: "URGENT",
            status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
          },
        }),
        prisma.maintenanceRequest.count({
          where: {
            ...summaryWhere,
            status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
            createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);
      summary = { open, urgent, overdue };
    }

    return NextResponse.json({
      requests,
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Maintenance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance requests" },
      { status: 500 }
    );
  }
}

// POST /api/maintenance - Submit a maintenance request (tenant)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const {
      tenancyId,
      title,
      description,
      category,
      priority,
      locationInUnit,
      preferredAccessTime,
      photos,
    } = body;

    if (!tenancyId || !title || !description) {
      return NextResponse.json(
        { error: "tenancyId, title, and description are required" },
        { status: 400 }
      );
    }

    // Verify tenancy access
    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { property: { select: { id: true, userId: true } } },
    });
    if (!tenancy) {
      return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
    }

    // Tenant can only submit for their own tenancy
    const role = auth.session.user.role;
    if (role === "TENANT" && tenancy.tenantId !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["PENDING", "ACTIVE", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"].includes(tenancy.status)) {
      return NextResponse.json(
        { error: "Cannot submit maintenance for an inactive tenancy" },
        { status: 409 }
      );
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        tenancyId,
        propertyId: tenancy.propertyId,
        tenantId: auth.session.user.id,
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 5000),
        category: category || null,
        priority: priority || "MEDIUM",
        locationInUnit: locationInUnit || null,
        preferredAccessTime: preferredAccessTime || null,
        photos: Array.isArray(photos) ? photos : [],
      },
    });

    // Notify landlord
    await prisma.notification.create({
      data: {
        userId: tenancy.property.userId,
        type: "NEW_MESSAGE",
        title: "New maintenance request",
        body: `A tenant reported: "${title}"`,
        link: `/dashboard/landlord`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "MAINTENANCE_SUBMITTED",
        entity: "MaintenanceRequest",
        entityId: request.id,
        newData: { title, category, priority },
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (error) {
    console.error("Maintenance submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit maintenance request" },
      { status: 500 }
    );
  }
}

// PATCH /api/maintenance - Update maintenance request
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { requestId, status, priority, assignedToId, internalNotes } = body;

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    const { allowed, request, error: accessError } = await requireMaintenanceAccess(
      auth.session,
      requestId
    );
    if (accessError) return accessError;
    if (!allowed || !request) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = auth.session.user.role;
    const updateData: Record<string, any> = {};

    // Status transition (landlord/agent/assigned only)
    if (status && status !== request.status) {
      if (role === "TENANT") {
        // Tenants can only close/acknowledge resolved requests
        if (!["CLOSED"].includes(status)) {
          return NextResponse.json(
            { error: "Tenants can only close resolved requests" },
            { status: 403 }
          );
        }
      }
      assertMaintenanceTransition(request.status, status);
      updateData.status = status;

      if (status === "RESOLVED") updateData.resolvedAt = new Date();
      if (status === "CLOSED") updateData.closedAt = new Date();
    }

    // Priority / assignment (landlord/agent only)
    if (isPropertyManager(role)) {
      if (priority) updateData.priority = priority;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
      if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    // Add timeline update
    if (status || priority) {
      await prisma.maintenanceUpdate.create({
        data: {
          maintenanceRequestId: requestId,
          authorId: auth.session.user.id,
          message: [
            status ? `Status changed to ${status}` : null,
            priority ? `Priority changed to ${priority}` : null,
          ]
            .filter(Boolean)
            .join("; "),
        },
      });
    }

    // Notify tenant of status change
    if (status) {
      await prisma.notification.create({
        data: {
          userId: request.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Maintenance update",
          body: `Your maintenance request "${request.title}" is now ${status.toLowerCase().replace(/_/g, " ")}.`,
          link: `/dashboard/tenant`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "MAINTENANCE_UPDATED",
        entity: "MaintenanceRequest",
        entityId: requestId,
        oldData: { status: request.status, priority: request.priority },
        newData: updateData,
      },
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("Maintenance update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update maintenance request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
