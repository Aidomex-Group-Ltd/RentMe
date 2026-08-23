/**
 * Property flagging persistence and admin/owner notifications.
 * Rule thresholds and scam-alert copy live in `@/lib/flagging-rules`.
 */

import type { Prisma, PropertyStatus, ReportReason, ReportStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { invalidatePropertyCaches } from "@/lib/cache";
import {
  FLAG_ALERT_THRESHOLD,
  HIGH_SEVERITY_SUSPEND_THRESHOLD,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORT_SEVERITY,
  SCAM_SUSPEND_THRESHOLD,
  type ReportReasonValue,
} from "@/lib/flagging-rules";

export {
  buildPublicSafetyAlert,
  descriptionRequired,
  detectScamSignals,
  FLAG_ALERT_THRESHOLD,
  HIGH_SEVERITY_REASONS,
  HIGH_SEVERITY_SUSPEND_THRESHOLD,
  isReportReason,
  minDescriptionLength,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORT_SEVERITY,
  reportSeverity,
  SCAM_SUSPEND_THRESHOLD,
} from "@/lib/flagging-rules";

export type {
  PropertyStatusValue,
  PublicSafetyAlert,
  ReportReasonValue,
  ReportSeverity,
  SafetyLevel,
} from "@/lib/flagging-rules";

export interface FlagSyncResult {
  isFlagged: boolean;
  status: PropertyStatus;
  autoSuspended: boolean;
  newlyFlagged: boolean;
}

const OPEN_STATUSES: ReportStatus[] = ["PENDING", "UNDER_REVIEW"];

function settingIsEnabled(value: Prisma.JsonValue | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (value === false || value === 0 || value === "false" || value === "0") return false;
  return true;
}

export async function areReportsEnabled(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "enable_reports" },
    select: { value: true },
  });
  return settingIsEnabled(setting?.value ?? null);
}

interface OpenReportSummary {
  highSeverityReporters: number;
  scamReporters: number;
  topReason: ReportReasonValue | null;
}

function summarizeOpenReports(
  reports: Array<{ reporterId: string; reason: ReportReason }>
): OpenReportSummary {
  const highReporters = new Set<string>();
  const scamReporters = new Set<string>();
  const reasonCounts = new Map<ReportReasonValue, number>();

  for (const report of reports) {
    const reason = report.reason as ReportReasonValue;
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    if (REPORT_SEVERITY[reason] === "HIGH") {
      highReporters.add(report.reporterId);
    }
    if (reason === "SCAM" || reason === "FAKE_PROPERTY") {
      scamReporters.add(report.reporterId);
    }
  }

  let topReason: ReportReasonValue | null = null;
  let topCount = 0;
  for (const reason of REPORT_REASONS) {
    const count = reasonCounts.get(reason) || 0;
    const severityRank =
      REPORT_SEVERITY[reason] === "HIGH" ? 2 : REPORT_SEVERITY[reason] === "MEDIUM" ? 1 : 0;
    const currentRank = topReason
      ? REPORT_SEVERITY[topReason] === "HIGH"
        ? 2
        : REPORT_SEVERITY[topReason] === "MEDIUM"
          ? 1
          : 0
      : -1;
    if (count > topCount || (count === topCount && count > 0 && severityRank > currentRank)) {
      topReason = reason;
      topCount = count;
    }
  }

  return {
    highSeverityReporters: highReporters.size,
    scamReporters: scamReporters.size,
    topReason,
  };
}

async function notifyAdmins(title: string, body: string, link: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "SECURITY_ALERT" as const,
      title,
      body,
      link,
    })),
  });
}

async function notifyOwner(
  userId: string,
  type: "SECURITY_ALERT" | "LISTING_REJECTED",
  title: string,
  body: string,
  link: string
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, body, link },
  });
}

/**
 * Recalculate flag / suspend state from open reports.
 * Does not auto-restore a suspended listing — an admin must do that.
 */
