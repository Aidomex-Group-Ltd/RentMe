"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Download,
  Search,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import { toast } from "sonner";

export default function AdminActivityLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    entity: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchLogs();
  }, [status, page, filters]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entity) params.set("entity", filters.entity);
      if (filters.action) params.set("action", filters.action);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      params.set("page", String(page));

      const res = await fetch(`/api/admin/audit-log?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }

  const exportCSV = () => {
    const headers = ["Timestamp", "User", "Action", "Entity", "Entity ID", "Details"];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.user?.name || "System",
      log.action,
      log.entity,
      log.entityId || "",
      JSON.stringify(log.newData || log.oldData || {}),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    LOGIN: "bg-gray-100 text-gray-700",
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-display">Activity Log</h1>
                <p className="text-sm text-gray-500">{total} entries</p>
              </div>
              <button onClick={exportCSV} className="btn-secondary">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="page-container py-6 space-y-6">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <select
                value={filters.entity}
                onChange={(e) => { setFilters((f) => ({ ...f, entity: e.target.value })); setPage(1); }}
                className="input"
              >
                <option value="">All Entities</option>
                <option value="User">User</option>
                <option value="Property">Property</option>
                <option value="Report">Report</option>
                <option value="VerificationRequest">Verification</option>
                <option value="SystemSetting">Setting</option>
                <option value="Location">Location</option>
              </select>
              <select
                value={filters.action}
                onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1); }}
                className="input"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
              </select>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => { setFilters((f) => ({ ...f, startDate: e.target.value })); setPage(1); }}
                className="input"
                placeholder="Start date"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => { setFilters((f) => ({ ...f, endDate: e.target.value })); setPage(1); }}
                className="input"
                placeholder="End date"
              />
            </div>
          </div>

          {/* Log table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                              <User className="h-3.5 w-3.5 text-gray-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{log.user?.name || "System"}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`badge text-xs ${actionColors[log.action] || "bg-gray-100 text-gray-600"}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{log.entity}</td>
                        <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">
                          {log.entityId && <span className="text-xs text-gray-400">{log.entityId.slice(0, 8)}…</span>}
                          {log.newData && (
                            <span className="ml-2 text-xs text-gray-400">
                              {JSON.stringify(log.newData).slice(0, 60)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">No activity logs found</div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary text-xs"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
