"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Search,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All Leases" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_SIGNATURE", label: "Pending Signature" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING", label: "Expiring" },
  { value: "RENEWAL_PENDING", label: "Renewal Pending" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_SIGNATURE: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRING: "bg-orange-100 text-orange-800",
  RENEWAL_PENDING: "bg-blue-100 text-blue-800",
  EXPIRED: "bg-red-100 text-red-800",
  TERMINATED: "bg-red-100 text-red-600",
};

type Lease = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number | null;
  paymentFrequency: string;
  signedAt: string | null;
  createdAt: string;
  tenancy: {
    id: string;
    status: string;
    tenant: { id: string; name: string; avatar: string | null };
    unit: { id: string; unitNumber: string } | null;
  };
  property: { id: string; title: string; district: string | null };
};

export default function LandlordLeasesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
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
    if (authStatus === "authenticated") fetchLeases();
  }, [authStatus, statusFilter, page]);

  async function fetchLeases() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/leases?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeases(data.leases || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  const filtered = leases.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.tenancy.tenant.name?.toLowerCase().includes(q) ||
      l.property.title?.toLowerCase().includes(q) ||
      l.tenancy.unit?.unitNumber?.toLowerCase().includes(q)
    );
  });

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 30;
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">Leases</h1>
                <p className="mt-1 text-gray-500">Manage leases across all your properties</p>
              </div>
              <div className="text-sm text-gray-500">
                {total} total lease{total !== 1 ? "s" : ""}
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
              placeholder="Search by tenant, property, unit..."
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

        {/* Lease List */}
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">
              {search ? "No leases match your search" : "No leases yet"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Create a lease after approving a tenant application.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {filtered.map((lease) => (
              <div
                key={lease.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                      {lease.tenancy.tenant.avatar ? (
                        <img
                          src={lease.tenancy.tenant.avatar}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        lease.tenancy.tenant.name?.[0] || "?"
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{lease.tenancy.tenant.name}</p>
                      <p className="text-sm text-gray-500">
                        {lease.property.title}
                        {lease.tenancy.unit ? ` · Unit ${lease.tenancy.unit.unitNumber}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatUGX(lease.rentAmount)}/{lease.paymentFrequency.toLowerCase().slice(0, 3)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(lease.startDate).toLocaleDateString()} —{" "}
                        {new Date(lease.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    {isExpiringSoon(lease.endDate) && lease.status === "ACTIVE" && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        <AlertTriangle className="h-3 w-3" />
                        Expiring soon
                      </span>
                    )}

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[lease.status] || ""}`}
                    >
                      {lease.status.replace(/_/g, " ")}
                    </span>

                    <Link
                      href={`/dashboard/landlord/tenants/${lease.tenancy.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      View
                    </Link>
                  </div>
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
