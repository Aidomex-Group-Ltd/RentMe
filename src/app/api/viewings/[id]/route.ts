import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, responseNote, date, time } = await req.json();

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

    const updateData: any = { status };
    if (responseNote) updateData.responseNote = responseNote;
    if (date) updateData.date = new Date(date);
    if (time) updateData.time = time;
    updateData.responderId = session.user.id;

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

    if (statusMessages[status]) {
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: status === "CONFIRMED" ? "VIEWING_CONFIRMATION" : "VIEWING_CANCELLED",
          title: `Viewing ${status.toLowerCase()}`,
          body: statusMessages[status],
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
