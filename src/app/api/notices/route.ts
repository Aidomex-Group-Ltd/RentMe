import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireRole,
  requireTenancyAccess,
  isPropertyManager,
} from "@/lib/rbac";
import prisma from "@/lib/prisma";

// GET /api/notices - List notices
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const tenancyId = searchParams.get("tenancyId");
    const type = searchParams.get("type");
    const unreadOnly = searchParams.get("unread") === "true";

    const role = auth.session.user.role;
    const where: any = {};

    // Tenant sees notices sent to them
    if (role === "TENANT") {
      where.recipientId = auth.session.user.id;
    } else if (role === "LANDLORD" || role === "AGENT") {
      where.senderId = auth.session.user.id;
    } else if (role === "ADMIN") {
      // Admins can see all
    }

    if (tenancyId) where.tenancyId = tenancyId;
    if (type) where.type = type;
    if (unreadOnly) where.isRead = false;

    const notices = await prisma.notice.findMany({
      where,
      include: {
        tenancy: {
          select: {
            id: true,
            property: { select: { title: true } },
            unit: { select: { unitNumber: true } },
          },
        },
        sender: { select: { id: true, name: true, avatar: true } },
        recipient: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Unread count
    const unreadCount = await prisma.notice.count({
      where: {
        recipientId: auth.session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({ notices, unreadCount });
  } catch (error) {
    console.error("Notices fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch notices" }, { status: 500 });
  }
}

// POST /api/notices - Send a notice (landlord/agent only)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole("LANDLORD", "AGENT", "ADMIN");
    if (auth.error) return auth.error;

    const body = await req.json();
    const { tenancyId, recipientId, type, subject, message, attachmentUrl } = body;

    if (!tenancyId || !recipientId || !subject || !message) {
      return NextResponse.json(
        { error: "tenancyId, recipientId, subject, and message are required" },
        { status: 400 }
      );
    }

    // Verify tenancy access
    const { allowed, tenancy, error: accessError } = await requireTenancyAccess(
      auth.session,
      tenancyId
    );
    if (accessError) return accessError;
    if (!allowed || !tenancy) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notice = await prisma.notice.create({
      data: {
        tenancyId,
        propertyId: tenancy.propertyId,
        senderId: auth.session.user.id,
        recipientId,
        type: type || "GENERAL_ANNOUNCEMENT",
        subject: subject.trim().slice(0, 200),
        message: message.trim().slice(0, 5000),
        attachmentUrl: attachmentUrl || null,
      },
    });

    // Notify recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "APPLICATION_UPDATE",
        title: subject.slice(0, 100),
        body: `New notice from ${auth.session.user.name || "your landlord"}`,
        link: `/dashboard/tenant`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "NOTICE_SENT",
        entity: "Notice",
        entityId: notice.id,
        newData: { tenancyId, recipientId, type, subject },
      },
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error("Notice creation error:", error);
    return NextResponse.json({ error: "Failed to send notice" }, { status: 500 });
  }
}

// PATCH /api/notices - Mark notice as read
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { noticeId } = body;

    if (!noticeId) {
      return NextResponse.json({ error: "noticeId is required" }, { status: 400 });
    }

    const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
    if (!notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    // Only the recipient can mark as read
    if (notice.recipientId !== auth.session.user.id && auth.session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.notice.update({
      where: { id: noticeId },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ notice: updated });
  } catch (error) {
    console.error("Notice update error:", error);
    return NextResponse.json({ error: "Failed to update notice" }, { status: 500 });
  }
}
