export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, USER_SAFE_SELECT } from "@/lib/admin";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }
    if (role) where.role = role as Prisma.UserWhereInput["role"];
    if (status) where.status = status as Prisma.UserWhereInput["status"];

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...USER_SAFE_SELECT,
          landlord: { select: { verificationStatus: true, totalListings: true } },
          agent: { select: { verificationStatus: true, totalProperties: true } },
          tenant: { select: { totalViewings: true, totalApplications: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const status = body.status as string | undefined;
    const role = body.role as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const allowedStatus = ["ACTIVE", "SUSPENDED", "BANNED", "PENDING_VERIFICATION"];
    const allowedRole = ["TENANT", "LANDLORD", "AGENT", "ADMIN"];

    if (status && !allowedStatus.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (role && !allowedRole.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!status && !role) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    if (userId === auth.user.id && (status === "BANNED" || status === "SUSPENDED")) {
      return NextResponse.json(
        { error: "You cannot suspend or ban your own account" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, status: true, role: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(status
          ? { status: status as "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_VERIFICATION" }
          : {}),
        ...(role ? { role: role as "TENANT" | "LANDLORD" | "AGENT" | "ADMIN" } : {}),
      },
      select: USER_SAFE_SELECT,
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        action: "UPDATE",
        entity: "User",
        entityId: userId,
        oldData: { status: existing.status, role: existing.role },
        newData: { status: status ?? existing.status, role: role ?? existing.role },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin users PATCH error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
