"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Activity,
  Database,
  Server,
  HardDrive,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";

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

export default function AdminHealthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchHealth();
  }, [status]);

  async function fetchHealth() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({
        status: "error",
        timestamp: new Date().toISOString(),
        checks: { api: { status: "error", details: "Failed to fetch health data" } },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const statusIcon = (s: string) => {
    if (s === "healthy") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (s === "warning" || s === "degraded") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const statusBg = (s: string) => {
    if (s === "healthy") return "border-green-200 bg-green-50";
    if (s === "warning" || s === "degraded") return "border-yellow-200 bg-yellow-50";
    return "border-red-200 bg-red-50";
  };

  const statusText = (s: string) => {
    if (s === "healthy") return "text-green-700";
    if (s === "warning" || s === "degraded") return "text-yellow-700";
    return "text-red-700";
  };

  const checkIcons: Record<string, any> = {
    database: Database,
    memory: HardDrive,
    uptime: Clock,
    runtime: Server,
    users: Activity,
    properties: Activity,
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-display">System Health</h1>
                <p className="text-sm text-gray-500">
                    Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : "Never"}
                  </p>
                </div>
              <button onClick={fetchHealth} disabled={refreshing} className="btn-secondary">
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="page-container py-6 space-y-6">
          {/* Overall status */}
          <div className={`card border-2 p-6 ${statusBg(health?.status || "error")}`}>
            <div className="flex items-center gap-4">
              {statusIcon(health?.status || "error")}
              <div>
                <h2 className={`text-lg font-semibold capitalize ${statusText(health?.status || "error")}`}>
                  System {health?.status || "Unknown"}
                </h2>
                <p className="text-sm text-gray-500">
                  {health?.status === "healthy"
                    ? "All systems are operating normally"
                    : health?.status === "degraded"
                    ? "Some systems are experiencing issues"
                    : "System is experiencing errors"}
                </p>
              </div>
            </div>
          </div>

          {/* Individual checks */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health?.checks &&
              Object.entries(health.checks).map(([name, check]) => {
                const Icon = checkIcons[name] || Activity;
                return (
                  <div key={name} className="card p-5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${statusBg(check.status)}`}>
                        <Icon className={`h-5 w-5 ${statusText(check.status)}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 capitalize">{name}</p>
                          {statusIcon(check.status)}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{check.details || check.status}</p>
                        {check.latencyMs !== undefined && (
                          <p className="text-xs text-gray-400 mt-0.5">{check.latencyMs}ms response</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
