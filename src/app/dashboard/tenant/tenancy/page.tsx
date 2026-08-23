"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Home,
  FileText,
  DollarSign,
  Calendar,
  Wrench,
  Bell,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";

export default function TenantTenancyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchTenancies();
    }
  }, [status]);

  async function fetchTenancies() {
    try {
      const res = await fetch("/api/tenancies?limit=10");
      if (res.ok) {
        const data = await res.json();
        setTenancies(data.tenancies || []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  const activeTenancy = tenancies.find((t) =>
    ["ACTIVE", "PENDING", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"].includes(t.status)
  );

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "NOTICE_GIVEN":
      case "MOVE_OUT_SCHEDULED":
        return "bg-orange-100 text-orange-800";
      case "ENDED":
      case "TERMINATED":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <h1 className="text-2xl font-bold text-gray-900 font-display">My Home</h1>
            <p className="mt-1 text-gray-500">Your tenancy information and current home details</p>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-8">

        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : !activeTenancy ? (
          <div className="mt-12 text-center">
            <Home className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">No active tenancy</p>
            <p className="mt-1 text-sm text-gray-400">
              Browse properties and apply to get started.
            </p>
            <Link
              href="/properties"
              className="btn-primary mt-6 inline-flex items-center gap-2"
            >
              Browse Properties <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Active Tenancy Card */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeTenancy.property?.title || "Your Property"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {activeTenancy.unit ? `Unit ${activeTenancy.unit.unitNumber} · ` : ""}
                    {activeTenancy.property?.district}
                    {activeTenancy.property?.city ? `, ${activeTenancy.property.city}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                    activeTenancy.status
                  )}`}
                >
                  {activeTenancy.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Move-in Date</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {activeTenancy.moveInDate
                      ? new Date(activeTenancy.moveInDate).toLocaleDateString()
                      : "TBD"}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Current Rent</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatUGX(activeTenancy.property?.rent || 0)}
                  </p>
                </div>
                {activeTenancy.leases?.[0] && (
                  <>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Lease Ends</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {new Date(activeTenancy.leases[0].endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Lease Status</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {activeTenancy.leases[0].status.replace(/_/g, " ")}
                      </p>
                    </div>
                  </>
                )}
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

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Link
                href="/dashboard/tenant/payments"
                className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <DollarSign className="h-8 w-8 text-green-600" />
                <p className="mt-2 text-sm font-medium text-gray-900">Rent & Payments</p>
              </Link>
              <Link
                href="/dashboard/tenant/maintenance"
                className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <Wrench className="h-8 w-8 text-blue-600" />
                <p className="mt-2 text-sm font-medium text-gray-900">Maintenance</p>
              </Link>
              <Link
                href="/messages"
                className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <Bell className="h-8 w-8 text-purple-600" />
                <p className="mt-2 text-sm font-medium text-gray-900">Messages</p>
              </Link>
              <Link
                href={`/properties/${activeTenancy.propertyId}`}
                className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <Home className="h-8 w-8 text-orange-600" />
                <p className="mt-2 text-sm font-medium text-gray-900">Property Details</p>
              </Link>
            </div>
          </>
        )}

        {/* All Tenancies History */}
        {!loading && tenancies.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900">Tenancy History</h3>
            <div className="mt-4 space-y-3">
              {tenancies.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {t.property?.title || "Property"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t.unit ? `Unit ${t.unit.unitNumber} · ` : ""}
                      {t.moveInDate
                        ? `Since ${new Date(t.moveInDate).toLocaleDateString()}`
                        : "Start date TBD"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                      t.status
                    )}`}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
