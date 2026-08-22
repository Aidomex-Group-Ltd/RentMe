export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Prisma.VerificationRequestWhereInput = {};
    if (status) where.status = status as Prisma.VerificationRequestWhereInput["status"];
    if (type) where.type = type as Prisma.VerificationRequestWhereInput["type"];

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
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { requestId, status, notes } = await req.json();
    if (!requestId || !status) {
      return NextResponse.json({ error: "requestId and status required" }, { status: 400 });
    }

    const allowedStatuses = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` }, { status: 400 });
    }

    const existingReq = await prisma.verificationRequest.findUnique({ where: { id: requestId } });
    if (!existingReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const request = await prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status,
        notes: notes ? notes.slice(0, 1000) : null,
        reviewedBy: auth.user.id,
        reviewedAt: new Date(),
      },
    });

    // Sync landlord/agent verification status when request is decided
    if (status === "VERIFIED" || status === "REJECTED") {
      const user = await prisma.user.findUnique({ where: { id: request.userId } });
      if (user?.role === "LANDLORD") {
        await prisma.landlord.updateMany({
          where: { userId: request.userId },
          data: {
            verificationStatus: status,
            ...(status === "VERIFIED"
              ? {
                  idVerifiedAt: new Date(),
                  idDocumentType: request.documentType || null,
                  idDocumentUrl: request.documentUrl || null,
                }
              : {}),
          },
        });
      } else if (user?.role === "AGENT") {
        await prisma.agent.updateMany({
          where: { userId: request.userId },
          data: {
            verificationStatus: status,
            ...(status === "VERIFIED"
              ? {
                  verifiedAt: new Date(),
                  businessRegNumber: request.documentType || null,
                  businessDocUrl: request.documentUrl || null,
                }
              : {}),
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
        userId: auth.user.id,
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
