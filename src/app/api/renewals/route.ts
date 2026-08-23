import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, requireTenancyAccess, isPropertyManager } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { assertRenewalTransition } from "@/lib/tms-state-machine";

// GET /api/renewals - List renewals
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const tenancyId = searchParams.get("tenancyId");
    const status = searchParams.get("status");

    const role = auth.session.user.role;
    const where: any = {};

    if (role === "TENANT") {
      where.tenancy = { tenantId: auth.session.user.id };
    } else if (role === "LANDLORD" || role === "AGENT") {
      where.tenancy = { property: { userId: auth.session.user.id } };
    }

    if (tenancyId) where.tenancyId = tenancyId;
    if (status) where.status = status;

    const renewals = await prisma.renewal.findMany({
      where,
      include: {
        tenancy: {
          include: {
            property: { select: { id: true, title: true } },
            unit: { select: { unitNumber: true } },
            tenant: { select: { id: true, name: true, avatar: true } },
            leases: {
              where: { status: { in: ["ACTIVE", "EXPIRING"] } },
              take: 1,
              orderBy: { endDate: "desc" },
              select: { id: true, endDate: true, rentAmount: true },
            },
          },
        },
        offeredBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ renewals });
  } catch (error) {
    console.error("Renewals fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 });
  }
}

// POST /api/renewals - Offer a renewal (landlord/agent)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole("LANDLORD", "AGENT", "ADMIN");
    if (auth.error) return auth.error;

    const body = await req.json();
    const { tenancyId, proposedRent, proposedTerms } = body;

    if (!tenancyId || !proposedRent) {
      return NextResponse.json(
        { error: "tenancyId and proposedRent are required" },
        { status: 400 }
      );
    }

    const { allowed, tenancy, error: accessError } = await requireTenancyAccess(
      auth.session,
      tenancyId
    );
    if (accessError) return accessError;
    if (!allowed || !tenancy) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check there isn't already a pending renewal
    const existing = await prisma.renewal.findFirst({
      where: {
        tenancyId,
        status: { in: ["OFFERED", "TENANT_REVIEWING"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A pending renewal already exists for this tenancy" },
        { status: 409 }
      );
    }

    const renewal = await prisma.renewal.create({
      data: {
        tenancyId,
        proposedRent: Math.round(proposedRent),
        proposedTerms: proposedTerms || null,
        offeredById: auth.session.user.id,
      },
    });

    // Update tenancy and lease status
    await prisma.tenancy.update({
      where: { id: tenancyId },
      data: {},
    });

    // Update active lease to RENEWAL_PENDING
    const activeLease = await prisma.lease.findFirst({
      where: { tenancyId, status: { in: ["ACTIVE", "EXPIRING"] } },
    });
    if (activeLease) {
      await prisma.lease.update({
        where: { id: activeLease.id },
        data: { status: "RENEWAL_PENDING" },
      });
    }

    // Notify tenant
    await prisma.notification.create({
      data: {
        userId: tenancy.tenantId,
        type: "APPLICATION_UPDATE",
        title: "Lease renewal offer",
        body: `A renewal has been offered with new rent of UGX ${proposedRent.toLocaleString()}. Please review and respond.`,
        link: `/dashboard/tenant`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "RENEWAL_OFFERED",
        entity: "Renewal",
        entityId: renewal.id,
        newData: { tenancyId, proposedRent },
      },
    });

    return NextResponse.json({ renewal }, { status: 201 });
  } catch (error) {
    console.error("Renewal creation error:", error);
    return NextResponse.json({ error: "Failed to create renewal" }, { status: 500 });
  }
}

// PATCH /api/renewals - Accept/Decline renewal (tenant)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { renewalId, status, responseNotes } = body;

    if (!renewalId || !status) {
      return NextResponse.json(
        { error: "renewalId and status are required" },
        { status: 400 }
      );
    }

    const renewal = await prisma.renewal.findUnique({
      where: { id: renewalId },
      include: { tenancy: true },
    });
    if (!renewal) {
      return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
    }

    const role = auth.session.user.role;
    if (role === "TENANT" && renewal.tenancy.tenantId !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    assertRenewalTransition(renewal.status, status);

    const updated = await prisma.renewal.update({
      where: { id: renewalId },
      data: {
        status,
        respondedAt: new Date(),
        responseNotes: responseNotes || null,
      },
    });

    // If ACCEPTED: create new lease
    if (status === "ACCEPTED") {
      const currentLease = await prisma.lease.findFirst({
        where: { tenancyId: renewal.tenancyId, status: { in: ["ACTIVE", "EXPIRING", "RENEWAL_PENDING"] } },
        orderBy: { endDate: "desc" },
      });

      if (currentLease) {
        const newStart = new Date(currentLease.endDate);
        newStart.setDate(newStart.getDate() + 1);
        const newEnd = new Date(newStart);
        newEnd.setFullYear(newEnd.getFullYear() + 1);

        await prisma.lease.create({
          data: {
            tenancyId: renewal.tenancyId,
            propertyId: currentLease.propertyId,
            unitId: currentLease.unitId,
            status: "PENDING_SIGNATURE",
            startDate: newStart,
            endDate: newEnd,
            rentAmount: renewal.proposedRent,
            depositAmount: currentLease.depositAmount,
            paymentFrequency: currentLease.paymentFrequency,
            gracePeriodDays: currentLease.gracePeriodDays,
            noticePeriodDays: currentLease.noticePeriodDays,
          },
        });

        // Terminate old lease
        await prisma.lease.update({
          where: { id: currentLease.id },
          data: { status: "EXPIRED" },
        });
      }

      // Notify landlord
      await prisma.notification.create({
        data: {
          userId: renewal.offeredById!,
          type: "APPLICATION_UPDATE",
          title: "Renewal accepted",
          body: "The tenant has accepted the lease renewal. A new lease is ready for review.",
          link: `/dashboard/landlord`,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: `RENEWAL_${status}`,
        entity: "Renewal",
        entityId: renewalId,
        oldData: { status: renewal.status },
        newData: { status, responseNotes },
      },
    });

    return NextResponse.json({ renewal: updated });
  } catch (error) {
    console.error("Renewal update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update renewal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
