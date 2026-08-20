import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const health: Record<string, unknown> = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
  };

  // Check database connectivity
  let dbStatus = "healthy";
  let dbLatencyMs: number | null = null;
  try {
    const prisma = (await import("@/lib/prisma")).default;
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch (error) {
    dbStatus = "unhealthy";
    health.status = "degraded";
    health.dbError =
      error instanceof Error ? error.message : "Unknown database error";
  }

  health.database = {
    status: dbStatus,
    latencyMs: dbLatencyMs,
  };

  const statusCode = health.status === "healthy" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
