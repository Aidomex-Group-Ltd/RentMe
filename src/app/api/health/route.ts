import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/cache";

// Health returns 503 when the database is unreachable so orchestrators fail the check.
export const dynamic = "force-dynamic";

export async function GET() {
  const health: Record<string, unknown> = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
  };

  let dbStatus = "healthy";
  let dbLatencyMs: number | null = null;
  try {
    const prisma = (await import("@/lib/prisma")).default;
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
  } catch (error) {
    dbStatus = "unhealthy";
    health.status = "unhealthy";
    // Do not leak connection strings or credentials
    health.dbError = "database_unreachable";
    if (process.env.NODE_ENV !== "production") {
      health.dbErrorDetail =
        error instanceof Error ? error.message : "Unknown database error";
    }
  }

  health.database = {
    status: dbStatus,
    latencyMs: dbLatencyMs,
  };

  // In-process LRU memory cache — free, no external account
  health.cache = {
    backend: "memory",
    ...getCacheStats(),
  };

  const statusCode = health.status === "healthy" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
