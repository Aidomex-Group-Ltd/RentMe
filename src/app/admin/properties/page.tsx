"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  Shield,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import StatusBadge from "@/components/admin/status-badge";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import { formatUGX, PROPERTY_TYPES } from "@/lib/utils";
import { toast } from "sonner";

interface PropertyRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  isVerified: boolean;
  isFlagged?: boolean;
  district: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rent: number;
  listedAt: string;
  propertyType: string;
  user: { id: string; name: string; email: string | null; role: string } | null;
  images: Array<{ url: string }>;
  _count: { savedBy: number; reports: number };
}

interface ConfirmAction {
  property: PropertyRow;
  status?: string;
  isVerified?: boolean;
}

const STATUS_TABS = ["", "PENDING_REVIEW", "ACTIVE", "SUSPENDED", "RENTED", "DRAFT", "ARCHIVED"];
const PAGE_SIZE = 20;

function actionCopy(action: ConfirmAction): {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "warning" | "neutral";
  success: string;
} {
  const title = action.property.title;
  if (action.isVerified !== undefined && action.status === undefined) {
    return action.isVerified
      ? {
          title: "Verify listing",
          description: `Mark “${title}” as verified? This signals trust to tenants and can be undone.`,
          confirmLabel: "Verify",
          tone: "neutral",
          success: "Listing verified",
        }
      : {
          title: "Remove verification",
          description: `Remove verified status from “${title}”? This can be restored later.`,
          confirmLabel: "Unverify",
          tone: "warning",
          success: "Verification removed",
        };
  }
  if (action.status === "ACTIVE") {
    return {
      title: action.property.status === "PENDING_REVIEW" ? "Approve listing" : "Restore listing",
      description:
        action.property.status === "PENDING_REVIEW"
          ? `Approve “${title}” and make it live? The owner will be notified. You can suspend it later.`
          : `Restore “${title}” to active? It will become publicly visible again.`,
      confirmLabel: action.property.status === "PENDING_REVIEW" ? "Approve" : "Restore",
      tone: "neutral",
      success: action.property.status === "PENDING_REVIEW" ? "Listing approved" : "Listing restored",
    };
  }
  if (action.status === "SUSPENDED") {
    return {
      title: action.property.status === "PENDING_REVIEW" ? "Reject listing" : "Suspend listing",
      description:
        action.property.status === "PENDING_REVIEW"
          ? `Reject “${title}”? It will be suspended and the owner notified. This can be reversed by restoring.`
          : `Suspend “${title}”? It will be hidden from search. This can be reversed.`,
      confirmLabel: action.property.status === "PENDING_REVIEW" ? "Reject" : "Suspend",
      tone: "danger",
      success: action.property.status === "PENDING_REVIEW" ? "Listing rejected" : "Listing suspended",
    };
  }
  return {
    title: "Update listing",
    description: `Update “${title}”?`,
    confirmLabel: "Confirm",
    tone: "neutral",
    success: "Listing updated",
  };
}

export default function AdminPropertiesPage() {
  return (
    <Suspense
      fallback={
        <div>
          <AdminPageHeader title="Properties" description="Loading listings…" />
          <div className="space-y-3 px-4 py-6 sm:px-6 lg:px-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        </div>
      }
    >
      <AdminPropertiesContent />
    </Suspense>
  );
}