export async function syncPropertyFlagState(propertyId: string): Promise<FlagSyncResult | null> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      isFlagged: true,
      flagReason: true,
      userId: true,
    },
  });
  if (!property) return null;

  const openReports = await prisma.report.findMany({
    where: { propertyId, status: { in: OPEN_STATUSES } },
    select: { reporterId: true, reason: true },
  });

  const summary = summarizeOpenReports(openReports);
  const shouldFlag = summary.highSeverityReporters >= FLAG_ALERT_THRESHOLD;
  const shouldSuspend =
    summary.scamReporters >= SCAM_SUSPEND_THRESHOLD ||
    summary.highSeverityReporters >= HIGH_SEVERITY_SUSPEND_THRESHOLD;

  const nextFlagged =
    shouldFlag || shouldSuspend || (property.status === "SUSPENDED" && property.isFlagged);
  const nextReason = shouldFlag || shouldSuspend ? summary.topReason : null;
  const canAutoSuspend =
    shouldSuspend && (property.status === "ACTIVE" || property.status === "PENDING_REVIEW");
  const nextStatus: PropertyStatus = canAutoSuspend ? "SUSPENDED" : property.status;

  const newlyFlagged = nextFlagged && !property.isFlagged;
  const autoSuspended = canAutoSuspend && property.status !== "SUSPENDED";

  if (
    property.isFlagged !== nextFlagged ||
    property.flagReason !== nextReason ||
    property.status !== nextStatus
  ) {
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        isFlagged: nextFlagged,
        flagReason: nextReason,
        flaggedAt: nextFlagged ? (property.isFlagged ? undefined : new Date()) : null,
        status: nextStatus,
      },
    });
    invalidatePropertyCaches(property.id, property.slug);
  }

  if (newlyFlagged) {
    await notifyOwner(
      property.userId,
      "SECURITY_ALERT",
      "Your listing was flagged for review",
      `“${property.title}” was reported. It stays visible for now while our team reviews it.`,
      `/properties/${property.slug}`
    );
  }

  if (autoSuspended) {
    await notifyOwner(
      property.userId,
      "LISTING_REJECTED",
      "Your listing was hidden after safety reports",
      `“${property.title}” was removed from search while we investigate scam reports.`,
      "/dashboard/landlord"
    );
    await notifyAdmins(
      `Listing auto-suspended: ${property.title}`,
      "Multiple independent scam/safety reports triggered an automatic takedown.",
      "/admin/reports"
    );
  }

  return {
    isFlagged: nextFlagged,
    status: nextStatus,
    autoSuspended,
    newlyFlagged,
  };
}

export async function applyAdminPropertyAction(
  propertyId: string,
  action: "suspend" | "restore" | "none",
  options?: { reason?: string | null }
): Promise<void> {
  if (action === "none") return;

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, slug: true, title: true, status: true, userId: true, isFlagged: true },
  });
  if (!property) return;

  if (action === "suspend" && property.status !== "SUSPENDED" && property.status !== "ARCHIVED") {
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        status: "SUSPENDED",
        isFlagged: true,
        flaggedAt: new Date(),
        flagReason: options?.reason ?? (property.isFlagged ? undefined : "SCAM"),
        isVerified: false,
      },
    });
    invalidatePropertyCaches(property.id, property.slug);
    await notifyOwner(
      property.userId,
      "LISTING_REJECTED",
      "Your listing was suspended",
      `“${property.title}” was hidden after a confirmed safety report. Do not collect payments through this listing.`,
      "/dashboard/landlord"
    );
  }

  if (action === "restore" && property.status === "SUSPENDED") {
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        status: "ACTIVE",
        isFlagged: false,
        flaggedAt: null,
        flagReason: null,
      },
    });
    invalidatePropertyCaches(property.id, property.slug);
  }
}

export async function notifyAdminsOfNewReport(input: {
  reason: ReportReasonValue;
  propertyTitle: string | null;
  reporterName: string;
}): Promise<void> {
  const severity = REPORT_SEVERITY[input.reason];
  if (severity !== "HIGH") return;

  const target = input.propertyTitle ? `“${input.propertyTitle}”` : "a user";
  await notifyAdmins(
    `New ${REPORT_REASON_LABELS[input.reason].toLowerCase()} report`,
    `${input.reporterName} reported ${target}.`,
    "/admin/reports"
  );
}
