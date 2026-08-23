"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  Calendar,
  FileText,
  Bell,
  ArrowRight,
  Clock,
  CheckCircle,
  DollarSign,
  Wrench,
  AlertTriangle,
  File,
  Download,
  Building2,
  User,
  ClipboardList,
  Key,
  ScrollText,
  LogOut,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import PropertyCard from "@/components/property/property-card";
import { formatUGX, timeAgo } from "@/lib/utils";

type Tenancy = {
  id: string;
  status: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  noticeGivenAt: string | null;
  noticeDeadline: string | null;
  property: { id: string; title: string; rent: number; district: string | null; city: string | null; slug?: string };
  unit: { id: string; unitNumber: string } | null;
  leases: { id: string; endDate: string; rentAmount: number; status: string }[];
  _count: { rentCharges: number; maintenanceRequests: number };
};

type RentSummary = {
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  overdueCount: number;
};

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [rentSummary, setRentSummary] = useState<RentSummary | null>(null);
  const [viewings, setViewings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
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
      const [tenRes, viewRes, appsRes, convsRes, noticesRes] = await Promise.all([
        fetch("/api/tenancies?limit=10"),
        fetch("/api/viewings?role=tenant"),
        fetch("/api/applications?role=tenant"),
        fetch("/api/conversations"),
        fetch("/api/notices?unread=true"),
      ]);
      const [tenData, viewData, appsData, convsData, noticesData] = await Promise.all([
        tenRes.json(),
        viewRes.json(),
        appsRes.json(),
        convsRes.json(),
        noticesRes.json(),
      ]);

      const tenancyList = tenData.tenancies || [];
      setTenancies(tenancyList);
      setViewings(viewData.viewings || []);
      setApplications(appsData.applications || []);
      setConversations(convsData.conversations || []);
      setNotices(noticesData.notices || []);

      // Fetch rent summary for active tenancy
      const activeTenancy = tenancyList.find((t: Tenancy) =>
        ["ACTIVE", "NOTICE_GIVEN"].includes(t.status)
      );
      if (activeTenancy) {
        const rentRes = await fetch(`/api/rent?tenancyId=${activeTenancy.id}`);
        if (rentRes.ok) {
          const rentData = await rentRes.json();
          setRentSummary(rentData.summary || null);
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  const activeTenancy = tenancies.find((t) =>
    ["ACTIVE", "PENDING", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"].includes(t.status)
  );

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE": return "bg-green-100 text-green-800";
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "NOTICE_GIVEN":
      case "MOVE_OUT_SCHEDULED": return "bg-orange-100 text-orange-800";
      case "ENDED":
      case "TERMINATED": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  My Dashboard
                </h1>
                <p className="mt-1 text-gray-500">
                  Welcome back, {session?.user?.name}
                </p>
              </div>
              <Link href="/search" className="btn-primary">
                <Search className="mr-2 h-4 w-4" />
                Find a House
              </Link>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar
                navItems={[
                  { label: "Dashboard", href: "/dashboard/tenant", icon: Home },
                  { label: "My Home", href: "/dashboard/tenant/tenancy", icon: Building2 },
                  { label: "Move In", href: "/dashboard/tenant/move-in", icon: Key },
                  { label: "Lease", href: "/dashboard/tenant/lease", icon: ScrollText },
                  { label: "Applications", href: "/dashboard/tenant/applications", icon: ClipboardList, badge: applications.filter((a: any) => ["SUBMITTED", "UNDER_REVIEW"].includes(a.status)).length || undefined },
                  { label: "Payments", href: "/dashboard/tenant/payments", icon: DollarSign },
                  { label: "Maintenance", href: "/dashboard/tenant/maintenance", icon: Wrench, badge: activeTenancy?._count?.maintenanceRequests },
                  { label: "Notices", href: "/dashboard/tenant/notices", icon: Bell, badge: notices.length || undefined },
                  { label: "Documents", href: "/dashboard/tenant/documents", icon: FileText },
                  { label: "Move Out", href: "/dashboard/tenant/move-out", icon: LogOut },
                  { label: "Profile", href: "/dashboard/tenant/profile", icon: User },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="page-container py-6 space-y-8">
          {/* Active Tenancy Card */}
          {activeTenancy && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {activeTenancy.property.title}
                    </h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(activeTenancy.status)}`}>
                      {activeTenancy.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTenancy.unit ? `Unit ${activeTenancy.unit.unitNumber} · ` : ""}
                    {activeTenancy.property.district}
                    {activeTenancy.property.city ? `, ${activeTenancy.property.city}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {activeTenancy.leases?.[0] && (
                  <>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Monthly Rent</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {formatUGX(activeTenancy.leases[0].rentAmount)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Lease Expires</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {new Date(activeTenancy.leases[0].endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </>
                )}
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Move-in Date</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {activeTenancy.moveInDate
                      ? new Date(activeTenancy.moveInDate).toLocaleDateString()
                      : "TBD"}
                  </p>
                </div>
                {rentSummary && (
                  <div className={`rounded-lg p-3 ${rentSummary.outstanding > 0 ? "bg-red-50" : "bg-green-50"}`}>
                    <p className="text-xs text-gray-500">Balance Due</p>
                    <p className={`mt-1 text-sm font-bold ${rentSummary.outstanding > 0 ? "text-red-700" : "text-green-700"}`}>
                      {formatUGX(rentSummary.outstanding)}
                    </p>
                    {rentSummary.overdueCount > 0 && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {rentSummary.overdueCount} overdue charge{rentSummary.overdueCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Link
                  href="/dashboard/tenant/payments"
                  className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  <DollarSign className="h-4 w-4" /> Pay Rent
                </Link>
                <Link
                  href="/dashboard/tenant/maintenance"
                  className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  <Wrench className="h-4 w-4" /> Maintenance
                </Link>
                <Link
                  href="/dashboard/tenant/notices"
                  className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                >
                  <Bell className="h-4 w-4" /> Notices
                </Link>
                <Link
                  href="/dashboard/tenant/documents"
                  className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
                >
                  <File className="h-4 w-4" /> Documents
                </Link>
              </div>

              {activeTenancy.status === "NOTICE_GIVEN" && (
                <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-medium text-orange-800">Notice Given</p>
                  </div>
                  <p className="mt-1 text-xs text-orange-700">
                    Your move-out deadline:{" "}
                    {activeTenancy.noticeDeadline
                      ? new Date(activeTenancy.noticeDeadline).toLocaleDateString()
                      : "TBD"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{tenancies.length}</p>
                  <p className="text-sm text-gray-500">Tenancies</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{viewings.length}</p>
                  <p className="text-sm text-gray-500">Viewings</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                  <p className="text-sm text-gray-500">Applications</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
                  <p className="text-sm text-gray-500">Conversations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Applications */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Applications</h2>
              <Link href="/applications" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            {applications.length > 0 ? (
              <div className="card divide-y divide-gray-100">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      {app.status === "APPROVED" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : app.status === "REJECTED" ? (
                        <span className="text-red-500">✕</span>
                      ) : (
                        <Clock className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/properties/${app.property?.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600 line-clamp-1">
                        {app.property?.title}
                      </Link>
                      <p className="text-xs text-gray-500">{app.property?.district}</p>
                    </div>
                    <span className={`badge ${
                      app.status === "APPROVED" ? "badge-verified" :
                      app.status === "REJECTED" ? "bg-red-100 text-red-800" : "badge-pending"
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">No applications yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When you apply for a property, it will appear here.
                </p>
                <Link href="/search" className="btn-primary mt-4 inline-flex text-sm">
                  Browse Properties
                </Link>
              </div>
            )}
          </section>

          {/* Recent Viewings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Viewing Requests</h2>
              <Link href="/viewings" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            {viewings.length > 0 ? (
              <div className="card divide-y divide-gray-100">
                {viewings.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Calendar className="h-5 w-5 text-brand-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/properties/${v.property?.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600 line-clamp-1">
                        {v.property?.title}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {new Date(v.date).toLocaleDateString()} at {v.time}
                      </p>
                    </div>
                    <span className={`badge ${
                      v.status === "CONFIRMED" ? "badge-verified" :
                      v.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      v.status === "CANCELLED" ? "bg-red-100 text-red-800" : "badge-pending"
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <Calendar className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">No viewing requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When you request to view a property, it will appear here.
                </p>
              </div>
            )}
          </section>

          {/* Recent Conversations */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <Link href="/messages" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            {conversations.length > 0 ? (
              <div className="card divide-y divide-gray-100">
                {conversations.slice(0, 5).map((conv: any) => {
                  const other = conv.participants?.find(
                    (p: any) => p.userId !== session?.user?.id
                  )?.user;
                  return (
                    <Link
                      key={conv.id}
                      href={`/messages/${conv.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-semibold">
                        {other?.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{other?.name}</p>
                          <p className="text-xs text-gray-400">
                            {conv.messages?.[0] ? timeAgo(conv.messages[0].createdAt) : ""}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {conv.property?.title}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {conv.messages?.[0]?.content || "No messages yet"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">No conversations yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When you contact a landlord or agent, your conversations will appear here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
