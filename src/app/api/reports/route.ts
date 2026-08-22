export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import {
  areReportsEnabled,
  applyAdminPropertyAction,
  descriptionRequired,
  isReportReason,
  minDescriptionLength,
  notifyAdminsOfNewReport,
  REPORT_SEVERITY,
  syncPropertyFlagState,
} from "@/lib/flagging";

const OPEN_STATUSES = ["PENDING", "UNDER_REVIEW"] as const;

// POST /api/reports - Submit a report
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await areReportsEnabled())) {
      return NextResponse.json(
        { error: "Reporting is temporarily disabled" },
        { status: 403 }
      );
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const propertyId = typeof payload.propertyId === "string" ? payload.propertyId.trim() : "";
    const subjectId = typeof payload.subjectId === "string" ? payload.subjectId.trim() : "";
    const reasonRaw = payload.reason;
    const description =
      typeof payload.description === "string" ? payload.description.trim() : "";

    if (!isReportReason(reasonRaw)) {
      return NextResponse.json({ error: "Please select a valid reason" }, { status: 400 });
    }

    if (!propertyId && !subjectId) {
      return NextResponse.json(
        { error: "A property or user is required to file a report" },
        { status: 400 }
      );
    }

    const minLen = minDescriptionLength(reasonRaw);
    if (descriptionRequired(reasonRaw) && description.length < minLen) {
      return NextResponse.json(
        {
          error: `Please add more detail (at least ${minLen} characters) so we can investigate`,
        },
        { status: 400 }
      );
    }

    const reporter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, status: true },
    });
    if (!reporter || reporter.status === "BANNED" || reporter.status === "SUSPENDED") {
      return NextResponse.json({ error: "Your account cannot submit reports" }, { status: 403 });
    }

    const property = propertyId
      ? await prisma.property.findFirst({
          where: { id: propertyId, deletedAt: null },
          select: { id: true, title: true, userId: true, slug: true },
        })
      : null;

    if (propertyId && !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property && property.userId === session.user.id) {
      return NextResponse.json({ error: "You cannot report your own listing" }, { status: 400 });
    }

    const resolvedSubjectId = subjectId || property?.userId || null;
    if (resolvedSubjectId === session.user.id) {
      return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
    }

    if (resolvedSubjectId) {
      const subject = await prisma.user.findUnique({
        where: { id: resolvedSubjectId },
        select: { id: true },
      });
      if (!subject) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    const duplicate = await prisma.report.findFirst({
      where: {
        reporterId: session.user.id,
        status: { in: [...OPEN_STATUSES] },
        ...(property
          ? { propertyId: property.id }
          : { subjectId: resolvedSubjectId, propertyId: null }),
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "You already have an open report on this" },
        { status: 409 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        propertyId: property?.id ?? null,
        subjectId: resolvedSubjectId,
        reason: reasonRaw,
        description: description || null,
      },
    });

    if (property) {
      await syncPropertyFlagState(property.id);
    }

    void notifyAdminsOfNewReport({
      reason: reasonRaw,
      propertyTitle: property?.title ?? null,
      reporterName: reporter.name,
    }).catch((error) => console.error("Report admin notify failed:", error));

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Report creation error:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

// GET /api/reports - List reports (admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (reason && isReportReason(reason)) where.reason = reason;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, name: true, email: true, phoneVerified: true },
          },
          property: {
            select: {
              id: true,
              title: true,
              district: true,
              slug: true,
              status: true,
              isFlagged: true,
              flagReason: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// PATCH /api/reports - Resolve / dismiss / review (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const reportId = typeof body.reportId === "string" ? body.reportId : "";
    const status = body.status as string | undefined;
    const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes : undefined;
    const propertyActionRaw = body.propertyAction;
    const propertyAction =
      propertyActionRaw === "suspend" ||
      propertyActionRaw === "restore" ||
      propertyActionRaw === "none"
        ? propertyActionRaw
        : undefined;

    const allowed = ["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
    if (!reportId || !status || !allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid report update" }, { status: 400 });
    }

    const existing = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        property: { select: { id: true, status: true, isFlagged: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED",
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(status === "RESOLVED" || status === "DISMISSED"
          ? { resolvedBy: auth.user.id, resolvedAt: new Date() }
          : {}),
      },
    });

    if (existing.propertyId) {
      const severity = isReportReason(existing.reason)
        ? REPORT_SEVERITY[existing.reason]
        : "LOW";
      const defaultAction =
        status === "RESOLVED" &&
        severity === "HIGH" &&
        existing.property?.status !== "SUSPENDED"
          ? "suspend"
          : "none";
      const action = propertyAction ?? defaultAction;

      if (action === "suspend" || action === "restore") {
        await applyAdminPropertyAction(existing.propertyId, action, {
          reason: existing.reason,
        });
      } else {
        await syncPropertyFlagState(existing.propertyId);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: "UPDATE",
        entity: "Report",
        entityId: reportId,
        oldData: { status: existing.status },
        newData: { status, adminNotes, propertyAction: propertyAction ?? null },
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Reports PATCH error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
