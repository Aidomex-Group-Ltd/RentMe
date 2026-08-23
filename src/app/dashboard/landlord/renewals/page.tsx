"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Home,
  DollarSign,
  Calendar,
  Users,
  FileText,
  Loader2,
  Send,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All Renewals" },
  { value: "OFFERED", label: "Offered" },
  { value: "TENANT_REVIEWING", label: "Tenant Reviewing" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "EXPIRED", label: "Expired" },
];

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: any; label: string; description: string }
> = {
  OFFERED: {
    color: "bg-blue-100 text-blue-800",
    icon: Send,
    label: "Offered",
    description: "Renewal offer sent to tenant. Awaiting response.",
  },
  TENANT_REVIEWING: {
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    label: "Reviewing",
    description: "Tenant is reviewing the renewal terms.",
  },
  ACCEPTED: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Accepted",
    description: "Tenant accepted. New lease created and ready for review.",
  },
  DECLINED: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Declined",
    description: "Tenant declined the renewal.",
  },
  EXPIRED: {
    color: "bg-gray-100 text-gray-600",
    icon: Clock,
    label: "Expired",
    description: "Renewal offer expired without response.",
  },
};

type Renewal = {
  id: string;
  status: string;
  proposedRent: number;
  proposedTerms: string | null;
  respondedAt: string | null;
  responseNotes: string | null;
  createdAt: string;
  offeredBy: { id: string; name: string } | null;
  tenancy: {
    id: string;
    status: string;
    property: { id: string; title: string };
    unit: { unitNumber: string } | null;
    tenant: { id: string; name: string; avatar: string | null };
    leases: { id: string; endDate: string; rentAmount: number }[];
  };
};

type Tenancy = {
  id: string;
  status: string;
  moveInDate: string | null;
  property: { id: string; title: string; rent: number };
  unit: { id: string; unitNumber: string } | null;
  tenant: { id: string; name: string; avatar: string | null };
  leases: {
    id: string;
    endDate: string;
    rentAmount: number;
    status: string;
    noticePeriodDays: number;
  }[];
};

