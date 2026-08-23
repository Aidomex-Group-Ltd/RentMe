import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isPropertyManager } from "@/lib/rbac";
import prisma from "@/lib/prisma";

// GET /api/reports?type=occupancy|financial|maintenance|lease&propertyId=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    if (!isPropertyManager(auth.session.user.role) && auth.session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only landlords, agents, or admins can access reports" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "overview";
    const propertyId = searchParams.get("propertyId");

    // Base property filter: only properties this user manages
    const propertyWhere: any = {};
    if (auth.session.user.role !== "ADMIN") {
      propertyWhere.userId = auth.session.user.id;
    }
    if (propertyId) {
      propertyWhere.id = propertyId;
    }

    const properties = await prisma.property.findMany({
      where: propertyWhere,
      select: { id: true, title: true, rent: true, status: true },
    });
    const propertyIds = properties.map((p) => p.id);

    if (propertyIds.length === 0) {
      return NextResponse.json({ report: getEmptyReport(type) });
    }

    switch (type) {
      case "occupancy":
        return NextResponse.json({
          report: await buildOccupancyReport(propertyIds, properties),
        });
      case "financial":
        return NextResponse.json({
          report: await buildFinancialReport(propertyIds),
        });
      case "maintenance":
        return NextResponse.json({
          report: await buildMaintenanceReport(propertyIds),
        });
      case "lease":
        return NextResponse.json({
          report: await buildLeaseReport(propertyIds),
        });
      case "overview":
      default:
        return NextResponse.json({
          report: await buildOverviewReport(propertyIds, properties),
        });
    }
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

// ─── Overview Report ────────────────────────────────────

