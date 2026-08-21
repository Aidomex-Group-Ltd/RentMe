"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  User,
  Clock,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import StatusBadge from "@/components/admin/status-badge";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import { toast } from "sonner";

interface VerificationRequest {
  id: string;
  type: string;
  status: string;
  documentType: string | null;
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
  } | null;
}

interface ConfirmAction {
  request: VerificationRequest;
  status: "VERIFIED" | "REJECTED";
}

const PAGE_SIZE = 20;

function actionCopy(action: ConfirmAction): {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "warning" | "neutral";
  success: string;
} {
  const who = action.request.user?.name || "this applicant";
  if (action.status === "VERIFIED") {
    return {
      title: "Approve verification",
      description: `Approve identity verification for ${who}? Their landlord/agent profile will be marked verified. This can be revisited later if needed.`,
      confirmLabel: "Approve",
      tone: "neutral",
      success: "Verification approved",
    };
  }
  return {
    title: "Reject verification",
    description: `Reject verification for ${who}? They will be notified. They can submit a new request later.`,
    confirmLabel: "Reject",
    tone: "danger",
    success: "Verification rejected",
  };
}

export default function AdminVerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [notes, setNotes] = useState("");
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
      if (filter) params.set("status", filter);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/admin/verification?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRequests(data.requests || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setError("Unable to load verification requests. Please try again.");
      toast.error("Unable to load verification requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyReview() {
    if (!confirm) return;
    setActing(true);
    const copy = actionCopy(confirm);
    try {
      const res = await fetch("/api/admin/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: confirm.request.id,
          status: confirm.status,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(copy.success);
      setConfirm(null);
      setSelected(null);
      setNotes("");
      await load();
    } catch {
      toast.error("Failed to update verification. Please try again.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Verification"
        description={`${total.toLocaleString()} requests · review identity documents`}
        actions={
          <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => {
                setFilter(s);
                setPage(1);
                setSelected(null);
              }}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-brand-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {loading && requests.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg border border-gray-200 bg-white" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-white lg:col-span-2" />
          </div>
        ) : error && requests.length === 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-1">
              {requests.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center">
                  <p className="text-sm font-medium text-gray-900">No requests</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Nothing in this filter. Pending requests appear here when users submit documents.
                  </p>
                </div>
              ) : (
                requests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => {
                      setSelected(req);
                      setNotes("");
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selected?.id === req.id
                        ? "border-brand-400 bg-brand-50/50 ring-1 ring-brand-400"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                          <p className="truncate text-sm font-medium text-gray-900">
                            {req.user?.name || "Applicant"}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{req.type} verification</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" aria-hidden />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                  </button>
                ))
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500">
                    {page}/{totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="btn-secondary p-1.5"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-secondary p-1.5"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {selected.user?.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selected.user?.email || selected.user?.phone || "—"} · {selected.type}{" "}
                        · {selected.user?.role}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-md bg-gray-50 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Document type
                      </p>
                      <p className="text-sm text-gray-900">{selected.documentType || "Not specified"}</p>
                    </div>
                    {selected.documentUrl && (
                      <div className="rounded-md bg-gray-50 px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Document
                        </p>
                        <a
                          href={selected.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                          View document
                        </a>
                      </div>
                    )}
                    {selected.notes && (
                      <div className="rounded-md bg-gray-50 px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Admin notes
                        </p>
                        <p className="text-sm text-gray-900">{selected.notes}</p>
                      </div>
                    )}
                  </div>

                  {selected.status === "PENDING" && (
                    <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
                      <div>
                        <label htmlFor="verification-notes" className="label">
                          Review notes (optional)
                        </label>
                        <textarea
                          id="verification-notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="input min-h-[80px] resize-none"
                          placeholder="Notes shared with the applicant on reject…"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirm({ request: selected, status: "VERIFIED" })}
                          className="btn-primary"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirm({ request: selected, status: "REJECTED" })}
                          className="btn-danger"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {selected.reviewedAt && (
                    <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                      Reviewed {new Date(selected.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-16 text-center">
                  <Shield className="mb-3 h-10 w-10 text-gray-300" aria-hidden />
                  <h3 className="text-sm font-medium text-gray-900">Select a request</h3>
                  <p className="mt-1 max-w-sm text-sm text-gray-500">
                    Choose a verification request from the list to review documents and decide.
                  </p>
                </div>
              )}
            </div>
          </div>
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
          onConfirm={applyReview}
          onCancel={() => !acting && setConfirm(null)}
        />
      )}
    </div>
  );
}
