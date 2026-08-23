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
  AlertCircle,
  ArrowRight,
  Home,
  MapPin,
  DollarSign,
  Calendar,
  Filter,
  Eye,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All Applications" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: any; label: string; description: string }
> = {
  SUBMITTED: {
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
    label: "Submitted",
    description: "Your application has been submitted and is waiting for review.",
  },
  UNDER_REVIEW: {
    color: "bg-yellow-100 text-yellow-800",
    icon: Eye,
    label: "Under Review",
    description: "The landlord is reviewing your application.",
  },
  ADDITIONAL_INFO_REQUIRED: {
    color: "bg-orange-100 text-orange-800",
    icon: AlertCircle,
    label: "More Info Needed",
    description: "The landlord has requested additional information.",
  },
  APPROVED: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    label: "Approved",
    description: "Congratulations! Your application has been approved.",
  },
  REJECTED: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    label: "Not Successful",
    description: "Unfortunately, your application was not successful.",
  },
  WITHDRAWN: {
    color: "bg-gray-100 text-gray-600",
    icon: XCircle,
    label: "Withdrawn",
    description: "You have withdrawn this application.",
  },
  EXPIRED: {
    color: "bg-gray-100 text-gray-600",
    icon: Clock,
    label: "Expired",
    description: "This application has expired.",
  },
  DRAFT: {
    color: "bg-gray-100 text-gray-600",
    icon: FileText,
    label: "Draft",
    description: "This application is still in draft.",
  },
};

// Pipeline steps for progress indicator
const PIPELINE_STEPS = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Review" },
  { key: "APPROVED", label: "Approved" },
];

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
    city: string | null;
    bedrooms: number;
    bathrooms: number;
    propertyType: string;
    slug?: string;
  };
  unit: { id: string; unitNumber: string } | null;
};

