"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
  Loader2,
  MapPin,
  Home,
  Shield,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { formatUGX } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminPropertiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchProperties();
  }, [status, page, filter]);

  async function fetchProperties() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/properties?${params}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  }

  const updateProperty = async (propertyId: string, status: string, isVerified?: boolean) => {
    try {
      await fetch("/api/admin/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, status, isVerified }),
      });
      toast.success(`Property ${status.toLowerCase()}`);
      fetchProperties();
    } catch {
      toast.error("Failed to update property");
    }
  };

  const statusConfig: Record<string, { label: string; class: string }> = {
    ACTIVE: { label: "Active", class: "badge-active" },
    PENDING_REVIEW: { label: "Pending", class: "badge-pending" },
    SUSPENDED: { label: "Suspended", class: "bg-red-100 text-red-800" },
    RENTED: { label: "Rented", class: "badge-rented" },
    DRAFT: { label: "Draft", class: "bg-gray-100 text-gray-600" },
    ARCHIVED: { label: "Archived", class: "bg-gray-100 text-gray-600" },
  };

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
                <h1 className="text-xl font-bold text-gray-900 font-display">Property Moderation</h1>
                <p className="text-sm text-gray-500">{total} properties</p>
              </div>
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Status filter tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {["", "PENDING_REVIEW", "ACTIVE", "SUSPENDED", "RENTED", "DRAFT"].map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s); setPage(1); }}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === s
                    ? "bg-brand-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s ? s.replace(/_/g, " ") : "All"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : properties.length > 0 ? (
            <div className="space-y-4">
              {properties.map((p) => (
                <div key={p.id} className="card p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Cover image */}
                    <div className="h-32 w-40 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Home className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold text-gray-900">{p.title}</h3>
                            {p.isVerified && <Shield className="h-4 w-4 shrink-0 text-green-500" />}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {p.neighborhood || p.district || "Uganda"}
                            </span>
                            <span>{p.bedrooms} bed · {p.bathrooms} bath</span>
                            <span className="font-medium text-brand-600">{formatUGX(p.rent)}/mo</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            by {p.user?.name} · Listed {new Date(p.listedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs ${statusConfig[p.status]?.class || "bg-gray-100 text-gray-600"}`}>
                          {statusConfig[p.status]?.label || p.status}
                        </span>
                      </div>

                      {/* Reports warning */}
                      {p._count?.reports > 0 && (
                        <div className="mt-2 flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          {p._count.reports} report{p._count.reports > 1 ? "s" : ""}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.status === "PENDING_REVIEW" && (
                          <>
                            <button
                              onClick={() => updateProperty(p.id, "ACTIVE")}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => updateProperty(p.id, "SUSPENDED")}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </>
                        )}
                        {p.status === "ACTIVE" && (
                          <button
                            onClick={() => updateProperty(p.id, "SUSPENDED")}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Suspend
                          </button>
                        )}
                        {p.status === "SUSPENDED" && (
                          <button
                            onClick={() => updateProperty(p.id, "ACTIVE")}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Restore
                          </button>
                        )}
                        <button
                          onClick={() => updateProperty(p.id, p.status, !p.isVerified)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          {p.isVerified ? "Unverify" : "Verify"}
                        </button>
                        <a
                          href={`/properties/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {total > 20 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary text-xs"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
                  <button
                    disabled={page >= Math.ceil(total / 20)}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary text-xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center text-gray-500">No properties found</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
