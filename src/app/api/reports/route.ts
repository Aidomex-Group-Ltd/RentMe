export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/reports - Submit a report
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, subjectId, reason, description } = await req.json();

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        propertyId: propertyId || null,
        subjectId: subjectId || null,
        reason,
        description: description || null,
      },
    });

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
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (reason) where.reason = reason;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, name: true, email: true },
          },
          property: {
            select: { id: true, title: true, district: true, slug: true },
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
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const reportId = typeof body.reportId === "string" ? body.reportId : "";
    const status = body.status as string | undefined;
    const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes : undefined;

    const allowed = ["PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"];
    if (!reportId || !status || !allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid report update" }, { status: 400 });
    }

    const existing = await prisma.report.findUnique({ where: { id: reportId } });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: status as "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED",
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(status === "RESOLVED" || status === "DISMISSED"
          ? { resolvedBy: session.user.id, resolvedAt: new Date() }
          : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Report",
        entityId: reportId,
        oldData: { status: existing.status },
        newData: { status, adminNotes },
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Reports PATCH error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
