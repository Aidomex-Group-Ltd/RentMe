"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "", label: "All Requests" },
  { value: "SUBMITTED", label: "New" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export default function LandlordMaintenancePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchRequests();
  }, [authStatus, statusFilter, priorityFilter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      const res = await fetch(`/api/maintenance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setSummary(data.summary || null);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(requestId: string, newStatus: string) {
    try {
      const res = await fetch("/api/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Request ${newStatus.toLowerCase().replace(/_/g, " ")}`);
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update request");
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case "SUBMITTED":
        return "bg-blue-100 text-blue-800";
      case "ACKNOWLEDGED":
      case "ASSIGNED":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-indigo-100 text-indigo-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <h1 className="text-2xl font-bold text-gray-900 font-display">Maintenance</h1>
            <p className="mt-1 text-gray-500">Manage maintenance requests across your properties</p>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar navItems={[
                { label: "Dashboard", href: "/dashboard/landlord", icon: Wrench },
                { label: "Tenants", href: "/dashboard/landlord/tenants", icon: Wrench },
                { label: "Leases", href: "/dashboard/landlord/leases", icon: Wrench },
                { label: "Maintenance", href: "/dashboard/landlord/maintenance", icon: Wrench, badge: summary?.open },
                { label: "Reports", href: "/dashboard/landlord/reports", icon: Wrench },
                { label: "Messages", href: "/messages", icon: Wrench },
              ]} />
            </div>
          </div>
        </div>

        <div className="page-container py-6">

        {/* Summary Cards */}
        {summary && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-500">Open Requests</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{summary.open}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-gray-500">Urgent</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-600">{summary.urgent}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <p className="text-sm text-gray-500">Overdue (&gt;7 days)</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-orange-600">{summary.overdue}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Requests */}
        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">No maintenance requests</p>
            <p className="mt-1 text-sm text-gray-400">All clear! No pending issues.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{r.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(
                          r.status
                        )}`}
                      >
                        {r.status.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor(
                          r.priority
                        )}`}
                      >
                        {r.priority}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{r.description}</p>

                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        {r.tenant?.name}
                      </span>
                      <span>
                        {r.tenancy?.property?.title}
                        {r.tenancy?.unit ? ` · Unit ${r.tenancy.unit.unitNumber}` : ""}
                      </span>
                      {r.category && <span>{r.category}</span>}
                      <span>{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "SUBMITTED" && (
                    <button
                      onClick={() => updateStatus(r.id, "ACKNOWLEDGED")}
                      className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(r.status === "SUBMITTED" || r.status === "ACKNOWLEDGED") && (
                    <button
                      onClick={() => updateStatus(r.id, "IN_PROGRESS")}
                      className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      Start Work
                    </button>
                  )}
                  {r.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => updateStatus(r.id, "RESOLVED")}
                      className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      Mark Resolved
                    </button>
                  )}
                  {r.status === "RESOLVED" && (
                    <button
                      onClick={() => updateStatus(r.id, "CLOSED")}
                      className="rounded-lg bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Close
                    </button>
                  )}
                  {r.status !== "CLOSED" && r.status !== "CANCELLED" && r.status !== "RESOLVED" && (
                    <button
                      onClick={() => updateStatus(r.id, "CANCELLED")}
                      className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {r.assignedTo && (
                  <p className="mt-2 text-xs text-gray-500">
                    Assigned to: {r.assignedTo.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
