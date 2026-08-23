"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Home,
  DollarSign,
  Wrench,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX } from "@/lib/utils";

type ReportType = "overview" | "occupancy" | "financial" | "maintenance" | "lease";

export default function LandlordReportsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>("overview");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchReport();
    }
  }, [authStatus, reportType]);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${reportType}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  const reportTypes: { id: ReportType; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "occupancy", label: "Occupancy", icon: Home },
    { id: "financial", label: "Financial", icon: DollarSign },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "lease", label: "Leases", icon: FileText },
  ];

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <h1 className="text-2xl font-bold text-gray-900 font-display">Reports</h1>
            <p className="mt-1 text-gray-500">Portfolio analytics and insights</p>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar />
            </div>

            {/* Report Type Tabs */}
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    reportType === type.id
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : !report ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-lg font-medium text-gray-500">No data available</p>
              <p className="mt-1 text-sm text-gray-400">
                Add properties and tenants to see reports.
              </p>
            </div>
          ) : (
            <>
              {/* Overview */}
              {reportType === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                      label="Properties"
                      value={report.properties || 0}
                      icon={<Home className="h-5 w-5 text-blue-600" />}
                      bg="bg-blue-50"
                    />
                    <StatCard
                      label="Occupancy Rate"
                      value={`${report.occupancy?.occupancyRate || 0}%`}
                      icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                      bg="bg-green-50"
                    />
                    <StatCard
                      label="Active Tenants"
                      value={report.tenants?.active || 0}
                      icon={<Users className="h-5 w-5 text-purple-600" />}
                      bg="bg-purple-50"
                    />
                    <StatCard
                      label="Outstanding"
                      value={formatUGX(report.financial?.outstanding || 0)}
                      icon={<DollarSign className="h-5 w-5 text-red-600" />}
                      bg="bg-red-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <h3 className="font-semibold text-gray-900">Occupancy</h3>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Units</span>
                          <span className="font-medium text-gray-900">{report.occupancy?.totalUnits || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Occupied</span>
                          <span className="font-medium text-green-700">{report.occupancy?.occupiedUnits || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Available</span>
                          <span className="font-medium text-blue-700">{report.occupancy?.availableUnits || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <h3 className="font-semibold text-gray-900">Financial</h3>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Due</span>
                          <span className="font-medium text-gray-900">{formatUGX(report.financial?.totalDue || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Paid</span>
                          <span className="font-medium text-green-700">{formatUGX(report.financial?.totalPaid || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Outstanding</span>
                          <span className="font-medium text-red-700">{formatUGX(report.financial?.outstanding || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <h3 className="font-semibold text-gray-900">Maintenance</h3>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Open Requests</span>
                          <span className="font-medium text-gray-900">{report.maintenance?.open || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Urgent</span>
                          <span className="font-medium text-red-700">{report.maintenance?.urgent || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <h3 className="font-semibold text-gray-900">Tenants</h3>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Active</span>
                          <span className="font-medium text-green-700">{report.tenants?.active || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Pending Move-in</span>
                          <span className="font-medium text-yellow-700">{report.tenants?.pending || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Occupancy */}
              {reportType === "occupancy" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                    <StatCard label="Total Units" value={report.summary?.totalUnits || 0} icon={<Home className="h-5 w-5" />} bg="bg-gray-50" />
                    <StatCard label="Occupied" value={report.summary?.occupied || 0} icon={<CheckIcon />} bg="bg-green-50" />
                    <StatCard label="Available" value={report.summary?.available || 0} icon={<Home className="h-5 w-5" />} bg="bg-blue-50" />
                    <StatCard label="Reserved" value={report.summary?.reserved || 0} icon={<Clock className="h-5 w-5" />} bg="bg-yellow-50" />
                    <StatCard label="Occupancy" value={`${report.summary?.occupancyRate || 0}%`} icon={<TrendingUp className="h-5 w-5" />} bg="bg-purple-50" />
                  </div>

                  {report.perProperty?.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white">
                      <div className="border-b border-gray-100 px-6 py-4">
                        <h3 className="font-semibold text-gray-900">By Property</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {report.perProperty.map((p: any) => (
                          <div key={p.propertyId} className="flex items-center justify-between px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{p.title}</p>
                              <p className="text-sm text-gray-500">
                                {p.occupied}/{p.totalUnits} units occupied
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{p.occupancyRate}%</p>
                              <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-green-500"
                                  style={{ width: `${p.occupancyRate}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Financial */}
              {reportType === "financial" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard label="Total Due" value={formatUGX(report.summary?.totalDue || 0)} icon={<DollarSign className="h-5 w-5" />} bg="bg-gray-50" />
                    <StatCard label="Total Paid" value={formatUGX(report.summary?.totalPaid || 0)} icon={<TrendingUp className="h-5 w-5" />} bg="bg-green-50" />
                    <StatCard label="Outstanding" value={formatUGX(report.summary?.outstanding || 0)} icon={<TrendingDown className="h-5 w-5" />} bg="bg-red-50" />
                    <StatCard label="Collection Rate" value={`${report.collectionRate || 100}%`} icon={<BarChart3 className="h-5 w-5" />} bg="bg-blue-50" />
                  </div>

                  {report.overdue?.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white">
                      <div className="border-b border-gray-100 px-6 py-4">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          Overdue Accounts ({report.overdue.length})
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {report.overdue.map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{o.tenant}</p>
                              <p className="text-sm text-gray-500">
                                {o.property}{o.unit ? ` · Unit ${o.unit}` : ""} · Due {new Date(o.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-700">{formatUGX(o.outstanding)}</p>
                              <p className="text-xs text-red-500">{o.daysOverdue} days overdue</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.recentPayments?.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white">
                      <div className="border-b border-gray-100 px-6 py-4">
                        <h3 className="font-semibold text-gray-900">Recent Payments</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {report.recentPayments.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between px-6 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.payer}</p>
                              <p className="text-xs text-gray-500">
                                {p.paymentMethod || "Unknown method"} · {new Date(p.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="font-medium text-green-700">{formatUGX(p.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Maintenance */}
              {reportType === "maintenance" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard label="Total" value={report.summary?.total || 0} icon={<Wrench className="h-5 w-5" />} bg="bg-gray-50" />
                    <StatCard label="Open" value={report.summary?.open || 0} icon={<Clock className="h-5 w-5" />} bg="bg-blue-50" />
                    <StatCard label="Urgent" value={report.summary?.urgent || 0} icon={<AlertTriangle className="h-5 w-5" />} bg="bg-red-50" />
                    <StatCard label="Avg Resolution" value={`${report.summary?.avgResolutionDays || 0}d`} icon={<TrendingUp className="h-5 w-5" />} bg="bg-green-50" />
                  </div>

                  {report.byStatus?.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <h3 className="font-semibold text-gray-900">By Status</h3>
                      <div className="mt-4 space-y-2">
                        {report.byStatus.map((s: any) => (
                          <div key={s.status} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{s.status.replace(/_/g, " ")}</span>
                            <span className="text-sm font-medium text-gray-900">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.byCategory?.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <h3 className="font-semibold text-gray-900">By Category</h3>
                      <div className="mt-4 space-y-2">
                        {report.byCategory.map((c: any) => (
                          <div key={c.category} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{c.category}</span>
                            <span className="text-sm font-medium text-gray-900">{c.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lease */}
              {reportType === "lease" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard label="Total Leases" value={report.summary?.total || 0} icon={<FileText className="h-5 w-5" />} bg="bg-gray-50" />
                    <StatCard label="Active" value={report.summary?.active || 0} icon={<CheckIcon />} bg="bg-green-50" />
                    <StatCard label="Expiring Soon" value={report.summary?.expiringSoon || 0} icon={<AlertTriangle className="h-5 w-5" />} bg="bg-orange-50" />
                    <StatCard label="Draft" value={report.summary?.draft || 0} icon={<Clock className="h-5 w-5" />} bg="bg-yellow-50" />
                  </div>

                  {report.expiringWithin30Days?.length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
                      <h3 className="flex items-center gap-2 font-semibold text-orange-800">
                        <AlertTriangle className="h-5 w-5" />
                        Expiring Within 30 Days
                      </h3>
                      <div className="mt-4 space-y-3">
                        {report.expiringWithin30Days.map((l: any) => (
                          <div key={l.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                            <div>
                              <p className="font-medium text-gray-900">{l.tenant}</p>
                              <p className="text-sm text-gray-500">
                                {l.property}{l.unit ? ` · Unit ${l.unit}` : ""} · Ends {new Date(l.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="font-medium text-gray-900">{formatUGX(l.rentAmount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.byStatus?.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <h3 className="font-semibold text-gray-900">By Status</h3>
                      <div className="mt-4 space-y-2">
                        {report.byStatus.map((s: any) => (
                          <div key={s.status} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{s.status.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-gray-900">{s.count}</span>
                              <span className="text-sm text-gray-500">{formatUGX(s.totalRent)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
