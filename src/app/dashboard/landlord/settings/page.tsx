"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Bell,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  DollarSign,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Home,
  FileText,
  Users,
  Wrench,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { toast } from "sonner";

type NotificationPreferences = {
  newMessage: boolean;
  viewingRequest: boolean;
  viewingUpdate: boolean;
  applicationUpdate: boolean;
  listingApproved: boolean;
  listingRejected: boolean;
  savedSearchMatch: boolean;
  priceChange: boolean;
  securityAlerts: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
};

const NOTIFICATION_CATEGORIES = [
  {
    id: "applications",
    label: "Applications",
    icon: FileText,
    items: [
      { key: "applicationUpdate" as const, label: "New applications", desc: "When a tenant submits an application" },
      { key: "listingApproved" as const, label: "Listing approved", desc: "When your listing is approved by admin" },
      { key: "listingRejected" as const, label: "Listing rejected", desc: "When your listing is rejected" },
    ],
  },
  {
    id: "messages",
    label: "Messages & Viewings",
    icon: MessageSquare,
    items: [
      { key: "newMessage" as const, label: "New messages", desc: "When you receive a new message" },
      { key: "viewingRequest" as const, label: "Viewing requests", desc: "When a tenant requests a property viewing" },
      { key: "viewingUpdate" as const, label: "Viewing updates", desc: "When a viewing status changes" },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    icon: DollarSign,
    items: [
      { key: "savedSearchMatch" as const, label: "Saved search matches", desc: "When a property matches a tenant's saved search" },
      { key: "priceChange" as const, label: "Price alerts", desc: "Market price change notifications" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: AlertTriangle,
    items: [
      { key: "securityAlerts" as const, label: "Security alerts", desc: "Important account security notifications" },
    ],
  },
];

const CHANNEL_OPTIONS = [
  { key: "pushEnabled" as const, label: "Push Notifications", icon: Bell, desc: "In-app notifications" },
  { key: "emailEnabled" as const, label: "Email", icon: Mail, desc: "Email notifications" },
  { key: "smsEnabled" as const, label: "SMS", icon: Phone, desc: "Text message notifications" },
];

// Rent reminder configuration (stored locally for now, can be backed by API later)
type RentReminderConfig = {
  enabled: boolean;
  daysBeforeDue: number[];
  overdueAlertFrequency: string;
  lateFeeEnabled: boolean;
  lateFeePercentage: number;
  lateFeeGracePeriodDays: number;
};

const DEFAULT_REMINDER_CONFIG: RentReminderConfig = {
  enabled: true,
  daysBeforeDue: [3, 1],
  overdueAlertFrequency: "daily",
  lateFeeEnabled: true,
  lateFeePercentage: 5,
  lateFeeGracePeriodDays: 7,
};

// Notification templates (display only for now)
const NOTIFICATION_TEMPLATES = [
  {
    id: "rent_reminder",
    name: "Rent Due Reminder",
    trigger: "3 days before due date",
    channel: "In-app + Email",
    example: "Your rent of UGX 800,000 for 'Sunset Apartments' is due in 3 days.",
  },
  {
    id: "rent_overdue",
    name: "Rent Overdue",
    trigger: "After due date",
    channel: "In-app + Email + SMS",
    example: "Your rent of UGX 800,000 for 'Sunset Apartments' was due on 01/09/2026 and is now overdue.",
  },
  {
    id: "late_fee",
    name: "Late Fee Applied",
    trigger: "After grace period",
    channel: "In-app + Email",
    example: "A late fee of UGX 40,000 has been applied to your overdue rent charge.",
  },
  {
    id: "lease_expiring",
    name: "Lease Expiring",
    trigger: "30 days before lease end",
    channel: "In-app + Email",
    example: "Your lease for 'Sunset Apartments' expires on 01/12/2026. Contact your landlord about renewal.",
  },
  {
    id: "new_application",
    name: "New Application",
    trigger: "When tenant applies",
    channel: "In-app + Email",
    example: "Someone applied for 'Sunset Apartments - Unit A'.",
  },
  {
    id: "maintenance_submitted",
    name: "Maintenance Request",
    trigger: "When tenant submits request",
    channel: "In-app + Email",
    example: "New maintenance request: 'Leaking faucet' for 'Sunset Apartments'.",
  },
];

export default function LandlordSettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "reminders" | "templates">("notifications");

  // Notification preferences
  const [preferences, setPreferences] = useState<NotificationPreferences>({
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

  // Rent reminder config
  const [reminderConfig, setReminderConfig] = useState<RentReminderConfig>(
    DEFAULT_REMINDER_CONFIG
  );

  // Custom reminder days input
  const [customDays, setCustomDays] = useState("3, 1");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchSettings();
  }, [authStatus]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setPreferences((prev) => ({
            ...prev,
            ...data.preferences,
          }));
        }
        // Load reminder config from localStorage (or use defaults)
        const savedConfig = localStorage.getItem("rentReminderConfig");
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            setReminderConfig(parsed);
            setCustomDays(parsed.daysBeforeDue?.join(", ") || "3, 1");
          } catch {
            /* use defaults */
          }
        }
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePreferences() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });

      if (res.ok) {
        toast.success("Notification preferences saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save preferences");
      }
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveReminders() {
    // Parse custom days
    const days = customDays
      .split(",")
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => !isNaN(d) && d > 0 && d <= 30)
      .sort((a, b) => b - a);

    const config = { ...reminderConfig, daysBeforeDue: days.length > 0 ? days : [3, 1] };
    setReminderConfig(config);
    localStorage.setItem("rentReminderConfig", JSON.stringify(config));
    toast.success("Rent reminder settings saved");
  }

  function togglePreference(key: keyof NotificationPreferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const tabs = [
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "reminders" as const, label: "Rent Reminders", icon: Clock },
    { id: "templates" as const, label: "Templates", icon: FileText },
  ];

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Settings
                </h1>
                <p className="mt-1 text-gray-500">
                  Configure notifications, reminders, and templates
                </p>
              </div>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-6">
          {/* Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════ */}
              {/* NOTIFICATION PREFERENCES TAB */}
              {/* ═══════════════════════════════════════════ */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  {/* Delivery Channels */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                      <Settings className="h-5 w-5 text-gray-500" />
                      Delivery Channels
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose how you want to receive notifications
                    </p>
                    <div className="mt-4 space-y-3">
                      {CHANNEL_OPTIONS.map((channel) => (
                        <div
                          key={channel.key}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <channel.icon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {channel.label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {channel.desc}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => togglePreference(channel.key)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                              preferences[channel.key]
                                ? "bg-brand-500"
                                : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                preferences[channel.key]
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notification Categories */}
                  {NOTIFICATION_CATEGORIES.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-xl border border-gray-200 bg-white p-6"
                    >
                      <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                        <category.icon className="h-5 w-5 text-gray-500" />
                        {category.label}
                      </h2>
                      <div className="mt-4 space-y-3">
                        {category.items.map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.desc}
                              </p>
                            </div>
                            <button
                              onClick={() => togglePreference(item.key)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                preferences[item.key]
                                  ? "bg-brand-500"
                                  : "bg-gray-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  preferences[item.key]
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Save Button */}
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Notification Preferences
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* RENT REMINDERS TAB */}
              {/* ═══════════════════════════════════════════ */}
              {activeTab === "reminders" && (
                <div className="space-y-6">
                  {/* Enable/Disable */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                          <Clock className="h-5 w-5 text-gray-500" />
                          Automated Rent Reminders
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Automatically remind tenants about upcoming and overdue rent
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setReminderConfig((prev) => ({
                            ...prev,
                            enabled: !prev.enabled,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                          reminderConfig.enabled
                            ? "bg-brand-500"
                            : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            reminderConfig.enabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {reminderConfig.enabled && (
                    <>
                      {/* Reminder Schedule */}
                      <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="font-semibold text-gray-900">
                          Upcoming Rent Reminders
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Send reminders to tenants before rent is due
                        </p>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Remind days before due date (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={customDays}
                            onChange={(e) => setCustomDays(e.target.value)}
                            className="input mt-1"
                            placeholder="e.g. 7, 3, 1"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Enter numbers separated by commas. Example: 7, 3, 1
                            sends reminders 7, 3, and 1 day(s) before the due
                            date.
                          </p>
                        </div>
                      </div>

                      {/* Overdue Settings */}
                      <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <h3 className="font-semibold text-gray-900">
                          Overdue Notifications
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Configure how often to alert about overdue rent
                        </p>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Alert frequency
                          </label>
                          <select
                            value={reminderConfig.overdueAlertFrequency}
                            onChange={(e) =>
                              setReminderConfig((prev) => ({
                                ...prev,
                                overdueAlertFrequency: e.target.value,
                              }))
                            }
                            className="input mt-1"
                          >
                            <option value="daily">Daily</option>
                            <option value="every_3_days">Every 3 days</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>
                      </div>

                      {/* Late Fee Settings */}
                      <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Late Fees
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Automatically apply late fees after the grace
                              period
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setReminderConfig((prev) => ({
                                ...prev,
                                lateFeeEnabled: !prev.lateFeeEnabled,
                              }))
                            }
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                              reminderConfig.lateFeeEnabled
                                ? "bg-brand-500"
                                : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                reminderConfig.lateFeeEnabled
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        {reminderConfig.lateFeeEnabled && (
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Late fee percentage
                              </label>
                              <div className="relative mt-1">
                                <input
                                  type="number"
                                  value={reminderConfig.lateFeePercentage}
                                  onChange={(e) =>
                                    setReminderConfig((prev) => ({
                                      ...prev,
                                      lateFeePercentage: Math.min(
                                        50,
                                        Math.max(0, parseInt(e.target.value) || 0)
                                      ),
                                    }))
                                  }
                                  className="input pr-8"
                                  min={0}
                                  max={50}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                                  %
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                Applied to the overdue amount (0-50%)
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Grace period (days)
                              </label>
                              <input
                                type="number"
                                value={reminderConfig.lateFeeGracePeriodDays}
                                onChange={(e) =>
                                  setReminderConfig((prev) => ({
                                    ...prev,
                                    lateFeeGracePeriodDays: Math.max(
                                      0,
                                      parseInt(e.target.value) || 0
                                    ),
                                  }))
                                }
                                className="input mt-1"
                                min={0}
                                max={30}
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Days after due date before applying fee
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={handleSaveReminders}
                        className="btn-primary"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Reminder Settings
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* TEMPLATES TAB */}
              {/* ═══════════════════════════════════════════ */}
              {activeTab === "templates" && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                      <FileText className="h-5 w-5 text-gray-500" />
                      Notification Templates
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      These are the notification messages sent to tenants and
                      landlords. Templates are system-managed for consistency.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {NOTIFICATION_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-xl border border-gray-200 bg-white p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {template.name}
                            </h3>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {template.trigger}
                              </span>
                              <span className="flex items-center gap-1">
                                <Bell className="h-3 w-3" />
                                {template.channel}
                              </span>
                            </div>
                          </div>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            System
                          </span>
                        </div>
                        <div className="mt-3 rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Example
                          </p>
                          <p className="mt-1 text-sm text-gray-600 italic">
                            &ldquo;{template.example}&rdquo;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Template Customization
                        </p>
                        <p className="mt-1 text-xs text-blue-700">
                          Custom templates are coming soon. Currently, all
                          notifications use system-managed templates for
                          consistency and compliance. Contact support if you
                          need custom messaging.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
