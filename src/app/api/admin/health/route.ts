export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const checks: Record<string, { status: string; latencyMs?: number; details?: string }> = {};

    // Database check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: "healthy", latencyMs: Date.now() - dbStart };
    } catch (e: unknown) {
      checks.database = { status: "error", details: e instanceof Error ? e.message : "Unknown error" };
    }

    // Users count
    try {
      const userCount = await prisma.user.count({ where: { deletedAt: null } });
      checks.users = { status: "healthy", details: `${userCount} users` };
    } catch (e: unknown) {
      checks.users = { status: "error", details: e instanceof Error ? e.message : "Unknown error" };
    }

    // Properties count
    try {
      const propCount = await prisma.property.count({ where: { deletedAt: null } });
      checks.properties = { status: "healthy", details: `${propCount} properties` };
    } catch (e: unknown) {
      checks.properties = { status: "error", details: e instanceof Error ? e.message : "Unknown error" };
    }

    // Memory usage
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    checks.memory = {
      status: heapUsedMB < 512 ? "healthy" : "warning",
      details: `Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssMB}MB`,
    };

    // Uptime
    const uptimeSec = Math.floor(process.uptime());
    const uptimeHours = Math.floor(uptimeSec / 3600);
    const uptimeMins = Math.floor((uptimeSec % 3600) / 60);
    checks.uptime = {
      status: "healthy",
      details: `${uptimeHours}h ${uptimeMins}m`,
    };

    // Node.js version
    checks.runtime = {
      status: "healthy",
      details: `Node ${process.version} | ${process.platform} ${process.arch}`,
    };

    const overall = Object.values(checks).every((c) => c.status === "healthy") ? "healthy" : "degraded";

    return NextResponse.json({
      status: overall,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}
