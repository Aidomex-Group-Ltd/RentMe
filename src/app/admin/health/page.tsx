"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Database,
  Server,
  HardDrive,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { toast } from "sonner";

interface HealthCheck {
  status: string;
  latencyMs?: number;
  details?: string;
}

interface HealthData {
  status: string;
  timestamp: string;
  checks: Record<string, HealthCheck>;
}

const CHECK_ICONS: Record<string, typeof Database> = {
  database: Database,
  memory: HardDrive,
  uptime: Clock,
  runtime: Server,
  users: Activity,
  properties: Activity,
};

function statusIcon(s: string) {
  if (s === "healthy") return <CheckCircle className="h-5 w-5 text-green-600" aria-hidden />;
  if (s === "warning" || s === "degraded") {
    return <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />;
  }
  return <XCircle className="h-5 w-5 text-red-600" aria-hidden />;
}

function statusBg(s: string) {
  if (s === "healthy") return "border-green-200 bg-green-50";
  if (s === "warning" || s === "degraded") return "border-amber-200 bg-amber-50";
  return "border-red-200 bg-red-50";
}

function statusText(s: string) {
  if (s === "healthy") return "text-green-800";
  if (s === "warning" || s === "degraded") return "text-amber-800";
  return "text-red-800";
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setHealth(data);
    } catch {
      setError("Unable to load system health. Please try again.");
      toast.error("Unable to load system health. Please try again.");
      setHealth(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overall = health?.status || "error";

  return (
    <div>
      <AdminPageHeader
        title="System health"
        description={
          health?.timestamp
            ? `Last checked ${new Date(health.timestamp).toLocaleString()}`
            : "Live checks for database, memory, and runtime"
        }
        actions={
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="btn-secondary text-sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {loading && !health ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white" />
              ))}
            </div>
          </div>
        ) : error && !health ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : health ? (
          <>
            <div className={`rounded-lg border-2 p-5 ${statusBg(overall)}`}>
              <div className="flex items-center gap-3">
                {statusIcon(overall)}
                <div>
                  <h2 className={`text-base font-semibold capitalize ${statusText(overall)}`}>
                    System {overall}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {overall === "healthy"
                      ? "All checks are operating normally."
                      : overall === "degraded"
                        ? "Some checks need attention."
                        : "Health checks reported errors."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(health.checks).map(([name, check]) => {
                const Icon = CHECK_ICONS[name] || Activity;
                return (
                  <div key={name} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${statusBg(
                          check.status
                        )}`}
                      >
                        <Icon className={`h-5 w-5 ${statusText(check.status)}`} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold capitalize text-gray-900">{name}</p>
                          {statusIcon(check.status)}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {check.details || check.status}
                        </p>
                        {check.latencyMs !== undefined && (
                          <p className="mt-0.5 text-xs text-gray-400">{check.latencyMs}ms</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
