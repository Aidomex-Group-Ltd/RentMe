"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Clock, CheckCircle, AlertCircle, X } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Structural",
  "Appliance",
  "Pest Control",
  "Other",
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-gray-100 text-gray-700" },
  { value: "MEDIUM", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "URGENT", label: "Urgent", color: "bg-red-100 text-red-700" },
];

export default function TenantMaintenancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTenancyId, setFormTenancyId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPriority, setFormPriority] = useState("MEDIUM");
  const [formLocation, setFormLocation] = useState("");
  const [formAccessTime, setFormAccessTime] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") fetchData();
  }, [status]);

  async function fetchData() {
    try {
      const [tenRes, maintRes] = await Promise.all([
        fetch("/api/tenancies?limit=10"),
        fetch("/api/maintenance"),
      ]);
      if (tenRes.ok) {
        const data = await tenRes.json();
        const list = data.tenancies || [];
        setTenancies(list);
        const active = list.find((t: any) => ["ACTIVE", "NOTICE_GIVEN"].includes(t.status));
        if (active) setFormTenancyId(active.id);
      }
      if (maintRes.ok) {
        const data = await maintRes.json();
        setRequests(data.requests || []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTenancyId || !formTitle || !formDescription) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: formTenancyId,
          title: formTitle,
          description: formDescription,
          category: formCategory || null,
          priority: formPriority,
          locationInUnit: formLocation || null,
          preferredAccessTime: formAccessTime || null,
        }),
      });

      if (res.ok) {
        toast.success("Maintenance request submitted");
        setShowForm(false);
        setFormTitle("");
        setFormDescription("");
        setFormCategory("");
        setFormPriority("MEDIUM");
        setFormLocation("");
        setFormAccessTime("");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit request");
      }
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
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
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">Maintenance</h1>
                <p className="mt-1 text-gray-500">Submit and track maintenance requests</p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Report Issue
              </button>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-8">

        {/* New Request Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Report Maintenance Issue</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {tenancies.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tenancy</label>
                    <select
                      value={formTenancyId}
                      onChange={(e) => setFormTenancyId(e.target.value)}
                      className="input mt-1"
                    >
                      {tenancies
                        .filter((t) => ["ACTIVE", "NOTICE_GIVEN"].includes(t.status))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.property?.title} {t.unit ? `(Unit ${t.unit.unitNumber})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Leaking faucet in kitchen"
                    className="input mt-1"
                    maxLength={200}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description *</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    className="input mt-1"
                    rows={4}
                    maxLength={5000}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="input mt-1"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="input mt-1"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location in Unit
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Kitchen, Bathroom"
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preferred Access Time
                  </label>
                  <input
                    type="text"
                    value={formAccessTime}
                    onChange={(e) => setFormAccessTime(e.target.value)}
                    placeholder="e.g. Weekdays 9am-5pm"
                    className="input mt-1"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Requests List */}
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">No maintenance requests</p>
            <p className="mt-1 text-sm text-gray-400">
              Report an issue and it will be tracked here.
            </p>
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
                    </div>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{r.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      {r.category && <span>{r.category}</span>}
                      <span>Priority: {r.priority}</span>
                      <span>{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {r.assignedTo && (
                  <p className="mt-2 text-xs text-gray-500">
                    Assigned to: {r.assignedTo.name}
                  </p>
                )}

                {r.updates?.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-gray-500">
                      Latest Update
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {r.updates[r.updates.length - 1].message}
                    </p>
                  </div>
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
