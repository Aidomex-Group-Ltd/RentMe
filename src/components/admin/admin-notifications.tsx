"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, X, Home, AlertTriangle, Shield } from "lucide-react";

interface Notification {
  id: string;
  type: "listing_review" | "report" | "verification";
  title: string;
  detail: string;
  timestamp: string;
}

interface NotificationCounts {
  pendingListings: number;
  pendingReports: number;
  pendingVerifications: number;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingListings: 0,
    pendingReports: 0,
    pendingVerifications: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({ since: lastCheck, limit: "10" });
      const res = await fetch(`/api/admin/notifications?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.notifications?.length > 0) {
        setNotifications((prev) => {
          const existing = new Set(prev.map((n) => n.id));
          const newOnes = data.notifications.filter((n: Notification) => !existing.has(n.id));
          return [...newOnes, ...prev].slice(0, 20);
        });
      }
      if (data.counts) {
        setCounts(data.counts);
      }
      setLastCheck(new Date().toISOString());
    } catch {
      // Silently fail - polling will retry
    }
  }, [lastCheck]);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const totalPending = counts.pendingListings + counts.pendingReports + counts.pendingVerifications;

  const typeIcon = (type: string) => {
    switch (type) {
      case "listing_review":
        return <Home className="h-4 w-4 text-blue-500" />;
      case "report":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "verification":
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const typeBg = (type: string) => {
    switch (type) {
      case "listing_review":
        return "bg-blue-50";
      case "report":
        return "bg-red-50";
      case "verification":
        return "bg-green-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {totalPending > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {totalPending > 9 ? "9+" : totalPending}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Counts summary */}
            <div className="grid grid-cols-3 gap-2 border-b border-gray-100 p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{counts.pendingListings}</p>
                <p className="text-[10px] text-gray-500">Listings</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">{counts.pendingReports}</p>
                <p className="text-[10px] text-gray-500">Reports</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{counts.pendingVerifications}</p>
                <p className="text-[10px] text-gray-500">Verifications</p>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${typeBg(n.type)}`}
                  >
                    <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 truncate">{n.detail}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(n.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-gray-400">No new notifications</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
