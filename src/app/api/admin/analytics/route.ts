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

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period counts
    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      totalProperties,
      activeListings,
      pendingReview,
      rentedProperties,
      totalReports,
      pendingReports,
      totalViewings,
      pendingApplications,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: { deletedAt: null, lastLoginAt: { gte: thirtyDaysAgo } },
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
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.viewingRequest.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.application.count({ where: { status: "SUBMITTED" } }),
    ]);

    // User role breakdown
    const [tenants, landlords, agents, admins] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, role: "TENANT" } }),
      prisma.user.count({ where: { deletedAt: null, role: "LANDLORD" } }),
      prisma.user.count({ where: { deletedAt: null, role: "AGENT" } }),
      prisma.user.count({ where: { deletedAt: null, role: "ADMIN" } }),
    ]);

    // Revenue from completed payments
    const revenueResult = await prisma.payment.aggregate({
      where: { status: "completed" },
      _sum: { amount: true },
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    // Recent payments this month
    const monthlyRevenueResult = await prisma.payment.aggregate({
      where: { status: "completed", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });
    const monthlyRevenue = monthlyRevenueResult._sum.amount || 0;

    // Growth percentages
    const userGrowth =
      newUsersLastMonth > 0
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : newUsersThisMonth > 0
        ? 100
        : 0;

    // Chart data: daily user registrations for last 30 days
    const dailyUsers = await prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM users
       WHERE created_at >= $1 AND deleted_at IS NULL
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      thirtyDaysAgo
    );

    // Chart data: daily property listings for last 30 days
    const dailyProperties = await prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
      `SELECT DATE(listed_at) as date, COUNT(*) as count
       FROM properties
       WHERE listed_at >= $1 AND deleted_at IS NULL
       GROUP BY DATE(listed_at)
       ORDER BY date ASC`,
      thirtyDaysAgo
    );

    // Daily revenue for last 30 days
    const dailyRevenue = await prisma.$queryRawUnsafe<{ date: string; total: bigint }[]>(
      `SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE created_at >= $1 AND status = 'completed'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      thirtyDaysAgo
    );

    // District breakdown
    const districtBreakdown = await prisma.$queryRawUnsafe<{ district: string; count: bigint }[]>(
      `SELECT COALESCE(district, 'Unknown') as district, COUNT(*) as count
       FROM properties
       WHERE deleted_at IS NULL AND status = 'ACTIVE'
       GROUP BY district
       ORDER BY count DESC
       LIMIT 10`
    );

    // Property type breakdown
    const propertyTypeBreakdown = await prisma.$queryRawUnsafe<{ type: string; count: bigint }[]>(
      `SELECT property_type as type, COUNT(*) as count
       FROM properties
       WHERE deleted_at IS NULL AND status = 'ACTIVE'
       GROUP BY property_type
       ORDER BY count DESC`
    );

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        userGrowth,
        totalProperties,
        activeListings,
        pendingReview,
        rentedProperties,
        totalReports,
        pendingReports,
        totalViewings,
        pendingApplications,
        totalRevenue,
        monthlyRevenue,
        roleBreakdown: { tenants, landlords, agents, admins },
      },
      charts: {
        dailyUsers: dailyUsers.map((r) => ({ date: r.date, count: Number(r.count) })),
        dailyProperties: dailyProperties.map((r) => ({ date: r.date, count: Number(r.count) })),
        dailyRevenue: dailyRevenue.map((r) => ({ date: r.date, total: Number(r.total) })),
        districtBreakdown: districtBreakdown.map((r) => ({
          district: r.district,
          count: Number(r.count),
        })),
        propertyTypeBreakdown: propertyTypeBreakdown.map((r) => ({
          type: r.type,
          count: Number(r.count),
        })),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
