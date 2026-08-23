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
  Eye,
  User,
  MapPin,
  DollarSign,
  Calendar,
  Home,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All Applications" },
  { value: "SUBMITTED", label: "New" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: any; label: string }
> = {
  SUBMITTED: {
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
    label: "New",
  },
  UNDER_REVIEW: {
    color: "bg-yellow-100 text-yellow-800",
    icon: Eye,
    label: "Reviewing",
  },
  ADDITIONAL_INFO_REQUIRED: {
    color: "bg-orange-100 text-orange-800",
    icon: AlertTriangle,
    label: "Info Needed",
  },
  APPROVED: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Approved",
  },
  REJECTED: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Rejected",
  },
  WITHDRAWN: {
    color: "bg-gray-100 text-gray-600",
    icon: XCircle,
    label: "Withdrawn",
  },
  EXPIRED: {
    color: "bg-gray-100 text-gray-600",
    icon: Clock,
    label: "Expired",
  },
  DRAFT: {
    color: "bg-gray-100 text-gray-600",
    icon: FileText,
    label: "Draft",
  },
};

type Application = {
  id: string;
  status: string;
  personalInfo: string | null;
  employmentInfo: string | null;
  incomeRange: string | null;
  references: string | null;
  preferredMoveIn: string | null;
  notes: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  tenancyId: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    title: string;
    rent: number;
    district: string | null;
  };
  tenant: {
    id: string;
    name: string;
    avatar: string | null;
    email: string | null;
    phone: string | null;
  };
};