function AdminPropertiesContent() {
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [district, setDistrict] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [verified, setVerified] = useState("");
  const [flagged, setFlagged] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("status") || "";
    setStatusFilter(fromUrl);
    setPage(1);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (q) params.set("q", q);
      if (district) params.set("district", district);
      if (propertyType) params.set("propertyType", propertyType);
      if (verified) params.set("verified", verified);
      if (flagged) params.set("flagged", flagged);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/properties?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setError("Unable to load properties. Please try again.");
      toast.error("Unable to load properties. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q, district, propertyType, verified, flagged, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyAction() {
    if (!confirm) return;
    setActing(true);
    const copy = actionCopy(confirm);
    try {
      const body: Record<string, unknown> = { propertyId: confirm.property.id };
      if (confirm.status !== undefined) body.status = confirm.status;
      if (confirm.isVerified !== undefined) body.isVerified = confirm.isVerified;

      const res = await fetch("/api/admin/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(copy.success);
      setConfirm(null);
      await load();
    } catch {
      toast.error("Failed to update property. Please try again.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Properties"
        description={`${total.toLocaleString()} listings · moderate, verify, and suspend`}
        actions={
          <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-brand-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s ? s.replace(/_/g, " ") : "All"}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                placeholder="Search title, district, owner…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setQ(qInput.trim());
                  }
                }}
                className="input pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setPage(1);
                }}
                className="input w-36"
              />
              <select
                value={propertyType}
                onChange={(e) => {
                  setPropertyType(e.target.value);
                  setPage(1);
                }}
                className="input w-auto"
                aria-label="Property type"
              >
                <option value="">All types</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={verified}
                onChange={(e) => {
                  setVerified(e.target.value);
                  setPage(1);
                }}
                className="input w-auto"
                aria-label="Verified filter"
              >
                <option value="">Verified: any</option>
                <option value="true">Verified only</option>
                <option value="false">Unverified only</option>
              </select>
              <select
                value={flagged}
                onChange={(e) => {
                  setFlagged(e.target.value);
                  setPage(1);
                }}
                className="input w-auto"
                aria-label="Flagged filter"
              >
                <option value="">Flagged: any</option>
                <option value="true">Flagged only</option>
                <option value="false">Not flagged</option>
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setPage(1);
                  setQ(qInput.trim());
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {loading && properties.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error && properties.length === 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No properties found</p>
            <p className="mt-1 text-sm text-gray-500">
              Adjust status or search filters, or clear them to see all listings.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {properties.map((p) => (
                <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-28 sm:w-36">
                      {p.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Home className="h-8 w-8 text-gray-300" aria-hidden />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-gray-900">{p.title}</h3>
                            {p.isVerified && (
                              <Shield className="h-4 w-4 shrink-0 text-green-600" aria-label="Verified" />
                            )}
                            {p.isFlagged && (
                              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-label="Flagged" />
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden />
                              {p.neighborhood || p.district || "Uganda"}
                            </span>
                            <span>
                              {p.bedrooms ?? "—"} bed · {p.bathrooms ?? "—"} bath
                            </span>
                            <span className="font-medium text-brand-700">{formatUGX(p.rent)}/mo</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            by {p.user?.name || "Unknown"} · Listed{" "}
                            {new Date(p.listedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>

                      {p.isFlagged && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          Scam alert active
                        </div>
                      )}
                      {p._count?.reports > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {p._count.reports} open report{p._count.reports > 1 ? "s" : ""}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.status === "PENDING_REVIEW" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setConfirm({ property: p, status: "ACTIVE" })}
                              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
                            >
                              <CheckCircle className="h-3.5 w-3.5" aria-hidden /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirm({ property: p, status: "SUSPENDED" })}
                              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                            >
                              <XCircle className="h-3.5 w-3.5" aria-hidden /> Reject
                            </button>
                          </>
                        )}
                        {p.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => setConfirm({ property: p, status: "SUSPENDED" })}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden /> Suspend
                          </button>
                        )}
                        {p.status === "SUSPENDED" && (
                          <button
                            type="button"
                            onClick={() => setConfirm({ property: p, status: "ACTIVE" })}
                            className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
                          >
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden /> Restore
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({ property: p, isVerified: !p.isVerified })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
                        >
                          <Shield className="h-3.5 w-3.5" aria-hidden />
                          {p.isVerified ? "Unverify" : "Verify"}
                        </button>
                        <a
                          href={`/properties/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden /> View
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary text-xs"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary text-xs"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          open
          title={actionCopy(confirm).title}
          description={actionCopy(confirm).description}
          confirmLabel={actionCopy(confirm).confirmLabel}
          tone={actionCopy(confirm).tone}
          loading={acting}
          onConfirm={applyAction}
          onCancel={() => !acting && setConfirm(null)}
        />
      )}
    </div>
  );
}