async function buildOverviewReport(propertyIds: string[], properties: any[]) {
  const [unitStats, tenantStats, maintenanceStats, financialStats] = await Promise.all([
    prisma.unit.groupBy({
      by: ["status"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
    }),
    prisma.tenancy.groupBy({
      by: ["status"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
    }),
    prisma.maintenanceRequest.groupBy({
      by: ["status"],
      where: {
        propertyId: { in: propertyIds },
        status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
      _count: true,
    }),
    prisma.rentCharge.aggregate({
      where: {
        tenancy: { propertyId: { in: propertyIds } },
        status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
      },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    }),
  ]);

  const totalUnits = unitStats.reduce((acc, s) => acc + s._count, 0);
  const occupiedUnits = unitStats.find((s) => s.status === "OCCUPIED")?._count || 0;
  const availableUnits = unitStats.find((s) => s.status === "AVAILABLE")?._count || 0;

  const activeTenants = tenantStats.find((s) => s.status === "ACTIVE")?._count || 0;
  const pendingTenants = tenantStats.find((s) => s.status === "PENDING")?._count || 0;

  const openMaintenance = maintenanceStats.reduce((acc, s) => acc + s._count, 0);
  const urgentMaintenance = maintenanceStats.find((s) => s.status === "SUBMITTED")?._count || 0;

  const totalDue = financialStats._sum.amount || 0;
  const totalPaid = financialStats._sum.paidAmount || 0;
  const outstanding = totalDue - totalPaid;

  return {
    type: "overview",
    properties: properties.length,
    occupancy: {
      totalUnits,
      occupiedUnits,
      availableUnits,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    },
    tenants: {
      active: activeTenants,
      pending: pendingTenants,
      total: activeTenants + pendingTenants,
    },
    financial: {
      outstanding,
      totalDue,
      totalPaid,
    },
    maintenance: {
      open: openMaintenance,
      urgent: urgentMaintenance,
    },
  };
}

// ─── Occupancy Report ───────────────────────────────────

async function buildOccupancyReport(propertyIds: string[], properties: any[]) {
  const [unitsByStatus, tenanciesByStatus, unitsByProperty] = await Promise.all([
    prisma.unit.groupBy({
      by: ["status"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
    }),
    prisma.tenancy.groupBy({
      by: ["status"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
    }),
    prisma.unit.groupBy({
      by: ["propertyId", "status"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
    }),
  ]);

  const totalUnits = unitsByStatus.reduce((acc, s) => acc + s._count, 0);
  const occupiedUnits = unitsByStatus.find((s) => s.status === "OCCUPIED")?._count || 0;
  const availableUnits = unitsByStatus.find((s) => s.status === "AVAILABLE")?._count || 0;
  const reservedUnits = unitsByStatus.find((s) => s.status === "RESERVED")?._count || 0;
  const maintenanceUnits = unitsByStatus.find((s) => s.status === "MAINTENANCE")?._count || 0;
  const unavailableUnits = unitsByStatus.find((s) => s.status === "UNAVAILABLE")?._count || 0;

  // Per-property breakdown
  const perProperty = properties.map((prop) => {
    const propUnits = unitsByProperty.filter((u) => u.propertyId === prop.id);
    const propTotal = propUnits.reduce((acc, s) => acc + s._count, 0);
    const propOccupied = propUnits.find((u) => u.status === "OCCUPIED")?._count || 0;
    const propAvailable = propUnits.find((u) => u.status === "AVAILABLE")?._count || 0;

    return {
      propertyId: prop.id,
      title: prop.title,
      totalUnits: propTotal,
      occupied: propOccupied,
      available: propAvailable,
      occupancyRate: propTotal > 0 ? Math.round((propOccupied / propTotal) * 100) : 0,
    };
  });

  return {
    type: "occupancy",
    summary: {
      totalUnits,
      occupied: occupiedUnits,
      available: availableUnits,
      reserved: reservedUnits,
      maintenance: maintenanceUnits,
      unavailable: unavailableUnits,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    },
    activeTenancies: tenanciesByStatus.find((s) => s.status === "ACTIVE")?._count || 0,
    pendingTenancies: tenanciesByStatus.find((s) => s.status === "PENDING")?._count || 0,
    noticeGiven: tenanciesByStatus.find((s) => s.status === "NOTICE_GIVEN")?._count || 0,
    perProperty,
  };
}

// ─── Financial Report ───────────────────────────────────

async function buildFinancialReport(propertyIds: string[]) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    chargesByStatus,
    totalChargesAgg,
    overdueCharges,
    recentPayments,
    last30DaysPayments,
    last90DaysPayments,
    paymentsByMethod,
  ] = await Promise.all([
    prisma.rentCharge.groupBy({
      by: ["status"],
      where: { tenancy: { propertyId: { in: propertyIds } } },
      _count: true,
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.rentCharge.aggregate({
      where: { tenancy: { propertyId: { in: propertyIds } } },
      _sum: { amount: true, paidAmount: true, lateFee: true },
      _count: true,
    }),
    prisma.rentCharge.findMany({
      where: {
        tenancy: { propertyId: { in: propertyIds } },
        status: { in: ["OVERDUE", "PARTIAL"] },
      },
      include: {
        tenancy: {
          include: {
            tenant: { select: { id: true, name: true } },
            property: { select: { title: true } },
            unit: { select: { unitNumber: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
    prisma.rentPayment.findMany({
      where: {
        rentCharge: { tenancy: { propertyId: { in: propertyIds } } },
        status: "completed",
      },
      include: {
        user: { select: { name: true } },
        rentCharge: { select: { dueDate: true, description: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.rentPayment.aggregate({
      where: {
        rentCharge: { tenancy: { propertyId: { in: propertyIds } } },
        status: "completed",
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.rentPayment.aggregate({
      where: {
        rentCharge: { tenancy: { propertyId: { in: propertyIds } } },
        status: "completed",
        createdAt: { gte: ninetyDaysAgo },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.rentPayment.groupBy({
      by: ["paymentMethod"],
      where: {
        rentCharge: { tenancy: { propertyId: { in: propertyIds } } },
        status: "completed",
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalDue = totalChargesAgg._sum.amount || 0;
  const totalPaid = totalChargesAgg._sum.paidAmount || 0;
  const totalLateFees = totalChargesAgg._sum.lateFee || 0;

  return {
    type: "financial",
    summary: {
      totalDue,
      totalPaid,
      outstanding: totalDue - totalPaid,
      lateFees: totalLateFees,
      totalCharges: totalChargesAgg._count,
    },
    collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100,
    last30Days: {
      collected: last30DaysPayments._sum.amount || 0,
      transactions: last30DaysPayments._count,
    },
    last90Days: {
      collected: last90DaysPayments._sum.amount || 0,
      transactions: last90DaysPayments._count,
    },
    overdue: overdueCharges.map((c) => ({
      id: c.id,
      amount: c.amount,
      paidAmount: c.paidAmount,
      outstanding: c.amount - c.paidAmount,
      dueDate: c.dueDate,
      tenant: c.tenancy.tenant.name,
      property: c.tenancy.property.title,
      unit: c.tenancy.unit?.unitNumber || null,
      daysOverdue: Math.floor((now.getTime() - c.dueDate.getTime()) / 86400000),
    })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      payer: p.user.name,
      dueDate: p.rentCharge.dueDate,
      createdAt: p.createdAt,
    })),
    byMethod: paymentsByMethod.map((m) => ({
      method: m.paymentMethod || "unknown",
      total: m._sum.amount || 0,
      count: m._count,
    })),
    chargesByStatus: chargesByStatus.map((s) => ({
      status: s.status,
      count: s._count,
      totalAmount: s._sum.amount || 0,
      totalPaid: s._sum.paidAmount || 0,
    })),
  };
}

// ─── Maintenance Report ─────────────────────────────────

async function buildMaintenanceReport(propertyIds: string[]) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [byStatus, byPriority, byCategory, recentResolved, totalCount] = await Promise.all([
    prisma.maintenanceRequest.groupBy({
      by: ["status"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
    }),
    prisma.maintenanceRequest.groupBy({
      by: ["priority"],
      where: {
        propertyId: { in: propertyIds },
        status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
      _count: true,
    }),
    prisma.maintenanceRequest.groupBy({
      by: ["category"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
    }),
    prisma.maintenanceRequest.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        title: true,
        category: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { resolvedAt: "desc" },
      take: 20,
    }),
    prisma.maintenanceRequest.count({
      where: { propertyId: { in: propertyIds } },
    }),
  ]);

  // Average resolution time (days) for recently resolved
  const resolvedWithTime = recentResolved.filter((r) => r.resolvedAt);
  const avgResolutionDays =
    resolvedWithTime.length > 0
      ? Math.round(
          resolvedWithTime.reduce(
            (acc, r) =>
              acc +
              (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) /
                86400000,
            0
          ) / resolvedWithTime.length
        )
      : 0;

  const openCount = byStatus
    .filter((s) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(s.status))
    .reduce((acc, s) => acc + s._count, 0);

  const urgentCount =
    byPriority.find((p) => p.priority === "URGENT")?._count || 0;

  return {
    type: "maintenance",
    summary: {
      total: totalCount,
      open: openCount,
      urgent: urgentCount,
      resolvedLast30Days: resolvedWithTime.length,
      avgResolutionDays,
    },
    byStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    byPriority: byPriority.map((p) => ({
      priority: p.priority,
      count: p._count,
    })),
    byCategory: byCategory
      .map((c) => ({
        category: c.category || "Uncategorized",
        count: c._count,
      }))
      .sort((a, b) => b.count - a.count),
    recentResolved,
  };
}

// ─── Lease Report ───────────────────────────────────────

async function buildLeaseReport(propertyIds: string[]) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [byStatus, expiringWithin30, expiringWithin90, renewals] = await Promise.all([
    prisma.lease.groupBy({
      by: ["status"],
      where: { propertyId: { in: propertyIds } },
      _count: true,
      _sum: { rentAmount: true },
    }),
    prisma.lease.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: { in: ["ACTIVE", "EXPIRING"] },
        endDate: { lte: thirtyDaysFromNow, gte: now },
      },
      include: {
        tenancy: {
          include: {
            tenant: { select: { id: true, name: true } },
            property: { select: { title: true } },
            unit: { select: { unitNumber: true } },
          },
        },
      },
      orderBy: { endDate: "asc" },
    }),
    prisma.lease.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: { in: ["ACTIVE", "EXPIRING"] },
        endDate: { lte: ninetyDaysFromNow, gte: thirtyDaysFromNow },
      },
      include: {
        tenancy: {
          include: {
            tenant: { select: { id: true, name: true } },
            property: { select: { title: true } },
            unit: { select: { unitNumber: true } },
          },
        },
      },
      orderBy: { endDate: "asc" },
    }),
    prisma.renewal.groupBy({
      by: ["status"],
      where: {
        tenancy: { propertyId: { in: propertyIds } },
      },
      _count: true,
    }),
  ]);

  return {
    type: "lease",
    summary: {
      total: byStatus.reduce((acc, s) => acc + s._count, 0),
      active: byStatus.find((s) => s.status === "ACTIVE")?._count || 0,
      expiringSoon: expiringWithin30.length,
      draft: byStatus.find((s) => s.status === "DRAFT")?._count || 0,
      pendingSignature: byStatus.find((s) => s.status === "PENDING_SIGNATURE")?._count || 0,
    },
    byStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count,
      totalRent: s._sum.rentAmount || 0,
    })),
    expiringWithin30Days: expiringWithin30.map((l) => ({
      id: l.id,
      endDate: l.endDate,
      rentAmount: l.rentAmount,
      tenant: l.tenancy.tenant.name,
      property: l.tenancy.property.title,
      unit: l.tenancy.unit?.unitNumber || null,
    })),
    expiringWithin90Days: expiringWithin90.map((l) => ({
      id: l.id,
      endDate: l.endDate,
      rentAmount: l.rentAmount,
      tenant: l.tenancy.tenant.name,
      property: l.tenancy.property.title,
      unit: l.tenancy.unit?.unitNumber || null,
    })),
    renewals: renewals.map((r) => ({
      status: r.status,
      count: r._count,
    })),
  };
}

// ─── Empty Report ───────────────────────────────────────

function getEmptyReport(type: string) {
  const base = { type, message: "No properties found" };
  switch (type) {
    case "occupancy":
      return { ...base, summary: { totalUnits: 0, occupied: 0, available: 0, occupancyRate: 0 }, perProperty: [] };
    case "financial":
      return { ...base, summary: { totalDue: 0, totalPaid: 0, outstanding: 0 }, overdue: [], recentPayments: [] };
    case "maintenance":
      return { ...base, summary: { total: 0, open: 0, urgent: 0 }, byStatus: [], byPriority: [] };
    case "lease":
      return { ...base, summary: { total: 0, active: 0, expiringSoon: 0 }, byStatus: [], expiringWithin30Days: [] };
    default:
      return { ...base, occupancy: { occupancyRate: 0 }, financial: { outstanding: 0 }, maintenance: { open: 0 } };
  }
}
