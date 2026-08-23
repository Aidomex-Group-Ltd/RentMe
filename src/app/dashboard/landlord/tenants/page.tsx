"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Home,
  DollarSign,
  Wrench,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";

type TenancyWithDetails = {
  id: string;
  status: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  noticeGivenAt: string | null;
  property: { id: string; title: string; rent: number; district: string | null; city: string | null };
  unit: { id: string; unitNumber: string } | null;
  tenant: { id: string; name: string; avatar: string | null; email: string | null; phone: string | null };
  leases: { id: string; endDate: string; rentAmount: number; status: string }[];
  _count: { rentCharges: number; maintenanceRequests: number };
};

const STATUS_OPTIONS = [
  { value: "", label: "All Tenants" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending Move-in" },
  { value: "NOTICE_GIVEN", label: "Notice Given" },
  { value: "MOVE_OUT_SCHEDULED", label: "Moving Out" },
  { value: "ENDED", label: "Former Tenants" },
  { value: "TERMINATED", label: "Terminated" },
];

export default function LandlordTenantsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<TenancyWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchTenants();
    }
  }, [authStatus, statusFilter, page]);

  async function fetchTenants() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/tenancies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTenancies(data.tenancies || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  // Client-side search filter
  const filtered = tenancies.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.tenant.name?.toLowerCase().includes(q) ||
      t.tenant.email?.toLowerCase().includes(q) ||
      t.property.title?.toLowerCase().includes(q) ||
      t.unit?.unitNumber?.toLowerCase().includes(q)
    );
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "NOTICE_GIVEN":
        return "bg-orange-100 text-orange-800";
      case "MOVE_OUT_SCHEDULED":
        return "bg-red-100 text-red-800";
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
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">Tenants</h1>
                <p className="mt-1 text-gray-500">
                  Manage your tenants across all properties
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {total} total tenant{total !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar />
            </div>
          </div>
        </div>

        <div className="page-container py-6">

        {/* Search & Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, property, unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input w-auto"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tenant List */}
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">
              {search ? "No tenants match your search" : "No tenants yet"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Tenants will appear here once you approve applications and create tenancies.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {t.tenant.avatar ? (
                      <img
                        src={t.tenant.avatar}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      t.tenant.name?.[0] || "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{t.tenant.name}</p>
                    <p className="text-sm text-gray-500">
                      {t.property.title}
                      {t.unit ? ` · Unit ${t.unit.unitNumber}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatUGX(t.leases?.[0]?.rentAmount || t.property.rent)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.leases?.[0]?.endDate
                        ? `Lease ends ${new Date(t.leases[0].endDate).toLocaleDateString()}`
                        : "No active lease"}
                    </p>
                  </div>

                  {t._count.rentCharges > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {t._count.rentCharges} overdue
                    </span>
                  )}

                  {t._count.maintenanceRequests > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {t._count.maintenanceRequests} open
                    </span>
                  )}

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                      t.status
                    )}`}
                  >
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-secondary px-3 py-1 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn-secondary px-3 py-1 text-sm"
            >
              Next
            </button>
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
