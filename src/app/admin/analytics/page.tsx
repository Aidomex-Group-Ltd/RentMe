"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Home,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  Loader2,
  BarChart3,
  Eye,
  Building,
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
import MainLayout from "@/components/layout/main-layout";
import { formatUGX } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = ["#1e40af", "#16a34a", "#f97316", "#dc2626", "#8b5cf6", "#06b6d4", "#eab308"];

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchAnalytics();
  }, [status]);

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      </MainLayout>
    );
  }

  const stats = data?.stats;
  const charts = data?.charts;

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "bg-blue-50 text-blue-600", sub: `${stats?.userGrowth || 0}% this month` },
    { label: "Active Listings", value: stats?.activeListings || 0, icon: Home, color: "bg-green-50 text-green-600", sub: `${stats?.pendingReview || 0} pending` },
    { label: "Total Views", value: stats?.totalViewings || 0, icon: Eye, color: "bg-purple-50 text-purple-600", sub: "last 30 days" },
    { label: "Revenue", value: formatUGX(stats?.monthlyRevenue || 0), icon: DollarSign, color: "bg-accent-50 text-accent-600", sub: "this month" },
  ];

  const roleData = stats?.roleBreakdown
    ? [
        { name: "Tenants", value: stats.roleBreakdown.tenants },
        { name: "Landlords", value: stats.roleBreakdown.landlords },
        { name: "Agents", value: stats.roleBreakdown.agents },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/admin")} className="p-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-display">Analytics</h1>
                <p className="text-sm text-gray-500">Platform metrics and insights</p>
              </div>
            </div>
          </div>
        </div>

        <div className="page-container py-6 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((s) => (
              <div key={s.label} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* User registrations chart */}
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-gray-900">User Registrations (30 days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={charts?.dailyUsers || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#1e40af" fill="#dbeafe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Property listings chart */}
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-gray-900">New Listings (30 days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts?.dailyProperties || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                    contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* District breakdown */}
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Listings by District</h3>
              {charts?.districtBreakdown?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={charts.districtBreakdown} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="district" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid #e5e7eb" }} />
                    <Bar dataKey="count" fill="#1e40af" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No data</p>
              )}
            </div>

            {/* Role breakdown pie */}
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-gray-900">User Roles</h3>
              {roleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {roleData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No data</p>
              )}
            </div>

            {/* Property types pie */}
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Property Types</h3>
              {charts?.propertyTypeBreakdown?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={charts.propertyTypeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="type"
                      label={({ type, percent }) => `${type.replace(/_/g, " ")} ${(percent * 100).toFixed(0)}%`}
                    >
                      {charts.propertyTypeBreakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No data</p>
              )}
            </div>
          </div>

          {/* Summary stats row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats?.rentedProperties || 0}</p>
              <p className="text-sm text-gray-500">Rented Properties</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingReports || 0}</p>
              <p className="text-sm text-gray-500">Pending Reports</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingApplications || 0}</p>
              <p className="text-sm text-gray-500">Pending Applications</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{formatUGX(stats?.totalRevenue || 0)}</p>
              <p className="text-sm text-gray-500">Total Revenue</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
