/**
 * Rent Reminder Cron Script
 *
 * Run: npx tsx scripts/rent-reminders.ts
 *
 * This script can be run via:
 * - Vercel Cron Jobs (POST /api/cron/rent-reminders)
 * - External cron service
 * - Manual execution
 *
 * Environment variables required:
 * - DATABASE_URL: PostgreSQL connection string
 * - CRON_SECRET: Secret for API authentication (optional for direct DB access)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log(`[rent-reminders] Starting at ${now.toISOString()}`);

  const results = {
    overdueUpdated: 0,
    remindersSent: 0,
    overdueAlertsSent: 0,
    lateFeesApplied: 0,
  };

  // 1. Mark PENDING charges past due date as OVERDUE
  console.log("[rent-reminders] Checking for overdue charges...");
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
    console.log(
      `  [overdue] ${charge.tenancy.tenant.name} - ${charge.currency} ${charge.amount.toLocaleString()} for ${charge.tenancy.property.title}`
    );
  }

  // 2. Send reminders for charges due in 3 days
  console.log("[rent-reminders] Checking for upcoming charges...");
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

    // Check if we already sent a reminder today
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
        },
      });

      results.remindersSent++;
      console.log(
        `  [reminder] ${charge.tenancy.tenant.name} - due in ${daysUntilDue} day(s)`
      );
    }
  }

  // 3. Apply late fees for charges past grace period
  console.log("[rent-reminders] Checking for late fees...");
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
            orderBy: { dueDate: "asc" },
            take: 1,
          },
          tenant: { select: { id: true, name: true } },
          property: { select: { title: true } },
        },
      },
    },
  });

  for (const lease of activeLeases) {
    if (lease.tenancy.rentCharges.length === 0) continue;

    const charge = lease.tenancy.rentCharges[0];
    const graceDeadline = new Date(charge.dueDate);
    graceDeadline.setDate(graceDeadline.getDate() + lease.gracePeriodDays);

    if (now > graceDeadline) {
      const lateFee = Math.round(charge.amount * 0.05);

      await prisma.rentCharge.update({
        where: { id: charge.id },
        data: { lateFee },
      });

      await prisma.notification.create({
        data: {
          userId: lease.tenancy.tenantId,
          type: "APPLICATION_UPDATE",
          title: "Late fee applied",
          body: `A late fee of ${charge.currency} ${lateFee.toLocaleString()} has been applied to your overdue rent charge for "${lease.tenancy.property.title}".`,
          link: `/dashboard/tenant/payments`,
        },
      });

      results.lateFeesApplied++;
      console.log(
        `  [late-fee] ${lease.tenancy.tenant.name} - ${charge.currency} ${lateFee.toLocaleString()}`
      );
    }
  }

  console.log(`\n[rent-reminders] Completed:`);
  console.log(`  Overdue charges updated: ${results.overdueUpdated}`);
  console.log(`  Reminders sent: ${results.remindersSent}`);
  console.log(`  Overdue alerts sent: ${results.overdueAlertsSent}`);
  console.log(`  Late fees applied: ${results.lateFeesApplied}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[rent-reminders] Fatal error:", e);
  process.exit(1);
});
