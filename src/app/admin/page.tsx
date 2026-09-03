"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Home,
  AlertTriangle,
  Shield,
  Clock,
  Activity,
  HeartPulse,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import StatusBadge from "@/components/admin/status-badge";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    pendingVerificationUsers: number;
    userGrowth: number;
    totalProperties: number;
    activeListings: number;
    pendingReview: number;
    suspendedProperties: number;
    reportedProperties: number;
    pendingReports: number;
    pendingVerifications: number;
  };
  queues: {
    recentUsers: Array<{
      id: string;
      name: string;
      email: string | null;
      role: string;
      status: string;
      createdAt: string;
    }>;
    recentProperties: Array<{
      id: string;
      title: string;
      district: string | null;
      status: string;
      listedAt: string;
      user: { name: string } | null;
    }>;
    recentVerifications: Array<{
      id: string;
      type: string;
      createdAt: string;
      user: { name: string; role: string } | null;
    }>;
    recentActivity: Array<{
      id: string;
      action: string;
      entity: string;
      entityId: string | null;
      createdAt: string;
      user: { name: string } | null;
    }>;
  };
  charts: {
    dailyUsers: Array<{ date: string; count: number }>;
    dailyProperties: Array<{ date: string; count: number }>;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Unable to load admin dashboard. Please try again.");
      toast.error("Unable to load admin dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const kpis = data
    ? [
        {
          label: "Users",
          value: data.stats.totalUsers,
          hint: `${data.stats.activeUsers} active · ${data.stats.userGrowth >= 0 ? "+" : ""}${data.stats.userGrowth}% growth`,
          href: "/admin/users",
          icon: Users,
        },
        {
          label: "Properties",
          value: data.stats.totalProperties,
          hint: `${data.stats.activeListings} active listings`,
          href: "/admin/properties",
          icon: Home,
        },
        {
          label: "Pending Review",
          value: data.stats.pendingReview,
          hint: "Listings awaiting moderation",
          href: "/admin/properties?status=PENDING_REVIEW",
          icon: Clock,
        },
        {
          label: "Pending Verification",
          value: data.stats.pendingVerifications,
          hint: `${data.stats.pendingVerificationUsers} users pending verification`,
          href: "/admin/verification",
          icon: Shield,
        },
        {
          label: "Open Reports",
          value: data.stats.pendingReports,
          hint: "Needs investigation",
          href: "/admin/reports",
          icon: AlertTriangle,
        },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="Operational snapshot of the Erikot Properties platform"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Overview" }]}
        actions={
          <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {loading && !data ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error && !data ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <section aria-label="Key metrics">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {kpis.map((kpi) => (
                  <Link
                    key={kpi.label}
                    href={kpi.href}
                    className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {kpi.label}
                      </p>
                      <kpi.icon className="h-4 w-4 text-gray-400" aria-hidden />
                    </div>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">
                      {kpi.value.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{kpi.hint}</p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Attention queues */}
            <section aria-label="Needs attention">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Needs attention</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Pending property reviews",
                    value: data.stats.pendingReview,
                    href: "/admin/properties?status=PENDING_REVIEW",
                  },
                  {
                    label: "Pending verifications",
                    value: data.stats.pendingVerifications,
                    href: "/admin/verification",
                  },
                  {
                    label: "Open reports",
                    value: data.stats.pendingReports,
                    href: "/admin/reports",
                  },
                  {
                    label: "Suspended properties",
                    value: data.stats.suspendedProperties,
                    href: "/admin/properties?status=SUSPENDED",
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-brand-300"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">Open queue</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tabular-nums text-gray-900">
                        {item.value}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-300" aria-hidden />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Charts */}
            <section aria-label="Trends" className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="User growth (30 days)" data={data.charts.dailyUsers} dataKey="count" color="#1e40af" />
              <ChartCard
                title="Property activity (30 days)"
                data={data.charts.dailyProperties}
                dataKey="count"
                color="#ea580c"
              />
            </section>

            {/* Recent */}
            <section className="grid gap-4 lg:grid-cols-2">
              <RecentCard
                title="Recent registrations"
                href="/admin/users"
                empty="No recent registrations"
                rows={data.queues.recentUsers.map((u) => ({
                  id: u.id,
                  primary: u.name,
                  secondary: `${u.role} · ${u.email || "No email"}`,
                  meta: new Date(u.createdAt).toLocaleDateString(),
                  badge: u.status,
                }))}
              />
              <RecentCard
                title="Recent property submissions"
                href="/admin/properties"
                empty="No recent properties"
                rows={data.queues.recentProperties.map((p) => ({
                  id: p.id,
                  primary: p.title,
                  secondary: `by ${p.user?.name || "Unknown"} · ${p.district || "—"}`,
                  meta: new Date(p.listedAt).toLocaleDateString(),
                  badge: p.status,
                }))}
              />
              <RecentCard
                title="Verification queue"
                href="/admin/verification"
                empty="No pending verifications"
                rows={data.queues.recentVerifications.map((v) => ({
                  id: v.id,
                  primary: v.user?.name || "Applicant",
                  secondary: `${v.type} · ${v.user?.role || ""}`,
                  meta: new Date(v.createdAt).toLocaleDateString(),
                  badge: "PENDING",
                }))}
              />
              <RecentCard
                title="Recent admin activity"
                href="/admin/activity"
                empty="No recent activity"
                rows={data.queues.recentActivity.map((a) => ({
                  id: a.id,
                  primary: `${a.action} ${a.entity}`,
                  secondary: a.user?.name || "System",
                  meta: new Date(a.createdAt).toLocaleString(),
                }))}
              />
            </section>

            <div className="flex flex-wrap gap-3">
              <Link href="/admin/health" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                <HeartPulse className="h-4 w-4" aria-hidden /> System health
              </Link>
              <Link href="/admin/activity" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
                <Activity className="h-4 w-4" aria-hidden /> Full audit log
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  dataKey,
  color,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  color: string;
}) {
  const hasData = data.some((d) => Number(d[dataKey]) > 0);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-3 h-48">
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No activity in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(v) => String(v).slice(5)}
                minTickGap={24}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} width={28} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }}
                labelFormatter={(v) => String(v)}
              />
              <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function RecentCard({
  title,
  href,
  empty,
  rows,
}: {
  title: string;
  href: string;
  empty: string;
  rows: Array<{
    id: string;
    primary: string;
    secondary: string;
    meta: string;
    badge?: string;
  }>;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Link href={href} className="text-xs font-medium text-brand-600 hover:underline">
          View all
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">{empty}</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{row.primary}</p>
                <p className="truncate text-xs text-gray-500">{row.secondary}</p>
              </div>
              {row.badge && <StatusBadge status={row.badge} />}
              <span className="shrink-0 text-[11px] text-gray-400">{row.meta}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
