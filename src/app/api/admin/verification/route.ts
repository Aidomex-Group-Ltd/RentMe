import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [requests, total] = await Promise.all([
      prisma.verificationRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, role: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.verificationRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { requestId, status, notes } = await req.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status required" }, { status: 400 });
    }

    const request = await prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status,
        notes: notes || null,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // If approved, update the user's landlord/agent verification status
    if (status === "VERIFIED") {
      const user = await prisma.user.findUnique({ where: { id: request.userId } });
      if (user?.role === "LANDLORD") {
        await prisma.landlord.update({
          where: { userId: request.userId },
          data: {
            verificationStatus: "VERIFIED",
            idVerifiedAt: new Date(),
            idDocumentType: request.documentType || null,
            idDocumentUrl: request.documentUrl || null,
          },
        });
      } else if (user?.role === "AGENT") {
        await prisma.agent.update({
          where: { userId: request.userId },
          data: {
            verificationStatus: "VERIFIED",
            verifiedAt: new Date(),
            businessRegNumber: request.documentType || null,
            businessDocUrl: request.documentUrl || null,
          },
        });
      }
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: request.userId,
        type: "ACCOUNT_VERIFICATION",
        title: `Verification ${status.toLowerCase()}`,
        body:
          status === "VERIFIED"
            ? "Your identity has been verified successfully."
            : `Your verification request was ${status.toLowerCase()}${notes ? `: ${notes}` : ""}.`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "VerificationRequest",
        entityId: requestId,
        newData: { status, notes },
      },
    });

    return NextResponse.json({ request });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
