"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Home,
  Eye,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { formatUGX } from "@/lib/utils";
import { toast } from "sonner";

interface AnalyticsData {
  stats: {
    totalUsers: number;
    userGrowth: number;
    activeListings: number;
    pendingReview: number;
    totalViewings: number;
    monthlyRevenue: number;
    rentedProperties: number;
    pendingReports: number;
    pendingApplications: number;
    totalRevenue: number;
    roleBreakdown: {
      tenants: number;
      landlords: number;
      agents: number;
      admins: number;
    };
  };
  charts: {
    dailyUsers: Array<{ date: string; count: number }>;
    dailyProperties: Array<{ date: string; count: number }>;
    districtBreakdown: Array<{ district: string; count: number }>;
    propertyTypeBreakdown: Array<{ type: string; count: number }>;
  };
}

const COLORS = ["#1e40af", "#16a34a", "#ea580c", "#dc2626", "#0e7490", "#ca8a04", "#4b5563"];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Unable to load analytics. Please try again.");
      toast.error("Unable to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = data?.stats;
  const charts = data?.charts;

  const roleData = stats?.roleBreakdown
    ? [
        { name: "Tenants", value: stats.roleBreakdown.tenants },
        { name: "Landlords", value: stats.roleBreakdown.landlords },
        { name: "Agents", value: stats.roleBreakdown.agents },
        { name: "Admins", value: stats.roleBreakdown.admins },
      ].filter((d) => d.value > 0)
    : [];

  const statCards = stats
    ? [
        {
          label: "Total users",
          value: stats.totalUsers.toLocaleString(),
          icon: Users,
          sub: `${stats.userGrowth >= 0 ? "+" : ""}${stats.userGrowth}% this month`,
        },
        {
          label: "Active listings",
          value: stats.activeListings.toLocaleString(),
          icon: Home,
          sub: `${stats.pendingReview} pending review`,
        },
        {
          label: "Viewings (30d)",
          value: stats.totalViewings.toLocaleString(),
          icon: Eye,
          sub: "Last 30 days",
        },
        {
          label: "Revenue (30d)",
          value: formatUGX(stats.monthlyRevenue),
          icon: DollarSign,
          sub: "Completed payments",
        },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="Analytics"
        description="Platform metrics for the last 30 days"
        actions={
          <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {loading && !data ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
        ) : data && stats && charts ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {statCards.map((s) => (
                <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {s.label}
                    </p>
                    <s.icon className="h-4 w-4 text-gray-400" aria-hidden />
                  </div>
                  <p className="mt-2 text-xl font-bold tabular-nums text-gray-900">{s.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartPanel title="User registrations (30 days)">
                <TrendArea data={charts.dailyUsers} color="#1e40af" />
              </ChartPanel>
              <ChartPanel title="New listings (30 days)">
                <TrendBar data={charts.dailyProperties} color="#16a34a" />
              </ChartPanel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartPanel title="Listings by district">
                {charts.districtBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={charts.districtBreakdown} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis
                        type="category"
                        dataKey="district"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        width={72}
                      />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#1e40af" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </ChartPanel>

              <ChartPanel title="User roles">
                {roleData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {roleData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </ChartPanel>

              <ChartPanel title="Property types">
                {charts.propertyTypeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={charts.propertyTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="type"
                        label={({ type, percent }) =>
                          `${String(type).replace(/_/g, " ")} ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {charts.propertyTypeBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </ChartPanel>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Rented properties", value: stats.rentedProperties },
                { label: "Pending reports", value: stats.pendingReports },
                { label: "Pending applications", value: stats.pendingApplications },
                { label: "Total revenue", value: formatUGX(stats.totalRevenue) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center"
                >
                  <p className="text-lg font-bold tabular-nums text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
      No data for this period
    </div>
  );
}

function TrendArea({
  data,
  color,
}: {
  data: Array<{ date: string; count: number }>;
  color: string;
}) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickFormatter={(v) => String(v).slice(5)}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} width={28} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Area type="monotone" dataKey="count" stroke={color} fill={color} fillOpacity={0.12} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TrendBar({
  data,
  color,
}: {
  data: Array<{ date: string; count: number }>;
  color: string;
}) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickFormatter={(v) => String(v).slice(5)}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} width={28} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
