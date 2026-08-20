"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Shield, Eye, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState({
    newMessage: true,
    viewingRequest: true,
    viewingUpdate: true,
    applicationUpdate: true,
    listingApproved: true,
    listingRejected: true,
    savedSearchMatch: true,
    priceChange: true,
    securityAlerts: true,
    emailEnabled: false,
    pushEnabled: true,
    smsEnabled: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <h1 className="text-xl font-bold text-gray-900 font-display">Settings</h1>
          </div>
        </div>

        <div className="page-container max-w-2xl py-8 space-y-6">
          {/* Notification Preferences */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-brand-500" />
              <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
            </div>

            <div className="space-y-3">
              {[
                { key: "newMessage", label: "New messages" },
                { key: "viewingRequest", label: "Viewing requests" },
                { key: "viewingUpdate", label: "Viewing updates" },
                { key: "applicationUpdate", label: "Application updates" },
                { key: "listingApproved", label: "Listing approved" },
                { key: "listingRejected", label: "Listing rejected" },
                { key: "savedSearchMatch", label: "Saved search matches" },
                { key: "priceChange", label: "Price changes" },
                { key: "securityAlerts", label: "Security alerts" },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <button
                    onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      notifications[item.key as keyof typeof notifications]
                        ? "bg-brand-500"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        notifications[item.key as keyof typeof notifications]
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Notification Channels</h3>
              {[
                { key: "pushEnabled", label: "Push Notifications" },
                { key: "emailEnabled", label: "Email Notifications" },
                { key: "smsEnabled", label: "SMS Notifications" },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <button
                    onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      notifications[item.key as keyof typeof notifications]
                        ? "bg-brand-500"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        notifications[item.key as keyof typeof notifications]
                          ? "translate-x-5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Account */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-brand-500" />
              <h2 className="font-semibold text-gray-900">Account</h2>
            </div>
            <div className="space-y-3">
              <button className="btn-secondary w-full justify-start text-sm">
                Change Password
              </button>
              <button className="btn-secondary w-full justify-start text-sm">
                Two-Factor Authentication
              </button>
              <button className="btn-danger w-full justify-start text-sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
