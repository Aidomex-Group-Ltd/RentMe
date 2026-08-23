"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Eye,
  Heart,
  Calendar,
  FileText,
  TrendingUp,
  ArrowRight,
  Users,
  DollarSign,
  Wrench,
  Key,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

export default function LandlordDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [viewings, setViewings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  async function fetchData() {
    try {
      const [propsRes, viewingsRes, appsRes, reportRes] = await Promise.all([
        fetch("/api/properties?mine=1&limit=50"),
        fetch("/api/viewings?role=landlord"),
        fetch("/api/applications?role=landlord"),
        fetch("/api/reports?type=overview"),
      ]);
      const [propsData, viewingsData, appsData, reportData] = await Promise.all([
        propsRes.json(),
        viewingsRes.json(),
        appsRes.json(),
        reportRes.json(),
      ]);
      setProperties(propsData.properties || []);
      setViewings(viewingsData.viewings || []);
      setApplications(appsData.applications || []);
      setReport(reportData.report || null);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      label: "Properties",
      value: properties.length,
      icon: Home,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Occupancy",
      value: report?.occupancy?.occupancyRate != null ? `${report.occupancy.occupancyRate}%` : "—",
      icon: TrendingUp,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Active Tenants",
      value: report?.tenants?.active || 0,
      icon: Users,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Outstanding",
      value: report?.financial?.outstanding ? formatUGX(report.financial.outstanding) : "—",
      icon: DollarSign,
      color: "text-red-600 bg-red-50",
    },
  ];

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Landlord Dashboard
                </h1>
                <p className="mt-1 text-gray-500">
                  Welcome back, {session?.user?.name}
                </p>
              </div>
              <Link href="/dashboard/landlord/create" className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                List Property
              </Link>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar
                navItems={[
                  { label: "Dashboard", href: "/dashboard/landlord", icon: Home },
                  { label: "Tenants", href: "/dashboard/landlord/tenants", icon: Users },
                  { label: "Leases", href: "/dashboard/landlord/leases", icon: FileText },
                  { label: "Maintenance", href: "/dashboard/landlord/maintenance", icon: Wrench, badge: report?.maintenance?.open },
                  { label: "Reports", href: "/dashboard/landlord/reports", icon: TrendingUp },
                  { label: "Messages", href: "/messages", icon: DollarSign },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Navigation */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Link
              href="/dashboard/landlord/tenants"
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
            >
              <Users className="h-7 w-7 text-blue-600" />
              <p className="mt-2 text-sm font-medium text-gray-900">Tenants</p>
            </Link>
            <Link
              href="/dashboard/landlord/leases"
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
            >
              <FileText className="h-7 w-7 text-purple-600" />
              <p className="mt-2 text-sm font-medium text-gray-900">Leases</p>
            </Link>
            <Link
              href="/dashboard/landlord/maintenance"
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
            >
              <Wrench className="h-7 w-7 text-orange-600" />
              <p className="mt-2 text-sm font-medium text-gray-900">Maintenance</p>
              {report?.maintenance?.open > 0 && (
                <span className="mt-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {report.maintenance.open} open
                </span>
              )}
            </Link>
            <Link
              href="/dashboard/landlord/reports"
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
            >
              <BarChart3 className="h-7 w-7 text-green-600" />
              <p className="mt-2 text-sm font-medium text-gray-900">Reports</p>
            </Link>
            <Link
              href="/messages"
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
            >
              <MessageSquare className="h-7 w-7 text-indigo-600" />
              <p className="mt-2 text-sm font-medium text-gray-900">Messages</p>
            </Link>
            <Link
              href="/dashboard/landlord/create"
              className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white p-4 transition hover:border-brand-400 hover:shadow-md"
            >
              <Plus className="h-7 w-7 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-500">New Listing</p>
            </Link>
          </div>

          {/* Portfolio & Maintenance Overview */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Financial Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <DollarSign className="h-5 w-5 text-green-600" />
                Financial Summary
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Due</span>
                  <span className="font-medium text-gray-900">{formatUGX(report?.financial?.totalDue || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Paid</span>
                  <span className="font-medium text-green-700">{formatUGX(report?.financial?.totalPaid || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Outstanding</span>
                  <span className="font-medium text-red-700">{formatUGX(report?.financial?.outstanding || 0)}</span>
                </div>
              </div>
              <Link
                href="/dashboard/landlord/reports?type=financial"
                className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View Financial Report <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Occupancy */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Key className="h-5 w-5 text-blue-600" />
                Occupancy
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Units</span>
                  <span className="font-medium text-gray-900">{report?.occupancy?.totalUnits || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Occupied</span>
                  <span className="font-medium text-green-700">{report?.occupancy?.occupiedUnits || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Available</span>
                  <span className="font-medium text-blue-700">{report?.occupancy?.availableUnits || 0}</span>
                </div>
                {report?.occupancy?.occupancyRate != null && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Occupancy Rate</span>
                      <span className="font-medium text-gray-900">{report.occupancy.occupancyRate}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${report.occupancy.occupancyRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <Link
                href="/dashboard/landlord/reports?type=occupancy"
                className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View Occupancy Report <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Maintenance */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                <Wrench className="h-5 w-5 text-orange-600" />
                Maintenance
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Open Requests</span>
                  <span className="font-medium text-gray-900">{report?.maintenance?.open || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Urgent</span>
                  <span className="font-medium text-red-700">{report?.maintenance?.urgent || 0}</span>
                </div>
              </div>
              <Link
                href="/dashboard/landlord/maintenance"
                className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View All Maintenance <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Listings */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">My Listings</h2>
                  <Link href="/search" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    View all
                  </Link>
                </div>
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="skeleton h-20 w-24 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 w-3/4" />
                          <div className="skeleton h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : properties.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {properties.slice(0, 5).map((property) => (
                      <div key={property.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {property.images?.[0] ? (
                            <img src={property.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl">🏠</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/properties/${property.slug}`}
                            className="text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-1"
                          >
                            {property.title}
                          </Link>
                          <p className="text-xs text-gray-500">{property.district}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                            <span>{formatUGX(property.rent)}/mo</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {property.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {property.saveCount || 0}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`badge ${
                            property.status === "ACTIVE"
                              ? "badge-active"
                              : property.status === "PENDING_REVIEW"
                              ? "badge-pending"
                              : property.status === "RENTED"
                              ? "badge-rented"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {property.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Home className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900">No listings yet</h3>
                    <p className="mt-1 text-gray-500">Start by listing your first property.</p>
                    <Link href="/dashboard/landlord/create" className="btn-primary mt-4 inline-flex">
                      <Plus className="mr-2 h-4 w-4" />
                      List Property
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pending Viewings */}
              <div className="card">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">Viewing Requests</h2>
                </div>
                {viewings.filter((v) => v.status === "REQUESTED").length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {viewings
                      .filter((v) => v.status === "REQUESTED")
                      .slice(0, 5)
                      .map((v) => (
                        <div key={v.id} className="px-6 py-3">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {v.property?.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {v.tenant?.name} • {new Date(v.date).toLocaleDateString()} at {v.time}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Calendar className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No pending viewings</p>
                  </div>
                )}
              </div>

              {/* Recent Applications */}
              <div className="card">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">Applications</h2>
                </div>
                {applications.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {applications.slice(0, 5).map((app) => (
                      <div key={app.id} className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {app.tenant?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          for {app.property?.title}
                        </p>
                        <span className="badge-pending mt-1 text-xs">{app.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No applications yet</p>
                  </div>
                )}
              </div>

              {/* Expiring Leases */}
              {report?.expiringLeases?.length > 0 && (
                <div className="card">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="font-semibold text-gray-900">Expiring Leases</h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {report.expiringLeases.slice(0, 5).map((l: any) => (
                      <div key={l.id} className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900">{l.tenant}</p>
                        <p className="text-xs text-gray-500">
                          Expires {new Date(l.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
