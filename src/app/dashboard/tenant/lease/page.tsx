"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Home,
  DollarSign,
  Calendar,
  ArrowRight,
  RefreshCw,
  MapPin,
  BedDouble,
  Bath,
  Loader2,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const LEASE_STATUS_CONFIG: Record<
  string,
  { color: string; icon: any; label: string }
> = {
  DRAFT: { color: "bg-gray-100 text-gray-600", icon: FileText, label: "Draft" },
  PENDING_SIGNATURE: {
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    label: "Pending Signature",
  },
  ACTIVE: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Active",
  },
  EXPIRING: {
    color: "bg-orange-100 text-orange-800",
    icon: AlertTriangle,
    label: "Expiring Soon",
  },
  RENEWAL_PENDING: {
    color: "bg-blue-100 text-blue-800",
    icon: RefreshCw,
    label: "Renewal Pending",
  },
  EXPIRED: {
    color: "bg-red-100 text-red-600",
    icon: XCircle,
    label: "Expired",
  },
  TERMINATED: {
    color: "bg-red-100 text-red-600",
    icon: XCircle,
    label: "Terminated",
  },
};

type Lease = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number | null;
  paymentFrequency: string;
  gracePeriodDays: number;
  noticePeriodDays: number;
  signedAt: string | null;
  documentUrl: string | null;
  createdAt: string;
  tenancy: {
    id: string;
    status: string;
    moveInDate: string | null;
    moveOutDate: string | null;
    property: {
      id: string;
      title: string;
      rent: number;
      district: string | null;
      city: string | null;
      bedrooms: number;
      bathrooms: number;
      slug?: string;
    };
    unit: { id: string; unitNumber: string } | null;
  };
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
    property: { title: string };
    unit: { unitNumber: string } | null;
    leases: { id: string; endDate: string; rentAmount: number }[];
  };
};