export default function TenantApplicationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      const res = await fetch("/api/applications?role=tenant");
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

  async function withdrawApplication(appId: string) {
    if (!confirm("Are you sure you want to withdraw this application?")) return;

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "WITHDRAWN" }),
      });

      if (res.ok) {
        toast.success("Application withdrawn");
        fetchApplications();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to withdraw application");
      }
    } catch {
      toast.error("Failed to withdraw application");
    }
  }

  const filtered = applications.filter((app) => {
    if (!statusFilter) return true;
    return app.status === statusFilter;
  });

  // Counts for summary
  const counts = {
    total: applications.length,
    pending: applications.filter((a) =>
      ["SUBMITTED", "UNDER_REVIEW"].includes(a.status)
    ).length,
    approved: applications.filter((a) => a.status === "APPROVED").length,
    rejected: applications.filter((a) =>
      ["REJECTED", "WITHDRAWN", "EXPIRED"].includes(a.status)
    ).length,
  };

  const getPipelineIndex = (status: string): number => {
    if (status === "REJECTED" || status === "WITHDRAWN" || status === "EXPIRED")
      return -1;
    const idx = PIPELINE_STEPS.findIndex((s) => s.key === status);
    if (idx >= 0) return idx;
    if (status === "ADDITIONAL_INFO_REQUIRED") return 1;
    if (status === "APPROVED") return 2;
    return 0;
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  My Applications
                </h1>
                <p className="mt-1 text-gray-500">
                  Track your rental applications and their status
                </p>
              </div>
              <Link href="/search" className="btn-primary">
                <FileText className="mr-2 h-4 w-4" />
                Browse Properties
              </Link>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar
                navItems={[
                  { label: "Dashboard", href: "/dashboard/tenant", icon: Home },
                  { label: "My Home", href: "/dashboard/tenant/tenancy", icon: Home },
                  { label: "Applications", href: "/dashboard/tenant/applications", icon: FileText },
                  { label: "Payments", href: "/dashboard/tenant/payments", icon: DollarSign },
                  { label: "Maintenance", href: "/dashboard/tenant/maintenance", icon: FileText },
                  { label: "Notices", href: "/dashboard/tenant/notices", icon: FileText },
                  { label: "Documents", href: "/dashboard/tenant/documents", icon: FileText },
                  { label: "Profile", href: "/dashboard/tenant/profile", icon: FileText },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-500">Pending</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {counts.pending}
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
            <div className="text-sm text-gray-500">
              {filtered.length} application{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Applications List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {statusFilter
                  ? "No applications match this filter"
                  : "No applications yet"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter
                  ? "Try selecting a different filter."
                  : "When you apply for a property, your applications will appear here."}
              </p>
              {!statusFilter && (
                <Link
                  href="/search"
                  className="btn-primary mt-4 inline-flex text-sm"
                >
                  Browse Properties
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((app) => {
                const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.SUBMITTED;
                const StatusIcon = config.icon;
                const pipelineIdx = getPipelineIndex(app.status);
                const isExpanded = expandedId === app.id;
                const canWithdraw = ["SUBMITTED", "UNDER_REVIEW"].includes(
                  app.status
                );

                return (
                  <div
                    key={app.id}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Main Row */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          {/* Status Icon */}
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.color}`}
                          >
                            <StatusIcon className="h-6 w-6" />
                          </div>

                          <div className="min-w-0">
                            {/* Property Title */}
                            <Link
                              href={
                                app.property.slug
                                  ? `/properties/${app.property.slug}`
                                  : `/properties/${app.property.id}`
                              }
                              className="text-base font-semibold text-gray-900 hover:text-brand-600"
                            >
                              {app.property.title}
                            </Link>

                            {/* Property Details */}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {app.property.district}
                                {app.property.city
                                  ? `, ${app.property.city}`
                                  : ""}
                              </span>
                              <span>•</span>
                              <span>
                                {app.property.bedrooms} bed
                                {app.property.bedrooms !== 1 ? "s" : ""} •{" "}
                                {app.property.bathrooms} bath
                                {app.property.bathrooms !== 1 ? "s" : ""}
                              </span>
                              {app.unit && (
                                <>
                                  <span>•</span>
                                  <span>Unit {app.unit.unitNumber}</span>
                                </>
                              )}
                            </div>

                            {/* Status & Date */}
                            <div className="mt-2 flex items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${config.color}`}
                              >
                                {config.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                Applied {timeAgo(app.createdAt)}
                              </span>
                              {app.preferredMoveIn && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  Move-in:{" "}
                                  {new Date(
                                    app.preferredMoveIn
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Rent */}
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatUGX(app.property.rent)}/mo
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {app.tenancyId && (
                              <Link
                                href="/dashboard/tenant/tenancy"
                                className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                              >
                                View Tenancy
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            )}
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : app.id)
                              }
                              className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            >
                              {isExpanded ? "Less" : "Details"}
                            </button>
                            {canWithdraw && (
                              <button
                                onClick={() => withdrawApplication(app.id)}
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pipeline Progress (for non-terminal states) */}
                      {pipelineIdx >= 0 && app.status !== "APPROVED" && (
                        <div className="mt-4">
                          <div className="flex items-center gap-0">
                            {PIPELINE_STEPS.map((step, idx) => {
                              const isCompleted = idx < pipelineIdx;
                              const isCurrent = idx === pipelineIdx;
                              return (
                                <div
                                  key={step.key}
                                  className="flex flex-1 items-center"
                                >
                                  <div className="flex flex-col items-center">
                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                                        isCompleted
                                          ? "bg-green-500 text-white"
                                          : isCurrent
                                          ? "bg-brand-500 text-white"
                                          : "bg-gray-200 text-gray-500"
                                      }`}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4" />
                                      ) : (
                                        idx + 1
                                      )}
                                    </div>
                                    <span
                                      className={`mt-1 text-xs ${
                                        isCurrent
                                          ? "font-medium text-brand-600"
                                          : isCompleted
                                          ? "text-green-600"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      {step.label}
                                    </span>
                                  </div>
                                  {idx < PIPELINE_STEPS.length - 1 && (
                                    <div
                                      className={`mx-1 mb-5 h-0.5 flex-1 ${
                                        isCompleted
                                          ? "bg-green-500"
                                          : "bg-gray-200"
                                      }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 sm:p-5">
                        {/* Status Description */}
                        <p className="text-sm text-gray-600">{config.description}</p>

                        {/* Review Notes */}
                        {app.reviewNotes && (
                          <div className="mt-4 rounded-lg bg-white border border-gray-200 p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Landlord Notes
                            </p>
                            <p className="mt-1 text-sm text-gray-700">
                              {app.reviewNotes}
                            </p>
                            {app.reviewedAt && (
                              <p className="mt-1 text-xs text-gray-400">
                                Reviewed {timeAgo(app.reviewedAt)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Application Details Grid */}
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {app.personalInfo && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Personal Information
                              </p>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                {app.personalInfo}
                              </p>
                            </div>
                          )}
                          {app.employmentInfo && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Employment
                              </p>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                {app.employmentInfo}
                              </p>
                            </div>
                          )}
                          {app.incomeRange && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Income Range
                              </p>
                              <p className="mt-1 text-sm text-gray-700">
                                {app.incomeRange}
                              </p>
                            </div>
                          )}
                          {app.references && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                References
                              </p>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                {app.references}
                              </p>
                            </div>
                          )}
                          {app.notes && (
                            <div className="sm:col-span-2">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Additional Notes
                              </p>
                              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                                {app.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                          <span>
                            Submitted{" "}
                            {new Date(app.createdAt).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>
                            Last updated{" "}
                            {new Date(app.updatedAt).toLocaleDateString()}
                          </span>
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
    </MainLayout>
  );
}
