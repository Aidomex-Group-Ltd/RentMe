import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/cron/rent-reminders
 *
 * Cron job endpoint for:
 * 1. Marking overdue rent charges (past due date, not fully paid)
 * 2. Sending rent reminder notifications to tenants
 * 3. Sending overdue alerts to landlords
 * 4. Applying late fees for charges past grace period
 *
 * Should be called daily via cron (e.g. Vercel Cron, external cron service)
 *
 * Expected cron secret header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      overdueUpdated: 0,
      remindersSent: 0,
      overdueAlertsSent: 0,
      lateFeesApplied: 0,
    };

    // 1. Find PENDING charges past their due date → mark as OVERDUE
    const pendingOverdueCharges = await prisma.rentCharge.findMany({
      where: {
        status: "PENDING",
        dueDate: { lt: now },
      },
      include: {
        tenancy: {
          include: {
            tenant: { select: { id: true, name: true } },
            property: { select: { id: true, title: true, userId: true } },
            unit: { select: { unitNumber: true } },
          },
        },
      },
    });

    for (const charge of pendingOverdueCharges) {
      // Update status to OVERDUE
      await prisma.rentCharge.update({
        where: { id: charge.id },
        data: { status: "OVERDUE" },
      });

      // Notify tenant
      await prisma.notification.create({
        data: {
          userId: charge.tenancy.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Rent overdue",
          body: `Your rent of ${charge.currency} ${charge.amount.toLocaleString()} for "${charge.tenancy.property.title}" was due on ${charge.dueDate.toLocaleDateString()} and is now overdue.`,
          link: `/dashboard/tenant/payments`,
        },
      });

      // Notify landlord
      await prisma.notification.create({
        data: {
          userId: charge.tenancy.property.userId,
          type: "APPLICATION_UPDATE",
          title: "Rent payment overdue",
          body: `${charge.tenancy.tenant.name}'s rent of ${charge.currency} ${charge.amount.toLocaleString()} for "${charge.tenancy.property.title}"${charge.tenancy.unit ? ` (Unit ${charge.tenancy.unit.unitNumber})` : ""} is overdue.`,
          link: `/dashboard/landlord/tenants/${charge.tenancyId}`,
        },
      });

      results.overdueUpdated++;
      results.overdueAlertsSent++;
    }

    // 2. Find ACTIVE charges due in 3 days → send reminders
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingCharges = await prisma.rentCharge.findMany({
      where: {
        status: "PENDING",
        dueDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
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
    });

    for (const charge of upcomingCharges) {
      const daysUntilDue = Math.ceil(
        (charge.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we already sent a reminder today (avoid spam)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const existingReminder = await prisma.notification.findFirst({
        where: {
          userId: charge.tenancy.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Rent due soon",
          createdAt: { gte: todayStart },
        },
      });

      if (!existingReminder) {
        await prisma.notification.create({
          data: {
            userId: charge.tenancy.tenantId,
            type: "APPLICATION_UPDATE",
            title: "Rent due soon",
            body: `Your rent of ${charge.currency} ${charge.amount.toLocaleString()} for "${charge.tenancy.property.title}"${charge.tenancy.unit ? ` (Unit ${charge.tenancy.unit.unitNumber})` : ""} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}.`,
            link: `/dashboard/tenant/payments`,
            data: { chargeId: charge.id },
          },
        });

        results.remindersSent++;
      }
    }

    // 3. Apply late fees for charges past grace period
    // Find active leases with grace periods
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRING"] },
        gracePeriodDays: { gt: 0 },
      },
      include: {
        tenancy: {
          include: {
            rentCharges: {
              where: {
                status: "OVERDUE",
                lateFee: 0,
              },
            },
          },
        },
      },
    });

    for (const lease of activeLeases) {
      const graceDeadline = new Date(
        lease.tenancy.rentCharges[0]?.dueDate.getTime() || 0
      );
      graceDeadline.setDate(graceDeadline.getDate() + lease.gracePeriodDays);

      if (now > graceDeadline && lease.tenancy.rentCharges.length > 0) {
        // Apply a 5% late fee
        const charge = lease.tenancy.rentCharges[0];
        const lateFee = Math.round(charge.amount * 0.05);

        await prisma.rentCharge.update({
          where: { id: charge.id },
          data: { lateFee },
        });

        // Notify tenant of late fee
        await prisma.notification.create({
          data: {
            userId: lease.tenancy.tenantId,
            type: "APPLICATION_UPDATE",
            title: "Late fee applied",
            body: `A late fee of ${charge.currency} ${lateFee.toLocaleString()} has been applied to your overdue rent charge.`,
            link: `/dashboard/tenant/payments`,
          },
        });

        results.lateFeesApplied++;
      }
    }

    console.log(
      `[rent-reminders] Completed: ${results.overdueUpdated} overdue, ${results.remindersSent} reminders, ${results.lateFeesApplied} late fees`
    );

    return NextResponse.json({
      success: true,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[rent-reminders] Error:", error);
    return NextResponse.json(
      { error: "Failed to process rent reminders" },
      { status: 500 }
    );
  }
}

// GET for health check / manual trigger
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/cron/rent-reminders",
    description: "POST to trigger rent reminder processing",
  });
}