export default function TenantLeasePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingRenewal, setRespondingRenewal] = useState<string | null>(null);
  const [renewalNotes, setRenewalNotes] = useState("");

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
      const [leasesRes, renewalsRes] = await Promise.all([
        fetch("/api/leases?limit=20"),
        fetch("/api/renewals"),
      ]);

      if (leasesRes.ok) {
        const data = await leasesRes.json();
        setLeases(data.leases || []);
      }
      if (renewalsRes.ok) {
        const data = await renewalsRes.json();
        setRenewals(data.renewals || []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  async function respondToRenewal(renewalId: string, status: "ACCEPTED" | "DECLINED") {
    setRespondingRenewal(renewalId);
    try {
      const res = await fetch("/api/renewals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renewalId,
          status,
          responseNotes: renewalNotes || null,
        }),
      });

      if (res.ok) {
        toast.success(
          status === "ACCEPTED"
            ? "Renewal accepted! New lease has been created."
            : "Renewal declined."
        );
        setRenewalNotes("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to respond to renewal");
      }
    } catch {
      toast.error("Failed to respond to renewal");
    } finally {
      setRespondingRenewal(null);
    }
  }

  // Separate active and past leases
  const activeLeases = leases.filter((l) =>
    ["ACTIVE", "EXPIRING", "PENDING_SIGNATURE", "RENEWAL_PENDING"].includes(l.status)
  );
  const pastLeases = leases.filter((l) =>
    ["EXPIRED", "TERMINATED", "DRAFT"].includes(l.status)
  );

  // Pending renewals (needing tenant action)
  const pendingRenewals = renewals.filter((r) =>
    ["OFFERED", "TENANT_REVIEWING"].includes(r.status)
  );

  const currentLease = activeLeases.find((l) => l.status === "ACTIVE" || l.status === "EXPIRING");

  const isExpiringSoon = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 30;
  };

  const daysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  My Lease
                </h1>
                <p className="mt-1 text-gray-500">
                  View your lease details and manage renewals
                </p>
              </div>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <>
              {/* Pending Renewals Alert */}
              {pendingRenewals.length > 0 && (
                <div className="space-y-4">
                  {pendingRenewals.map((renewal) => {
                    const currentRent =
                      renewal.tenancy.leases?.[0]?.rentAmount || 0;
                    const rentChange = renewal.proposedRent - currentRent;
                    const rentChangePct =
                      currentRent > 0
                        ? Math.round((rentChange / currentRent) * 100)
                        : 0;

                    return (
                      <div
                        key={renewal.id}
                        className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <RefreshCw className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-blue-900">
                              Lease Renewal Offer
                            </h3>
                            <p className="mt-1 text-sm text-blue-700">
                              Your landlord has offered to renew your lease for{" "}
                              <span className="font-medium">
                                {renewal.tenancy.property.title}
                              </span>
                              {renewal.tenancy.unit &&
                                ` (Unit ${renewal.tenancy.unit.unitNumber})`}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                              <div className="rounded-lg bg-white p-3">
                                <p className="text-xs text-gray-500">
                                  New Rent
                                </p>
                                <p className="mt-1 text-lg font-bold text-gray-900">
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
                              <div className="rounded-lg bg-white p-3">
                                <p className="text-xs text-gray-500">
                                  Current Rent
                                </p>
                                <p className="mt-1 text-lg font-bold text-gray-900">
                                  {formatUGX(currentRent)}
                                </p>
                              </div>
                              <div className="rounded-lg bg-white p-3">
                                <p className="text-xs text-gray-500">
                                  Current Lease Ends
                                </p>
                                <p className="mt-1 text-lg font-bold text-gray-900">
                                  {renewal.tenancy.leases?.[0]?.endDate
                                    ? new Date(
                                        renewal.tenancy.leases[0].endDate
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </p>
                              </div>
                            </div>

                            {renewal.proposedTerms && (
                              <div className="mt-3 rounded-lg bg-white p-3">
                                <p className="text-xs text-gray-500">
                                  Proposed Terms
                                </p>
                                <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                  {renewal.proposedTerms}
                                </p>
                              </div>
                            )}

                            <p className="mt-2 text-xs text-blue-600">
                              Offered by {renewal.offeredBy?.name || "Landlord"}{" "}
                              • {timeAgo(renewal.createdAt)}
                            </p>

                            {/* Response Notes */}
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Notes (optional)
                              </label>
                              <input
                                type="text"
                                value={
                                  respondingRenewal === renewal.id
                                    ? renewalNotes
                                    : ""
                                }
                                onChange={(e) => setRenewalNotes(e.target.value)}
                                onFocus={() =>
                                  setRespondingRenewal(renewal.id)
                                }
                                className="input mt-1"
                                placeholder="Any response notes..."
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 flex gap-3">
                              <button
                                onClick={() =>
                                  respondToRenewal(renewal.id, "ACCEPTED")
                                }
                                disabled={respondingRenewal === renewal.id}
                                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {respondingRenewal === renewal.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Accept Renewal
                              </button>
                              <button
                                onClick={() =>
                                  respondToRenewal(renewal.id, "DECLINED")
                                }
                                disabled={respondingRenewal === renewal.id}
                                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {respondingRenewal === renewal.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Active Lease */}
              {currentLease ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Current Lease
                        </h2>
                        {(() => {
                          const config = LEASE_STATUS_CONFIG[currentLease.status];
                          const StatusIcon = config?.icon || FileText;
                          return (
                            <span
                              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config?.color || ""}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {config?.label || currentLease.status}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {currentLease.tenancy.property.title}
                        {currentLease.tenancy.unit
                          ? ` · Unit ${currentLease.tenancy.unit.unitNumber}`
                          : ""}
                      </p>
                    </div>

                    {isExpiringSoon(currentLease.endDate) && (
                      <div className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                        <AlertTriangle className="h-3 w-3" />
                        Expires in {daysUntilExpiry(currentLease.endDate)} days
                      </div>
                    )}
                  </div>

                  {/* Lease Terms Grid */}
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Monthly Rent</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {formatUGX(currentLease.rentAmount)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Payment</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {currentLease.paymentFrequency}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {new Date(currentLease.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {new Date(currentLease.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {currentLease.depositAmount && (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Deposit</p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {formatUGX(currentLease.depositAmount)}
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Grace Period</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {currentLease.gracePeriodDays} days
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Notice Period</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">
                        {currentLease.noticePeriodDays} days
                      </p>
                    </div>
                    {currentLease.signedAt && (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Signed</p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {new Date(
                            currentLease.signedAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Property Quick Info */}
                  <div className="mt-4 flex items-center gap-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {currentLease.tenancy.property.district}
                      {currentLease.tenancy.property.city
                        ? `, ${currentLease.tenancy.property.city}`
                        : ""}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5" />
                      {currentLease.tenancy.property.bedrooms} bed
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" />
                      {currentLease.tenancy.property.bathrooms} bath
                    </span>
                  </div>

                  {/* Document Link */}
                  {currentLease.documentUrl && (
                    <a
                      href={currentLease.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100"
                    >
                      <FileText className="h-4 w-4" />
                      View Lease Document
                    </a>
                  )}

                  {/* Pending Signature Alert */}
                  {currentLease.status === "PENDING_SIGNATURE" && (
                    <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <p className="text-sm font-medium text-yellow-800">
                          Pending Signature
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-yellow-700">
                        Please review and sign your lease to activate it. Contact
                        your landlord if you have questions.
                      </p>
                    </div>
                  )}

                  {/* Expiring Soon Alert */}
                  {currentLease.status === "EXPIRING" && (
                    <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-medium text-orange-800">
                          Lease Expiring Soon
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-orange-700">
                        Your lease expires on{" "}
                        {new Date(
                          currentLease.endDate
                        ).toLocaleDateString()}
                        . Check for a renewal offer from your landlord or
                        prepare for move-out.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No active lease
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don&apos;t have an active lease yet. Apply for a
                    property to get started.
                  </p>
                  <Link
                    href="/search"
                    className="btn-primary mt-4 inline-flex text-sm"
                  >
                    Browse Properties
                  </Link>
                </div>
              )}

              {/* Lease History */}
              {pastLeases.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="font-semibold text-gray-900">
                      Lease History
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {pastLeases.map((lease) => {
                      const config = LEASE_STATUS_CONFIG[lease.status];
                      const StatusIcon = config?.icon || FileText;
                      return (
                        <div
                          key={lease.id}
                          className="flex items-center justify-between px-6 py-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {lease.tenancy.property.title}
                              </p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${config?.color || ""}`}
                              >
                                <StatusIcon className="mr-1 inline h-3 w-3" />
                                {config?.label || lease.status}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-gray-500">
                              {new Date(
                                lease.startDate
                              ).toLocaleDateString()}{" "}
                              —{" "}
                              {new Date(lease.endDate).toLocaleDateString()} •{" "}
                              {formatUGX(lease.rentAmount)}/
                              {lease.paymentFrequency.toLowerCase().slice(0, 3)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Link
                  href="/dashboard/tenant/payments"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                >
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Payments
                  </span>
                </Link>
                <Link
                  href="/dashboard/tenant/documents"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                >
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Documents
                  </span>
                </Link>
                <Link
                  href="/dashboard/tenant/maintenance"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                >
                  <Home className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Maintenance
                  </span>
                </Link>
                <Link
                  href="/dashboard/tenant/tenancy"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                >
                  <Home className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">
                    My Home
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
