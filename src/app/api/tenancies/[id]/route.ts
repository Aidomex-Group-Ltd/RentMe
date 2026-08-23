import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenancyAccess } from "@/lib/rbac";
import prisma from "@/lib/prisma";

// GET /api/tenancies/[id] - Get detailed tenancy information
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { allowed, tenancy, error: accessError } = await requireTenancyAccess(
      auth.session,
      params.id
    );
    if (accessError) return accessError;
    if (!allowed || !tenancy) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the full tenancy with all related data
    const fullTenancy = await prisma.tenancy.findUnique({
      where: { id: params.id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            rent: true,
            deposit: true,
            district: true,
            city: true,
            address: true,
            propertyType: true,
            bedrooms: true,
            bathrooms: true,
          },
        },
        unit: {
          select: { id: true, unitNumber: true, unitType: true, rent: true },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
            phone: true,
          },
        },
        leases: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            rentAmount: true,
            depositAmount: true,
            paymentFrequency: true,
            gracePeriodDays: true,
            noticePeriodDays: true,
            signedAt: true,
            createdAt: true,
          },
        },
        rentCharges: {
          orderBy: { dueDate: "desc" },
          take: 12,
          select: {
            id: true,
            amount: true,
            currency: true,
            dueDate: true,
            description: true,
            status: true,
            paidAmount: true,
            lateFee: true,
            createdAt: true,
          },
        },
        maintenanceRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            category: true,
            url: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
        },
        notices: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            subject: true,
            message: true,
            isRead: true,
            createdAt: true,
          },
        },
        moveIn: {
          select: {
            id: true,
            scheduledDate: true,
            actualDate: true,
            tenantConfirmed: true,
            completedAt: true,
          },
        },
        moveOut: {
          select: {
            id: true,
            noticeGivenAt: true,
            expectedMoveOut: true,
            actualMoveOut: true,
            tenantConfirmed: true,
            completedAt: true,
            outstandingRent: true,
            damageCharges: true,
            depositRefund: true,
            depositDeductions: true,
          },
        },
        renewals: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            proposedRent: true,
            proposedTerms: true,
            offeredAt: true,
            respondedAt: true,
          },
        },
      },
    });

    if (!fullTenancy) {
      return NextResponse.json({ error: "Tenancy not found" }, { status: 404 });
    }

    // Calculate rent summary
    const rentSummary = fullTenancy.rentCharges.reduce(
      (acc, charge) => {
        acc.totalDue += charge.amount;
        acc.totalPaid += charge.paidAmount;
        acc.totalLateFee += charge.lateFee;
        if (charge.status === "OVERDUE") acc.overdueCount++;
        if (charge.status === "PENDING" || charge.status === "OVERDUE" || charge.status === "PARTIAL") {
          acc.outstanding += charge.amount - charge.paidAmount;
        }
        return acc;
      },
      { totalDue: 0, totalPaid: 0, totalLateFee: 0, outstanding: 0, overdueCount: 0 }
    );

    // Maintenance summary
    const maintenanceSummary = {
      total: fullTenancy.maintenanceRequests.length,
      open: fullTenancy.maintenanceRequests.filter(
        (r) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(r.status)
      ).length,
      resolved: fullTenancy.maintenanceRequests.filter(
        (r) => r.status === "RESOLVED" || r.status === "CLOSED"
      ).length,
    };

    return NextResponse.json({
      tenancy: fullTenancy,
      rentSummary,
      maintenanceSummary,
    });
  } catch (error) {
    console.error("Tenancy details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenancy details" },
      { status: 500 }
    );
  }
}