export default function LandlordApplicationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    applicationId: string;
    action: "APPROVED" | "REJECTED";
    tenantName: string;
    propertyTitle: string;
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchApplications();
  }, [authStatus]);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/applications?role=landlord");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(appId: string, status: string, notes?: string) {
    setActionLoading(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes: notes || null }),
      });

      if (res.ok) {
        toast.success(
          status === "APPROVED"
            ? "Application approved! Tenancy created."
            : status === "REJECTED"
            ? "Application rejected."
            : `Application marked as ${status.toLowerCase()}.`
        );
        fetchApplications();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update application");
      }
    } catch {
      toast.error("Failed to update application");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReviewSubmit() {
    if (!reviewModal) return;
    setSubmitting(true);
    await updateStatus(reviewModal.applicationId, reviewModal.action, reviewNotes);
    setSubmitting(false);
    setReviewModal(null);
    setReviewNotes("");
  }

  // Get unique properties from applications
  const uniqueProperties = Array.from(
    new Map(
      applications.map((app) => [app.property.id, app.property])
    ).values()
  );

  const filtered = applications.filter((app) => {
    if (statusFilter && app.status !== statusFilter) return false;
    if (propertyFilter && app.property.id !== propertyFilter) return false;
    return true;
  });

  // Counts
  const counts = {
    total: applications.length,
    new: applications.filter((a) => a.status === "SUBMITTED").length,
    reviewing: applications.filter((a) =>
      ["UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"].includes(a.status)
    ).length,
    approved: applications.filter((a) => a.status === "APPROVED").length,
    rejected: applications.filter((a) =>
      ["REJECTED", "WITHDRAWN", "EXPIRED"].includes(a.status)
    ).length,
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Applications
                </h1>
                <p className="mt-1 text-gray-500">
                  Review and manage tenant applications
                </p>
              </div>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar />
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {counts.total}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-500">New</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {counts.new}
              </p>
              {counts.new > 0 && (
                <span className="mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Needs review
                </span>
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-gray-500">Reviewing</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-600">
                {counts.reviewing}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-gray-500">Approved</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {counts.approved}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-gray-500" />
                <p className="text-sm text-gray-500">Closed</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-600">
                {counts.rejected}
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
            {uniqueProperties.length > 1 && (
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="input w-auto"
              >
                <option value="">All Properties</option>
                {uniqueProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
            <div className="text-sm text-gray-500">
              {filtered.length} application{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Applications List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {statusFilter || propertyFilter
                  ? "No applications match your filters"
                  : "No applications yet"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter || propertyFilter
                  ? "Try adjusting your filters."
                  : "Applications from prospective tenants will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => {
                const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.SUBMITTED;
                const StatusIcon = config.icon;
                const isExpanded = expandedId === app.id;
                const canReview = ["SUBMITTED", "UNDER_REVIEW"].includes(
                  app.status
                );
                const isProcessing = actionLoading === app.id;

                return (
                  <div
                    key={app.id}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Main Row */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        {/* Tenant Info */}
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                            {app.tenant.avatar ? (
                              <img
                                src={app.tenant.avatar}
                                alt=""
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              app.tenant.name?.[0] || "?"
                            )}
                          </div>

                          <div className="min-w-0">
                            {/* Tenant Name & Status */}
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {app.tenant.name}
                              </h3>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
                              >
                                {config.label}
                              </span>
                            </div>

                            {/* Property */}
                            <Link
                              href={`/properties/${app.property.id}`}
                              className="mt-1 flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600"
                            >
                              <Home className="h-3.5 w-3.5" />
                              {app.property.title}
                              <span className="text-gray-400">•</span>
                              <span>{formatUGX(app.property.rent)}/mo</span>
                              {app.property.district && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <MapPin className="h-3 w-3" />
                                  {app.property.district}
                                </>
                              )}
                            </Link>

                            {/* Contact & Meta */}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                              {app.tenant.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {app.tenant.email}
                                </span>
                              )}
                              {app.tenant.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {app.tenant.phone}
                                </span>
                              )}
                              <span>
                                Applied {timeAgo(app.createdAt)}
                              </span>
                              {app.preferredMoveIn && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Move-in:{" "}
                                  {new Date(
                                    app.preferredMoveIn
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Review Notes */}
                            {app.reviewNotes && (
                              <p className="mt-2 text-xs text-gray-500 italic">
                                &ldquo;{app.reviewNotes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : app.id)
                            }
                            className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>

                          {canReview && (
                            <>
                              <button
                                onClick={() =>
                                  setReviewModal({
                                    applicationId: app.id,
                                    action: "APPROVED",
                                    tenantName: app.tenant.name,
                                    propertyTitle: app.property.title,
                                  })
                                }
                                disabled={isProcessing}
                                className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                              >
                                <CheckCircle className="mr-1 inline h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  setReviewModal({
                                    applicationId: app.id,
                                    action: "REJECTED",
                                    tenantName: app.tenant.name,
                                    propertyTitle: app.property.title,
                                  })
                                }
                                disabled={isProcessing}
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                <XCircle className="mr-1 inline h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          {app.tenancyId && (
                            <Link
                              href={`/dashboard/landlord/tenants/${app.tenancyId}`}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                            >
                              View Tenancy
                            </Link>
                          )}

                          {!canReview && !app.tenancyId && (
                            <Link
                              href="/messages"
                              className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
                              Message
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 sm:p-5">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          {/* Tenant Details */}
                          <div>
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                              <User className="h-4 w-4" />
                              Tenant Information
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-gray-500">Name</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {app.tenant.name}
                                </p>
                              </div>
                              {app.tenant.email && (
                                <div>
                                  <p className="text-xs text-gray-500">Email</p>
                                  <p className="text-sm text-gray-700">
                                    {app.tenant.email}
                                  </p>
                                </div>
                              )}
                              {app.tenant.phone && (
                                <div>
                                  <p className="text-xs text-gray-500">Phone</p>
                                  <p className="text-sm text-gray-700">
                                    {app.tenant.phone}
                                  </p>
                                </div>
                              )}
                              {app.preferredMoveIn && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Preferred Move-in
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    {new Date(
                                      app.preferredMoveIn
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Application Details */}
                          <div>
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                              <FileText className="h-4 w-4" />
                              Application Details
                            </h4>
                            <div className="space-y-2">
                              {app.personalInfo && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Personal Information
                                  </p>
                                  <p className="text-sm text-gray-700 whitespace-pre-line">
                                    {app.personalInfo}
                                  </p>
                                </div>
                              )}
                              {app.employmentInfo && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Employment
                                  </p>
                                  <p className="text-sm text-gray-700 whitespace-pre-line">
                                    {app.employmentInfo}
                                  </p>
                                </div>
                              )}
                              {app.incomeRange && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Income Range
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    {app.incomeRange}
                                  </p>
                                </div>
                              )}
                              {app.references && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    References
                                  </p>
                                  <p className="text-sm text-gray-700 whitespace-pre-line">
                                    {app.references}
                                  </p>
                                </div>
                              )}
                              {app.notes && (
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Additional Notes
                                  </p>
                                  <p className="text-sm text-gray-700 whitespace-pre-line">
                                    {app.notes}
                                  </p>
                                </div>
                              )}
                              {!app.personalInfo &&
                                !app.employmentInfo &&
                                !app.incomeRange &&
                                !app.references &&
                                !app.notes && (
                                  <p className="text-sm text-gray-400 italic">
                                    No additional details provided
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                          <span>
                            Applied{" "}
                            {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>
                            Last updated{" "}
                            {new Date(app.updatedAt).toLocaleDateString()}
                          </span>
                          {app.reviewedAt && (
                            <>
                              <span>•</span>
                              <span>
                                Reviewed{" "}
                                {new Date(app.reviewedAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
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

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {reviewModal.action === "APPROVED"
                  ? "Approve Application"
                  : "Reject Application"}
              </h2>
              <button
                onClick={() => {
                  setReviewModal(null);
                  setReviewNotes("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{reviewModal.tenantName}</span>{" "}
                applied for{" "}
                <span className="font-medium">
                  {reviewModal.propertyTitle}
                </span>
              </p>
            </div>

            {reviewModal.action === "APPROVED" && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    This will create a new tenancy
                  </p>
                </div>
                <p className="mt-1 text-xs text-green-700">
                  A PENDING tenancy will be created. You can then create a
                  lease and schedule move-in.
                </p>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Review Notes{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="input mt-1"
                rows={3}
                placeholder={
                  reviewModal.action === "APPROVED"
                    ? "Any notes for this approval..."
                    : "Reason for rejection (shown to tenant)..."
                }
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setReviewModal(null);
                  setReviewNotes("");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={submitting}
                className={
                  reviewModal.action === "APPROVED"
                    ? "btn-primary"
                    : "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                }
              >
                {submitting
                  ? "Processing..."
                  : reviewModal.action === "APPROVED"
                  ? "Approve & Create Tenancy"
                  : "Reject Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
