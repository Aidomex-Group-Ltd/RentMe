import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ALLOWED_VIEWING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "RESCHEDULED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const statusRaw = typeof body.status === "string" ? body.status : "";
    const responseNote = typeof body.responseNote === "string" ? body.responseNote : "";
    const date = body.date;
    const time = typeof body.time === "string" ? body.time : "";

    if (!statusRaw || !ALLOWED_VIEWING_STATUSES.includes(statusRaw as typeof ALLOWED_VIEWING_STATUSES[number])) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_VIEWING_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const viewing = await prisma.viewingRequest.findUnique({
      where: { id: params.id },
      include: { property: { select: { userId: true, title: true } } },
    });

    if (!viewing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only property owner or the tenant can update
    const isOwner = viewing.property.userId === session.user.id;
    const isTenant = viewing.tenantId === session.user.id;

    if (!isOwner && !isTenant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Tenants can only cancel; owners can set any status
    if (isTenant && statusRaw !== "CANCELLED") {
      return NextResponse.json({ error: "Tenants can only cancel viewing requests" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { status: statusRaw, responderId: session.user.id };
    if (responseNote) updateData.responseNote = responseNote.slice(0, 1000);
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = time;

    const updated = await prisma.viewingRequest.update({
      where: { id: params.id },
      data: updateData,
    });

    // Notify the relevant party
    const notifyUserId = isOwner ? viewing.tenantId : viewing.property.userId;
    const statusMessages: Record<string, string> = {
      CONFIRMED: "Your viewing has been confirmed",
      RESCHEDULED: "Your viewing has been rescheduled",
      CANCELLED: "Your viewing has been cancelled",
      COMPLETED: "Your viewing has been marked as completed",
      NO_SHOW: "Your viewing has been marked as no-show",
    };

    if (statusMessages[statusRaw]) {
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: statusRaw === "CONFIRMED" ? "VIEWING_CONFIRMATION" : "VIEWING_CANCELLED",
          title: `Viewing ${statusRaw.toLowerCase()}`,
          body: statusMessages[statusRaw],
          link: `/viewings`,
        },
      });
    }

    return NextResponse.json({ viewing: updated });
  } catch (error) {
    console.error("Viewing update error:", error);
    return NextResponse.json(
      { error: "Failed to update viewing" },
      { status: 500 }
    );
  }
}
