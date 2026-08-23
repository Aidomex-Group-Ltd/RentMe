"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, Clock, Filter } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "", label: "All Notices" },
  { value: "RENT_REMINDER", label: "Rent Reminders" },
  { value: "MAINTENANCE_NOTICE", label: "Maintenance" },
  { value: "INSPECTION_NOTICE", label: "Inspections" },
  { value: "LEASE_RENEWAL", label: "Lease Renewal" },
  { value: "GENERAL_ANNOUNCEMENT", label: "Announcements" },
  { value: "MOVE_OUT_NOTICE", label: "Move-out" },
];

const TYPE_COLORS: Record<string, string> = {
  RENT_REMINDER: "bg-green-100 text-green-800",
  MAINTENANCE_NOTICE: "bg-blue-100 text-blue-800",
  INSPECTION_NOTICE: "bg-purple-100 text-purple-800",
  LEASE_RENEWAL: "bg-indigo-100 text-indigo-800",
  GENERAL_ANNOUNCEMENT: "bg-gray-100 text-gray-700",
  MOVE_OUT_NOTICE: "bg-orange-100 text-orange-800",
};

type Notice = {
  id: string;
  type: string;
  subject: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  tenancy: {
    id: string;
    property: { title: string };
    unit: { unitNumber: string } | null;
  } | null;
  sender: { id: string; name: string; avatar: string | null };
};

export default function TenantNoticesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") fetchNotices();
  }, [status, typeFilter, unreadOnly]);

  async function fetchNotices() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (unreadOnly) params.set("unread", "true");

      const res = await fetch(`/api/notices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(noticeId: string) {
    try {
      const res = await fetch("/api/notices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeId }),
      });
      if (res.ok) {
        setNotices((prev) =>
          prev.map((n) => (n.id === noticeId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      toast.error("Failed to mark as read");
    }
  }

  function toggleExpand(notice: Notice) {
    if (expandedId === notice.id) {
      setExpandedId(null);
    } else {
      setExpandedId(notice.id);
      if (!notice.isRead) {
        markAsRead(notice.id);
      }
    }
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">Notices</h1>
                <p className="mt-1 text-gray-500">Announcements and notices from your landlord</p>
              </div>
              {unreadCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                  <Bell className="h-4 w-4" />
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-8">

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              unreadOnly
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Bell className="h-4 w-4" />
            {unreadOnly ? "Showing Unread" : "Unread Only"}
          </button>
        </div>

        {/* Notices List */}
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="mt-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">No notices</p>
            <p className="mt-1 text-sm text-gray-400">
              {unreadOnly ? "All caught up! No unread notices." : "Notices from your landlord will appear here."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                  notice.isRead ? "border-gray-200" : "border-brand-200 bg-brand-50/30"
                }`}
              >
                <button
                  onClick={() => toggleExpand(notice)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {!notice.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                        )}
                        <h3 className={`font-medium ${notice.isRead ? "text-gray-700" : "text-gray-900"}`}>
                          {notice.subject}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[notice.type] || "bg-gray-100 text-gray-600"}`}
                        >
                          {notice.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>From {notice.sender.name}</span>
                        {notice.tenancy && (
                          <>
                            <span>·</span>
                            <span>
                              {notice.tenancy.property.title}
                              {notice.tenancy.unit ? ` · Unit ${notice.tenancy.unit.unitNumber}` : ""}
                            </span>
                          </>
                        )}
                        <span>· {timeAgo(notice.createdAt)}</span>
                      </div>
                    </div>
                    <Clock className={`h-4 w-4 shrink-0 ${notice.isRead ? "text-gray-300" : "text-brand-400"}`} />
                  </div>

                  {expandedId === notice.id && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      <p className="whitespace-pre-wrap text-sm text-gray-700">{notice.message}</p>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
