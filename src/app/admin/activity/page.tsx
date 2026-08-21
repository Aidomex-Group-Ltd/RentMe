"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Download,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  newData: unknown;
  oldData: unknown;
  user: { id: string; name: string; email: string | null; role: string } | null;
}

const ACTION_CLASS: Record<string, string> = {
  CREATE: "bg-green-50 text-green-800 ring-green-600/20",
  UPDATE: "bg-blue-50 text-blue-800 ring-blue-600/20",
  DELETE: "bg-red-50 text-red-800 ring-red-600/20",
  LOGIN: "bg-gray-100 text-gray-700 ring-gray-500/20",
};

const PAGE_SIZE = 30;

export default function AdminActivityLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    entity: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.entity) params.set("entity", filters.entity);
      if (filters.action) params.set("action", filters.action);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setError("Unable to load activity log. Please try again.");
      toast.error("Unable to load activity log. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCSV() {
    if (logs.length === 0) {
      toast.error("Nothing to export on this page");
      return;
    }
    const headers = ["Timestamp", "User", "Action", "Entity", "Entity ID", "Details"];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.user?.name || "System",
      log.action,
      log.entity,
      log.entityId || "",
      JSON.stringify(log.newData || log.oldData || {}),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported for current page");
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  return (
    <div>
      <AdminPageHeader
        title="Activity"
        description={`${total.toLocaleString()} audit entries`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
            <button type="button" onClick={exportCSV} className="btn-secondary text-sm">
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={filters.entity}
              onChange={(e) => updateFilter("entity", e.target.value)}
              className="input"
              aria-label="Filter by entity"
            >
              <option value="">All entities</option>
              <option value="User">User</option>
              <option value="Property">Property</option>
              <option value="Report">Report</option>
              <option value="VerificationRequest">Verification</option>
              <option value="SystemSetting">Setting</option>
              <option value="Location">Location</option>
            </select>
            <select
              value={filters.action}
              onChange={(e) => updateFilter("action", e.target.value)}
              className="input"
              aria-label="Filter by action"
            >
              <option value="">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
              className="input"
              aria-label="Start date"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
              className="input"
              aria-label="End date"
            />
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error && logs.length === 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No activity found</p>
            <p className="mt-1 text-sm text-gray-500">
              Admin actions appear here as they happen. Try widening date or entity filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                            <User className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {log.user?.name || "System"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            ACTION_CLASS[log.action] || ACTION_CLASS.LOGIN
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{log.entity}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-500">
                        {log.entityId && (
                          <span className="mr-2 text-gray-400">{log.entityId.slice(0, 8)}…</span>
                        )}
                        {log.newData != null && (
                          <span>{JSON.stringify(log.newData).slice(0, 80)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 md:hidden">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {log.action} · {log.entity}
                      </p>
                      <p className="text-xs text-gray-500">{log.user?.name || "System"}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        ACTION_CLASS[log.action] || ACTION_CLASS.LOGIN
                      }`}
                    >
                      {log.action}
                    </span>
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
    </div>
  );
}
