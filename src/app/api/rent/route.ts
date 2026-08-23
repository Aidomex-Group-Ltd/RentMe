import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireRole,
  requireTenancyAccess,
  isPropertyManager,
} from "@/lib/rbac";
import prisma from "@/lib/prisma";

// GET /api/rent - List rent charges for a tenancy
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const tenancyId = searchParams.get("tenancyId");
    const status = searchParams.get("status");

    if (!tenancyId) {
      return NextResponse.json({ error: "tenancyId is required" }, { status: 400 });
    }

    // Verify tenancy access
    const { allowed, error: accessError } = await requireTenancyAccess(auth.session, tenancyId);
    if (accessError) return accessError;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: any = { tenancyId };
    if (status) where.status = status;

    const charges = await prisma.rentCharge.findMany({
      where,
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            amount: true,
            currency: true,
            paymentMethod: true,
            reference: true,
            status: true,
            receiptUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { dueDate: "desc" },
    });

    // Calculate summary
    const summary = charges.reduce(
      (acc, charge) => {
        acc.totalDue += charge.amount;
        acc.totalPaid += charge.paidAmount;
        acc.totalLateFee += charge.lateFee;
        if (charge.status === "OVERDUE") acc.overdueCount++;
        if (charge.status === "PENDING" || charge.status === "OVERDUE") {
          acc.outstanding += charge.amount - charge.paidAmount;
        }
        return acc;
      },
      {
        totalDue: 0,
        totalPaid: 0,
        totalLateFee: 0,
        outstanding: 0,
        overdueCount: 0,
      }
    );

    return NextResponse.json({ charges, summary });
  } catch (error) {
    console.error("Rent fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch rent data" }, { status: 500 });
  }
}

// POST /api/rent - Create a rent charge (landlord/agent) or record payment (tenant)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const action = body.action; // "create_charge" or "record_payment"

    if (action === "create_charge") {
      return await createCharge(auth, body);
    } else if (action === "record_payment") {
      return await recordPayment(auth, body);
    } else {
      return NextResponse.json(
        { error: "action must be 'create_charge' or 'record_payment'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Rent operation error:", error);
    const message = error instanceof Error ? error.message : "Failed to process rent operation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createCharge(
  auth: { session: any },
  body: any
): Promise<NextResponse> {
  if (!isPropertyManager(auth.session.user.role)) {
    return NextResponse.json(
      { error: "Only landlords/agents can create rent charges" },
      { status: 403 }
    );
  }

  const { tenancyId, amount, dueDate, description, currency } = body;

  if (!tenancyId || !amount || !dueDate) {
    return NextResponse.json(
      { error: "tenancyId, amount, and dueDate are required" },
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

  if (tenancy.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Cannot create charges for inactive tenancies" },
      { status: 409 }
    );
  }

  const charge = await prisma.rentCharge.create({
    data: {
      tenancyId,
      amount: Math.round(amount),
      currency: currency || "UGX",
      dueDate: new Date(dueDate),
      description: description || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: "RENT_CHARGE_CREATED",
      entity: "RentCharge",
      entityId: charge.id,
      newData: { tenancyId, amount, dueDate },
    },
  });

  return NextResponse.json({ charge }, { status: 201 });
}

async function recordPayment(
  auth: { session: any },
  body: any
): Promise<NextResponse> {
  const { rentChargeId, amount, paymentMethod, transactionId, reference, notes, idempotencyKey } = body;

  if (!rentChargeId || !amount) {
    return NextResponse.json(
      { error: "rentChargeId and amount are required" },
      { status: 400 }
    );
  }

  const charge = await prisma.rentCharge.findUnique({
    where: { id: rentChargeId },
    include: { tenancy: true },
  });
  if (!charge) {
    return NextResponse.json({ error: "Rent charge not found" }, { status: 404 });
  }

  // Verify access
  const { allowed, error: accessError } = await requireTenancyAccess(
    auth.session,
    charge.tenancyId
  );
  if (accessError) return accessError;
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = await prisma.rentPayment.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return NextResponse.json({ payment: existing, duplicate: true }, { status: 200 });
    }
  }

  const paymentAmount = Math.round(amount);
  const remainingDue = charge.amount - charge.paidAmount;
  if (paymentAmount <= 0) {
    return NextResponse.json({ error: "Payment amount must be positive" }, { status: 400 });
  }
  if (paymentAmount > remainingDue + charge.lateFee) {
    return NextResponse.json(
      { error: `Payment amount exceeds outstanding balance of ${remainingDue + charge.lateFee}` },
      { status: 400 }
    );
  }

  // Create payment and update charge atomically
  const [payment] = await prisma.$transaction([
    prisma.rentPayment.create({
      data: {
        rentChargeId,
        userId: auth.session.user.id,
        amount: paymentAmount,
        currency: charge.currency,
        paymentMethod: paymentMethod || null,
        transactionId: transactionId || null,
        reference: reference || null,
        notes: notes || null,
        idempotencyKey: idempotencyKey || null,
        status: "pending",
      },
    }),
  ]);

  // Update charge paid amount and status
  const newPaidAmount = charge.paidAmount + paymentAmount;
  if (newPaidAmount >= charge.amount) {
    await prisma.rentCharge.update({
      where: { id: rentChargeId },
      data: { paidAmount: newPaidAmount, status: "PAID" },
    });
  } else if (newPaidAmount > 0) {
    await prisma.rentCharge.update({
      where: { id: rentChargeId },
      data: { paidAmount: newPaidAmount, status: "PARTIAL" },
    });
  }

  // Notify landlord
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: charge.tenancyId },
    select: { propertyId: true },
  });
  if (tenancy) {
    const property = await prisma.property.findUnique({
      where: { id: tenancy.propertyId },
      select: { userId: true, title: true },
    });
    if (property) {
      await prisma.notification.create({
        data: {
          userId: property.userId,
          type: "APPLICATION_UPDATE",
          title: "Rent payment received",
          body: `Payment of ${charge.currency} ${paymentAmount.toLocaleString()} received for "${property.title}"`,
          link: `/dashboard/landlord`,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: auth.session.user.id,
      action: "RENT_PAYMENT_RECORDED",
      entity: "RentPayment",
      entityId: payment.id,
      newData: { rentChargeId, amount: paymentAmount, paymentMethod },
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
