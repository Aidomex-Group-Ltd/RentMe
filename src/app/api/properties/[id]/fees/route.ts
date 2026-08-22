import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { PaymentFrequency } from "@prisma/client";
import {
  calculatePropertyFeesFromProperty,
  validateFeeConfig,
  type FeeBreakdown,
} from "@/lib/fees";
import { invalidatePropertyCaches } from "@/lib/cache";

const PAYMENT_FREQUENCIES = [
  "MONTHLY",
  "WEEKLY",
  "DAILY",
  "QUARTERLY",
  "ANNUALLY",
] as const;

/** Reject non-numeric / negative fee values with a clear 400 instead of a Prisma 500. */
function optionalNonNegativeAmount(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "" || value === 0) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

// GET /api/properties/[id]/fees - Get fee breakdown for a property
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        rent: true,
        deposit: true,
        agencyFee: true,
        serviceCharge: true,
        paymentFrequency: true,
        isAgentListing: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const fees: FeeBreakdown = calculatePropertyFeesFromProperty(property);

    return NextResponse.json({ fees });
  } catch (error) {
    console.error("Fee calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate fees" },
      { status: 500 }
    );
  }
}

// POST /api/properties/[id]/fees - Update property fees
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        slug: true,
        userId: true,
        isAgentListing: true,
        user: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Only the property owner, agents managing it, or admins can change fees
    const isOwner = property.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const isAgentManager = property.isAgentListing && session.user.role === "AGENT";

    if (!isOwner && !isAdmin && !isAgentManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { minimumMonths } = body;

    // Validate & coerce fee amounts — reject non-numeric/negative values
    // with a clear 400 instead of a Prisma runtime error.
    const deposit = optionalNonNegativeAmount(body.deposit);
    const agencyFee = optionalNonNegativeAmount(body.agencyFee);
    const serviceCharge = optionalNonNegativeAmount(body.serviceCharge);

    const hasInvalidAmount =
      (body.deposit !== undefined && body.deposit !== null && body.deposit !== "" && deposit === null) ||
      (body.agencyFee !== undefined && body.agencyFee !== null && body.agencyFee !== "" && agencyFee === null) ||
      (body.serviceCharge !== undefined && body.serviceCharge !== null && body.serviceCharge !== "" && serviceCharge === null);
    if (hasInvalidAmount) {
      return NextResponse.json(
        { error: "deposit, agencyFee, and serviceCharge must be non-negative numbers" },
        { status: 400 }
      );
    }

    const paymentFrequency = body.paymentFrequency as string | undefined;
    if (
      paymentFrequency !== undefined &&
      !PAYMENT_FREQUENCIES.includes(paymentFrequency as (typeof PAYMENT_FREQUENCIES)[number])
    ) {
      return NextResponse.json(
        { error: `Invalid paymentFrequency. Allowed: ${PAYMENT_FREQUENCIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate fee configuration
    const validationError = validateFeeConfig({
      deposit: deposit ?? undefined,
      agencyFee: agencyFee ?? undefined,
      minimumMonths,
      isAgentListing: property.isAgentListing,
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updateData: {
      deposit?: number | null;
      agencyFee?: number | null;
      serviceCharge?: number | null;
      paymentFrequency?: PaymentFrequency;
    } = {};

    if (deposit !== undefined) {
      updateData.deposit = deposit || null;
    }

    if (agencyFee !== undefined) {
      updateData.agencyFee = agencyFee || null;
    }

    if (serviceCharge !== undefined) {
      updateData.serviceCharge = serviceCharge || null;
    }

    if (paymentFrequency !== undefined) {
      updateData.paymentFrequency = paymentFrequency as PaymentFrequency;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fee updates provided" }, { status: 400 });
    }

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        rent: true,
        deposit: true,
        agencyFee: true,
        serviceCharge: true,
        paymentFrequency: true,
        isAgentListing: true,
      },
    });

    // Recalculate fees
    const fees = calculatePropertyFeesFromProperty(updated);

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "PropertyFee",
        entityId: params.id,
        newData: updateData,
      },
    });

    invalidatePropertyCaches(property.id, property.slug);

    return NextResponse.json({ fees, property: updated });
  } catch (error) {
    console.error("Fee update error:", error);
    return NextResponse.json(
      { error: "Failed to update fees" },
      { status: 500 }
    );
  }
}
