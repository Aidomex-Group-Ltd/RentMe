import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Fetch recent admin-relevant notifications (new listings, reports, etc.)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Fetch recent notifications that are relevant to admins:
    // 1. New pending review listings
    // 2. New reports
    // 3. New verification requests
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 5 * 60 * 1000); // last 5 min default

    const [pendingListings, newReports, pendingVerifications] = await Promise.all([
      prisma.property.findMany({
        where: { status: "PENDING_REVIEW", listedAt: { gte: sinceDate } },
        select: { id: true, title: true, listedAt: true, user: { select: { name: true } } },
        orderBy: { listedAt: "desc" },
        take: limit,
      }),
      prisma.report.findMany({
        where: { status: "PENDING", createdAt: { gte: sinceDate } },
        select: {
          id: true,
          reason: true,
          createdAt: true,
          reporter: { select: { name: true } },
          property: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.verificationRequest.findMany({
        where: { status: "PENDING", createdAt: { gte: sinceDate } },
        select: {
          id: true,
          type: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    // Combine into unified notification list
    const notifications = [
      ...pendingListings.map((l) => ({
        id: `listing-${l.id}`,
        type: "listing_review" as const,
        title: `New listing: ${l.title}`,
        detail: `By ${l.user?.name || "Unknown"}`,
        timestamp: l.listedAt,
      })),
      ...newReports.map((r) => ({
        id: `report-${r.id}`,
        type: "report" as const,
        title: `New report: ${r.reason}`,
        detail: `By ${r.reporter?.name || "Unknown"}${r.property ? ` about "${r.property.title}"` : ""}`,
        timestamp: r.createdAt,
      })),
      ...pendingVerifications.map((v) => ({
        id: `verification-${v.id}`,
        type: "verification" as const,
        title: `New verification: ${v.type}`,
        detail: `By ${v.user?.name || "Unknown"}`,
        timestamp: v.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      notifications,
      counts: {
        pendingListings: await prisma.property.count({ where: { status: "PENDING_REVIEW" } }),
        pendingReports: await prisma.report.count({ where: { status: "PENDING" } }),
        pendingVerifications: await prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      },
    });
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
