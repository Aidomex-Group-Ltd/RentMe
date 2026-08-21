export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fillDailyCounts(
  from: Date,
  to: Date,
  rows: { day: Date; count: number }[]
): { date: string; count: number }[] {
  const map = new Map(rows.map((r) => [toDateKey(r.day), r.count]));
  const out: { date: string; count: number }[] = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    out.push({ date: key, count: map.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      pendingVerificationUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      totalProperties,
      activeListings,
      pendingReview,
      rentedProperties,
      suspendedProperties,
      reportedProperties,
      totalReports,
      pendingReports,
      pendingVerifications,
      totalViewings,
      pendingApplications,
      tenants,
      landlords,
      agents,
      admins,
      recentUsers,
      recentProperties,
      recentVerifications,
      recentActivity,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: { deletedAt: null, status: "ACTIVE", lastLoginAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count({
        where: { deletedAt: null, status: "PENDING_VERIFICATION" },
      }),
      prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      prisma.property.count({ where: { deletedAt: null } }),
      prisma.property.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.property.count({ where: { deletedAt: null, status: "PENDING_REVIEW" } }),
      prisma.property.count({ where: { deletedAt: null, status: "RENTED" } }),
      prisma.property.count({ where: { deletedAt: null, status: "SUSPENDED" } }),
      prisma.property.count({
        where: { deletedAt: null, reports: { some: { status: { in: ["PENDING", "UNDER_REVIEW"] } } } },
      }),
      prisma.report.count(),
      prisma.report.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.viewingRequest.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.application.count({ where: { status: "SUBMITTED" } }),
      prisma.user.count({ where: { deletedAt: null, role: "TENANT" } }),
      prisma.user.count({ where: { deletedAt: null, role: "LANDLORD" } }),
      prisma.user.count({ where: { deletedAt: null, role: "AGENT" } }),
      prisma.user.count({ where: { deletedAt: null, role: "ADMIN" } }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.property.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          district: true,
          status: true,
          listedAt: true,
          user: { select: { name: true } },
        },
        orderBy: { listedAt: "desc" },
        take: 5,
      }),
      prisma.verificationRequest.findMany({
        where: { status: "PENDING" },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.auditLog.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const revenueResult = await prisma.payment.aggregate({
      where: { status: "completed" },
      _sum: { amount: true },
    });
    const monthlyRevenueResult = await prisma.payment.aggregate({
      where: { status: "completed", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });

    const userGrowth =
      newUsersLastMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : newUsersThisMonth > 0
          ? 100
          : 0;

    // Build chart series with Prisma (camelCase columns) — no fragile raw SQL
    const [usersForChart, propertiesForChart, paymentsForChart, verificationTrend, reportTrend] =
      await Promise.all([
        prisma.user.findMany({
          where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true },
        }),
        prisma.property.findMany({
          where: { deletedAt: null, listedAt: { gte: thirtyDaysAgo } },
          select: { listedAt: true },
        }),
        prisma.payment.findMany({
          where: { status: "completed", createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true, amount: true },
        }),
        prisma.verificationRequest.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true, status: true },
        }),
        prisma.report.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true, status: true },
        }),
      ]);

    const countByDay = (dates: Date[]) => {
      const map = new Map<string, number>();
      for (const d of dates) {
        const key = toDateKey(startOfDay(d));
        map.set(key, (map.get(key) || 0) + 1);
      }
      return [...map.entries()].map(([day, count]) => ({
        day: new Date(`${day}T00:00:00.000Z`),
        count,
      }));
    };

    const dailyUsers = fillDailyCounts(
      thirtyDaysAgo,
      now,
      countByDay(usersForChart.map((u) => u.createdAt))
    );
    const dailyProperties = fillDailyCounts(
      thirtyDaysAgo,
      now,
      countByDay(propertiesForChart.map((p) => p.listedAt))
    );

    const revenueMap = new Map<string, number>();
    for (const p of paymentsForChart) {
      const key = toDateKey(startOfDay(p.createdAt));
      revenueMap.set(key, (revenueMap.get(key) || 0) + p.amount);
    }
    const dailyRevenue = fillDailyCounts(thirtyDaysAgo, now, []).map((row) => ({
      date: row.date,
      total: revenueMap.get(row.date) || 0,
    }));

    const districtGroups = await prisma.property.groupBy({
      by: ["district"],
      where: { deletedAt: null, status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { _count: { district: "desc" } },
      take: 10,
    });

    const typeGroups = await prisma.property.groupBy({
      by: ["propertyType"],
      where: { deletedAt: null, status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { _count: { propertyType: "desc" } },
    });

    const dailyVerifications = fillDailyCounts(
      thirtyDaysAgo,
      now,
      countByDay(verificationTrend.map((v) => v.createdAt))
    );
    const dailyReports = fillDailyCounts(
      thirtyDaysAgo,
      now,
      countByDay(reportTrend.map((r) => r.createdAt))
    );

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        pendingVerificationUsers,
        newUsersThisMonth,
        userGrowth,
        totalProperties,
        activeListings,
        pendingReview,
        rentedProperties,
        suspendedProperties,
        reportedProperties,
        totalReports,
        pendingReports,
        pendingVerifications,
        totalViewings,
        pendingApplications,
        totalRevenue: revenueResult._sum.amount || 0,
        monthlyRevenue: monthlyRevenueResult._sum.amount || 0,
        roleBreakdown: { tenants, landlords, agents, admins },
      },
      queues: {
        recentUsers,
        recentProperties,
        recentVerifications,
        recentActivity,
      },
      charts: {
        dailyUsers,
        dailyProperties,
        dailyRevenue,
        dailyVerifications,
        dailyReports,
        districtBreakdown: districtGroups.map((r) => ({
          district: r.district || "Unknown",
          count: r._count._all,
        })),
        propertyTypeBreakdown: typeGroups.map((r) => ({
          type: r.propertyType,
          count: r._count._all,
        })),
      },
      range: { from: thirtyDaysAgo.toISOString(), to: now.toISOString() },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