export default function LandlordRenewalsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Offer renewal modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    tenancyId: "",
    proposedRent: "",
    proposedTerms: "",
  });
  const [offering, setOffering] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchData();
  }, [authStatus]);

  async function fetchData() {
    setLoading(true);
    try {
      const [renewalsRes, tenanciesRes] = await Promise.all([
        fetch("/api/renewals"),
        fetch("/api/tenancies?limit=50"),
      ]);

      if (renewalsRes.ok) {
        const data = await renewalsRes.json();
        setRenewals(data.renewals || []);
      }
      if (tenanciesRes.ok) {
        const data = await tenanciesRes.json();
        // Only show active/expiring tenancies eligible for renewal
        const eligible = (data.tenancies || []).filter((t: Tenancy) =>
          ["ACTIVE", "NOTICE_GIVEN"].includes(t.status)
        );
        setTenancies(eligible);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  async function handleOfferRenewal() {
    if (!offerForm.tenancyId || !offerForm.proposedRent) {
      toast.error("Please select a tenancy and enter proposed rent");
      return;
    }

    setOffering(true);
    try {
      const res = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: offerForm.tenancyId,
          proposedRent: parseInt(offerForm.proposedRent, 10),
          proposedTerms: offerForm.proposedTerms || null,
        }),
      });

      if (res.ok) {
        toast.success("Renewal offer sent to tenant");
        setShowOfferModal(false);
        setOfferForm({ tenancyId: "", proposedRent: "", proposedTerms: "" });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to offer renewal");
      }
    } catch {
      toast.error("Failed to offer renewal");
    } finally {
      setOffering(false);
    }
  }

  const filtered = renewals.filter((r) => {
    if (!statusFilter) return true;
    return r.status === statusFilter;
  });

  // Counts
  const counts = {
    total: renewals.length,
    pending: renewals.filter((r) =>
      ["OFFERED", "TENANT_REVIEWING"].includes(r.status)
    ).length,
    accepted: renewals.filter((r) => r.status === "ACCEPTED").length,
    declined: renewals.filter((r) => r.status === "DECLINED").length,
  };

  // Tenancies without pending renewals (eligible for new offers)
  const tenancyIdsWithPendingRenewal = new Set(
    renewals
      .filter((r) => ["OFFERED", "TENANT_REVIEWING"].includes(r.status))
      .map((r) => r.tenancy.id)
  );

  const eligibleTenancies = tenancies.filter(
    (t) => !tenancyIdsWithPendingRenewal.has(t.id)
  );

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Lease Renewals
                </h1>
                <p className="mt-1 text-gray-500">
                  Offer renewals and track tenant responses
                </p>
              </div>
              <button
                onClick={() => setShowOfferModal(true)}
                className="btn-primary"
                disabled={eligibleTenancies.length === 0}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Offer Renewal
              </button>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar />
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-gray-500" />
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {counts.total}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-500">Pending</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {counts.pending}
              </p>
              {counts.pending > 0 && (
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Awaiting response
                </span>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-gray-500">Accepted</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {counts.accepted}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-gray-500">Declined</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {counts.declined}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500">
              {filtered.length} renewal{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Renewals List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <RefreshCw className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {statusFilter
                  ? "No renewals match this filter"
                  : "No renewals yet"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter
                  ? "Try selecting a different filter."
                  : "Offer a renewal to a tenant to get started."}
              </p>
              {!statusFilter && eligibleTenancies.length > 0 && (
                <button
                  onClick={() => setShowOfferModal(true)}
                  className="btn-primary mt-4 text-sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Offer Renewal
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((renewal) => {
                const config =
                  STATUS_CONFIG[renewal.status] || STATUS_CONFIG.OFFERED;
                const StatusIcon = config.icon;
                const isExpanded = expandedId === renewal.id;
                const currentLease = renewal.tenancy.leases?.[0];
                const currentRent = currentLease?.rentAmount || 0;
                const rentChange = renewal.proposedRent - currentRent;
                const rentChangePct =
                  currentRent > 0
                    ? Math.round((rentChange / currentRent) * 100)
                    : 0;

                return (
                  <div
                    key={renewal.id}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Main Row */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        {/* Tenant & Property Info */}
                        <div className="flex items-start gap-4">
                          {/* Tenant Avatar */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                            {renewal.tenancy.tenant.avatar ? (
                              <img
                                src={renewal.tenancy.tenant.avatar}
                                alt=""
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              renewal.tenancy.tenant.name?.[0] || "?"
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {renewal.tenancy.tenant.name}
                              </h3>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
                              >
                                <StatusIcon className="mr-1 inline h-3 w-3" />
                                {config.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">
                              {renewal.tenancy.property.title}
                              {renewal.tenancy.unit
                                ? ` · Unit ${renewal.tenancy.unit.unitNumber}`
                                : ""}
                            </p>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                              <span>Offered {timeAgo(renewal.createdAt)}</span>
                              {renewal.respondedAt && (
                                <span>
                                  Responded {timeAgo(renewal.respondedAt)}
                                </span>
                              )}
                              {currentLease?.endDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Current lease ends{" "}
                                  {new Date(
                                    currentLease.endDate
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rent Comparison */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              Proposed Rent
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatUGX(renewal.proposedRent)}
                            </p>
                            <p
                              className={`text-xs font-medium ${
                                rentChange > 0
                                  ? "text-red-600"
                                  : rentChange < 0
                                  ? "text-green-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {rentChange > 0 ? "+" : ""}
                              {formatUGX(rentChange)} ({rentChangePct > 0 ? "+" : ""}
                              {rentChangePct}%)
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : renewal.id)
                            }
                            className="rounded-lg bg-gray-50 p-2 text-gray-500 hover:bg-gray-100"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 sm:p-5">
                        <p className="text-sm text-gray-600">
                          {config.description}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {/* Renewal Details */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Renewal Terms
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                  Current Rent
                                </span>
                                <span className="font-medium text-gray-900">
                                  {formatUGX(currentRent)}/mo
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                  Proposed Rent
                                </span>
                                <span className="font-medium text-gray-900">
                                  {formatUGX(renewal.proposedRent)}/mo
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Change</span>
                                <span
                                  className={`font-medium ${
                                    rentChange > 0
                                      ? "text-red-600"
                                      : rentChange < 0
                                      ? "text-green-600"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {rentChange > 0 ? "+" : ""}
                                  {formatUGX(rentChange)} ({rentChangePct > 0 ? "+" : ""}
                                  {rentChangePct}%)
                                </span>
                              </div>
                              {currentLease?.endDate && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">
                                    New Term Start
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {(() => {
                                      const d = new Date(currentLease.endDate);
                                      d.setDate(d.getDate() + 1);
                                      return d.toLocaleDateString();
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Response Details */}
                          <div>
                            <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Response
                            </h4>
                            {renewal.responseNotes ? (
                              <div className="rounded-lg bg-white border border-gray-200 p-3">
                                <p className="text-sm text-gray-700 whitespace-pre-line">
                                  &ldquo;{renewal.responseNotes}&rdquo;
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic">
                                {renewal.status === "OFFERED"
                                  ? "Awaiting tenant response"
                                  : renewal.status === "TENANT_REVIEWING"
                                  ? "Tenant is reviewing"
                                  : "No response notes"}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Proposed Terms */}
                        {renewal.proposedTerms && (
                          <div className="mt-4">
                            <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Additional Terms
                            </h4>
                            <div className="rounded-lg bg-white border border-gray-200 p-3">
                              <p className="text-sm text-gray-700 whitespace-pre-line">
                                {renewal.proposedTerms}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 flex items-center gap-3">
                          {renewal.status === "ACCEPTED" && (
                            <Link
                              href="/dashboard/landlord/leases"
                              className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              View New Lease
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/landlord/tenants/${renewal.tenancy.id}`}
                            className="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            View Tenant
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Offer Renewal Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Offer Lease Renewal
              </h2>
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferForm({ tenancyId: "", proposedRent: "", proposedTerms: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Send a renewal offer to a tenant. They will be notified and can
              accept or decline.
            </p>

            <div className="mt-6 space-y-4">
              {/* Tenancy Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Tenancy
                </label>
                <select
                  value={offerForm.tenancyId}
                  onChange={(e) => {
                    const tenancy = eligibleTenancies.find(
                      (t) => t.id === e.target.value
                    );
                    setOfferForm((prev) => ({
                      ...prev,
                      tenancyId: e.target.value,
                      proposedRent: tenancy
                        ? String(tenancy.leases?.[0]?.rentAmount || tenancy.property.rent)
                        : prev.proposedRent,
                    }));
                  }}
                  className="input mt-1"
                >
                  <option value="">Select a tenancy...</option>
                  {eligibleTenancies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tenant.name} — {t.property.title}
                      {t.unit ? ` (Unit ${t.unit.unitNumber})` : ""} — Current:{" "}
                      {formatUGX(t.leases?.[0]?.rentAmount || t.property.rent)}/mo
                    </option>
                  ))}
                </select>
                {eligibleTenancies.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    All active tenancies already have pending renewal offers.
                  </p>
                )}
              </div>

              {/* Proposed Rent */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Proposed Monthly Rent (UGX)
                </label>
                <input
                  type="number"
                  value={offerForm.proposedRent}
                  onChange={(e) =>
                    setOfferForm((prev) => ({
                      ...prev,
                      proposedRent: e.target.value,
                    }))
                  }
                  className="input mt-1"
                  placeholder="e.g. 850000"
                  min={1000}
                />
                {offerForm.tenancyId && offerForm.proposedRent && (
                  (() => {
                    const tenancy = eligibleTenancies.find(
                      (t) => t.id === offerForm.tenancyId
                    );
                    if (!tenancy) return null;
                    const current =
                      tenancy.leases?.[0]?.rentAmount || tenancy.property.rent;
                    const proposed = parseInt(offerForm.proposedRent, 10);
                    if (isNaN(proposed)) return null;
                    const change = proposed - current;
                    const pct =
                      current > 0 ? Math.round((change / current) * 100) : 0;
                    return (
                      <p
                        className={`mt-1 text-xs font-medium ${
                          change > 0
                            ? "text-red-600"
                            : change < 0
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {change > 0 ? "+" : ""}
                        {formatUGX(change)} ({pct > 0 ? "+" : ""}
                        {pct}%) from current rent
                      </p>
                    );
                  })()
                )}
              </div>

              {/* Proposed Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Additional Terms{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={offerForm.proposedTerms}
                  onChange={(e) =>
                    setOfferForm((prev) => ({
                      ...prev,
                      proposedTerms: e.target.value,
                    }))
                  }
                  className="input mt-1"
                  rows={3}
                  placeholder="e.g. 12-month lease, no pets, includes parking..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferForm({ tenancyId: "", proposedRent: "", proposedTerms: "" });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleOfferRenewal}
                disabled={
                  offering ||
                  !offerForm.tenancyId ||
                  !offerForm.proposedRent
                }
                className="btn-primary disabled:opacity-50"
              >
                {offering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Offer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
