"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  FileText,
  User,
  Clock,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { toast } from "sonner";

export default function AdminVerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchRequests();
  }, [status, page, filter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/verification?${params}`);
      const data = await res.json();
      setRequests(data.requests || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to load verification requests");
    } finally {
      setLoading(false);
    }
  }

  const handleReview = async (requestId: string, newStatus: string) => {
    try {
      await fetch("/api/admin/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: newStatus, notes }),
      });
      toast.success(`Verification ${newStatus.toLowerCase()}`);
      setSelected(null);
      setNotes("");
      fetchRequests();
    } catch {
      toast.error("Failed to update verification");
    }
  };

  const statusStyles: Record<string, string> = {
    PENDING: "badge-pending",
    VERIFIED: "badge-verified",
    REJECTED: "bg-red-100 text-red-800",
    UNVERIFIED: "bg-gray-100 text-gray-600",
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/admin")} className="p-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-display">Verification Requests</h1>
                <p className="text-sm text-gray-500">{total} requests</p>
              </div>
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {["", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s); setPage(1); }}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === s
                    ? "bg-brand-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s ? s.replace(/_/g, " ") : "All"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Request list */}
            <div className="lg:col-span-1 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                </div>
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => { setSelected(req); setNotes(""); }}
                    className={`card cursor-pointer p-4 transition-all hover:shadow-md ${
                      selected?.id === req.id ? "ring-2 ring-brand-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400 shrink-0" />
                          <p className="truncate text-sm font-medium text-gray-900">{req.user?.name}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">{req.type} verification</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs ${statusStyles[req.status] || "bg-gray-100 text-gray-600"}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card p-8 text-center text-gray-500">No requests</div>
              )}
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-2">
              {selected ? (
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selected.user?.name}</h2>
                      <p className="text-sm text-gray-500">
                        {selected.user?.email || selected.user?.phone} · {selected.type} verification
                      </p>
                    </div>
                    <span className={`text-xs ${statusStyles[selected.status] || ""}`}>
                      {selected.status}
                    </span>
                  </div>

                  {/* Document info */}
                  <div className="mb-6 space-y-3">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase">Document Type</p>
                      <p className="text-sm text-gray-900">{selected.documentType || "Not specified"}</p>
                    </div>
                    {selected.documentUrl && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase">Document</p>
                        <a
                          href={selected.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          View Document
                        </a>
                      </div>
                    )}
                    {selected.notes && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase">Admin Notes</p>
                        <p className="text-sm text-gray-900">{selected.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Review form */}
                  {selected.status === "PENDING" && (
                    <div className="border-t border-gray-100 pt-6 space-y-4">
                      <div>
                        <label className="label">Review Notes (optional)</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="input min-h-[80px] resize-none"
                          placeholder="Add any notes about this verification..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReview(selected.id, "VERIFIED")}
                          className="btn-primary"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleReview(selected.id, "REJECTED")}
                          className="btn-danger"
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {selected.reviewedAt && (
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <p className="text-xs text-gray-500">
                        Reviewed on {new Date(selected.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <Shield className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Select a request</h3>
                  <p className="mt-1 text-gray-500">Choose a verification request from the list to review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
