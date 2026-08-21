"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import StatusBadge from "@/components/admin/status-badge";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import { toast } from "sonner";

interface ReportRow {
  id: string;
  reason: string;
  status: string;
  description: string | null;
  createdAt: string;
  reporter: { id: string; name: string; email: string | null } | null;
  property: { id: string; title: string; district: string | null; slug: string } | null;
}

interface ConfirmAction {
  report: ReportRow;
  status: "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
}

const REASONS = [
  "SCAM",
  "FAKE_PROPERTY",
  "ALREADY_RENTED",
  "WRONG_PRICE",
  "WRONG_LOCATION",
  "FAKE_PHOTOS",
  "HARASSMENT",
  "DUPLICATE_LISTING",
  "OTHER",
];

const PAGE_SIZE = 20;

function actionCopy(action: ConfirmAction): {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "warning" | "neutral";
  success: string;
} {
  const target = action.report.property?.title
    ? `report about “${action.report.property.title}”`
    : `report (${action.report.reason.replace(/_/g, " ")})`;

  if (action.status === "UNDER_REVIEW") {
    return {
      title: "Mark under review",
      description: `Move this ${target} to under review? You can resolve or dismiss it later.`,
      confirmLabel: "Under review",
      tone: "warning",
      success: "Report marked under review",
    };
  }
  if (action.status === "RESOLVED") {
    return {
      title: "Resolve report",
      description: `Mark this ${target} as resolved? This closes the case. Status can be changed again if needed.`,
      confirmLabel: "Resolve",
      tone: "neutral",
      success: "Report resolved",
    };
  }
  return {
    title: "Dismiss report",
    description: `Dismiss this ${target}? Use when the report is invalid or no action is required. This can be revisited later.`,
    confirmLabel: "Dismiss",
    tone: "danger",
    success: "Report dismissed",
  };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (reasonFilter) params.set("reason", reasonFilter);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setError("Unable to load reports. Please try again.");
      toast.error("Unable to load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reasonFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyAction() {
    if (!confirm) return;
    setActing(true);
    const copy = actionCopy(confirm);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: confirm.report.id, status: confirm.status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(copy.success);
      setConfirm(null);
      await load();
    } catch {
      toast.error("Failed to update report. Please try again.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description={`${total.toLocaleString()} reports · investigate and close cases`}
        actions={
          <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["", "PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"].map((s) => (
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
          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(1);
            }}
            className="input w-full sm:w-auto"
            aria-label="Filter by reason"
          >
            <option value="">All reasons</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {loading && reports.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error && reports.length === 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No reports in this queue</p>
            <p className="mt-1 text-sm text-gray-500">
              Clear status or reason filters to see the full report history.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {reports.map((report) => (
                <li key={report.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {report.reason.replace(/_/g, " ")}
                      </span>
                      <StatusBadge status={report.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Reported by {report.reporter?.name || "Unknown"}
                      {report.property && (
                        <>
                          {" "}
                          about{" "}
                          <Link
                            href={`/properties/${report.property.slug}`}
                            className="font-medium text-brand-700 hover:underline"
                            target="_blank"
                          >
                            {report.property.title}
                          </Link>
                        </>
                      )}
                    </p>
                    {report.description && (
                      <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {(report.status === "PENDING" || report.status === "UNDER_REVIEW") && (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {report.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => setConfirm({ report, status: "UNDER_REVIEW" })}
                          className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          Under review
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirm({ report, status: "RESOLVED" })}
                        className="rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm({ report, status: "DISMISSED" })}
                        className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
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
