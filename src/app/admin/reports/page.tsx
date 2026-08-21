"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchReports();
  }, [status, filter]);

  async function fetchReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  const resolveReport = async (reportId: string, action: string) => {
    try {
      await fetch(`/api/reports`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status: action }),
      });
      toast.success(`Report ${action.toLowerCase()}`);
      fetchReports();
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <h1 className="text-xl font-bold text-gray-900 font-display">Reports</h1>
          </div>
        </div>

        <div className="page-container py-6">
          <div className="flex gap-2 mb-6">
            {["", "PENDING", "UNDER_REVIEW", "RESOLVED", "DISMISSED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  filter === s ? "bg-brand-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s || "All"}
              </button>
            ))}
          </div>

          <div className="card divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : reports.length > 0 ? (
              reports.map((report) => (
                <div key={report.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{report.reason}</span>
                      <span className={`badge text-xs ${
                        report.status === "PENDING" ? "badge-pending" :
                        report.status === "RESOLVED" ? "badge-verified" :
                        "bg-gray-100 text-gray-600"
                      }`}>{report.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Reported by {report.reporter?.name}
                      {report.property && ` about "${report.property?.title}"`}
                    </p>
                    {report.description && (
                      <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {report.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveReport(report.id, "RESOLVED")}
                        className="rounded-lg bg-green-50 p-2 text-green-600 hover:bg-green-100"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => resolveReport(report.id, "DISMISSED")}
                        className="rounded-lg bg-gray-50 p-2 text-gray-500 hover:bg-gray-100"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">No reports</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
