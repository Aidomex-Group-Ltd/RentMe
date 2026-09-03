"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Save,
  Settings,
  Shield,
  Bell,
  Globe,
  DollarSign,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import { toast } from "sonner";

type SettingValue = string | number | boolean;

interface SettingDef {
  key: string;
  label: string;
  category: string;
  type: "text" | "number" | "boolean";
  description: string;
  defaultValue: SettingValue;
}

interface StoredSetting {
  id: string;
  key: string;
  value: unknown;
  category: string | null;
}

const DEFAULT_SETTINGS: SettingDef[] = [
  {
    key: "site_name",
    label: "Site Name",
    category: "general",
    type: "text",
    description: "Display name of the platform",
    defaultValue: "Erikot Properties",
  },
  {
    key: "site_url",
    label: "Site URL",
    category: "general",
    type: "text",
    description: "Production domain URL",
    defaultValue: "https://rentme.ug",
  },
  {
    key: "support_email",
    label: "Support Email",
    category: "general",
    type: "text",
    description: "Contact email for support",
    defaultValue: "",
  },
  {
    key: "min_rent",
    label: "Minimum Rent (UGX)",
    category: "listings",
    type: "number",
    description: "Minimum allowed rent amount",
    defaultValue: 50000,
  },
  {
    key: "max_photos_per_listing",
    label: "Max Photos per Listing",
    category: "listings",
    type: "number",
    description: "Maximum number of photos per property",
    defaultValue: 10,
  },
  {
    key: "auto_approve_listings",
    label: "Auto-Approve Listings",
    category: "listings",
    type: "boolean",
    description: "Automatically approve new listings without review",
    defaultValue: false,
  },
  {
    key: "require_landlord_verification",
    label: "Require Landlord Verification",
    category: "listings",
    type: "boolean",
    description: "Require identity verification before listing",
    defaultValue: false,
  },
  {
    key: "allow_agent_listings",
    label: "Allow Agent Listings",
    category: "listings",
    type: "boolean",
    description: "Allow agents to create property listings",
    defaultValue: true,
  },
  {
    key: "enable_reports",
    label: "Enable Reports",
    category: "moderation",
    type: "boolean",
    description: "Allow users to report listings and users",
    defaultValue: true,
  },
  {
    key: "enable_reviews",
    label: "Enable Reviews",
    category: "moderation",
    type: "boolean",
    description: "Allow tenants to review properties",
    defaultValue: true,
  },
  {
    key: "enable_viewings",
    label: "Enable Viewings",
    category: "features",
    type: "boolean",
    description: "Allow tenants to request property viewings",
    defaultValue: true,
  },
  {
    key: "enable_messages",
    label: "Enable Messaging",
    category: "features",
    type: "boolean",
    description: "Allow direct messaging between users",
    defaultValue: true,
  },
  {
    key: "featured_listing_price",
    label: "Featured Listing Price (UGX)",
    category: "payments",
    type: "number",
    description: "Price for featured listing placement",
    defaultValue: 50000,
  },
];

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  general: Globe,
  listings: Settings,
  moderation: Shield,
  features: Bell,
  payments: DollarSign,
};

const SENSITIVE_RE = /secret|password|key|token|database/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_RE.test(key);
}

function maskValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (str.length <= 4) return "••••";
  return `${"•".repeat(Math.min(12, str.length - 2))}${str.slice(-2)}`;
}

function coerceValue(def: SettingDef, raw: unknown): SettingValue {
  if (raw === undefined || raw === null) return def.defaultValue;
  if (def.type === "boolean") return Boolean(raw);
  if (def.type === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : def.defaultValue;
  }
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return def.defaultValue;
}

export default function AdminSettingsPage() {
  const [localValues, setLocalValues] = useState<Record<string, SettingValue>>({});
  const [extraSettings, setExtraSettings] = useState<StoredSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const stored: StoredSetting[] = data.settings || [];

      const values: Record<string, SettingValue> = {};
      for (const def of DEFAULT_SETTINGS) {
        const existing = stored.find((s) => s.key === def.key);
        values[def.key] = coerceValue(def, existing?.value);
      }
      setLocalValues(values);

      const known = new Set(DEFAULT_SETTINGS.map((d) => d.key));
      setExtraSettings(stored.filter((s) => !known.has(s.key)));
    } catch {
      setError("Unable to load settings. Please try again.");
      toast.error("Unable to load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const results = await Promise.all(
        DEFAULT_SETTINGS.map((def) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: def.key,
              value: localValues[def.key] ?? def.defaultValue,
              category: def.category,
            }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error("Failed");
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const categories = [...new Set(DEFAULT_SETTINGS.map((d) => d.category))];

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        description="Platform configuration — secrets are never shown in clear text"
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !!error}
              className="btn-primary text-sm"
            >
              <Save className="mr-2 h-4 w-4" aria-hidden />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : (
          <>
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] || Settings;
              const catSettings = DEFAULT_SETTINGS.filter((d) => d.category === cat);
              return (
                <section
                  key={cat}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                    <Icon className="h-4 w-4 text-brand-600" aria-hidden />
                    <h2 className="text-sm font-semibold capitalize text-gray-900">
                      {cat}
                    </h2>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {catSettings.map((def) => (
                      <li
                        key={def.key}
                        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{def.label}</p>
                          <p className="text-xs text-gray-500">{def.description}</p>
                        </div>
                        <div className="shrink-0">
                          {isSensitiveKey(def.key) ? (
                            <p className="rounded-md bg-gray-100 px-3 py-2 font-mono text-sm text-gray-500">
                              {maskValue(localValues[def.key])}
                            </p>
                          ) : def.type === "boolean" ? (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(localValues[def.key])}
                              onClick={() =>
                                setLocalValues((v) => ({
                                  ...v,
                                  [def.key]: !v[def.key],
                                }))
                              }
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                localValues[def.key] ? "bg-brand-600" : "bg-gray-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  localValues[def.key] ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          ) : def.type === "number" ? (
                            <input
                              type="number"
                              value={Number(localValues[def.key] ?? 0)}
                              onChange={(e) =>
                                setLocalValues((v) => ({
                                  ...v,
                                  [def.key]: Number(e.target.value),
                                }))
                              }
                              className="input w-full text-right sm:w-32"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(localValues[def.key] ?? "")}
                              onChange={(e) =>
                                setLocalValues((v) => ({
                                  ...v,
                                  [def.key]: e.target.value,
                                }))
                              }
                              className="input w-full sm:w-64"
                            />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            {extraSettings.length > 0 && (
              <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-gray-900">Other stored keys</h2>
                  <p className="text-xs text-gray-500">
                    Read-only. Sensitive values are masked.
                  </p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {extraSettings.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-sm text-gray-900">{s.key}</p>
                        {s.category && (
                          <p className="text-xs text-gray-400">{s.category}</p>
                        )}
                      </div>
                      <p className="font-mono text-sm text-gray-500">
                        {isSensitiveKey(s.key)
                          ? maskValue(s.value)
                          : typeof s.value === "string"
                            ? s.value
                            : JSON.stringify(s.value)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
