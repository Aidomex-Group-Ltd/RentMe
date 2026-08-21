"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  Settings,
  Shield,
  Bell,
  Globe,
  DollarSign,
  Users,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { toast } from "sonner";

interface Setting {
  id: string;
  key: string;
  value: any;
  category: string | null;
}

const DEFAULT_SETTINGS: { key: string; label: string; category: string; type: "text" | "number" | "boolean"; description: string; defaultValue: any }[] = [
  { key: "site_name", label: "Site Name", category: "general", type: "text", description: "Display name of the platform", defaultValue: "RentMe" },
  { key: "site_url", label: "Site URL", category: "general", type: "text", description: "Production domain URL", defaultValue: "https://rentme.ug" },
  { key: "support_email", label: "Support Email", category: "general", type: "text", description: "Contact email for support", defaultValue: "" },
  { key: "min_rent", label: "Minimum Rent (UGX)", category: "listings", type: "number", description: "Minimum allowed rent amount", defaultValue: 50000 },
  { key: "max_photos_per_listing", label: "Max Photos per Listing", category: "listings", type: "number", description: "Maximum number of photos per property", defaultValue: 10 },
  { key: "auto_approve_listings", label: "Auto-Approve Listings", category: "listings", type: "boolean", description: "Automatically approve new listings without review", defaultValue: false },
  { key: "require_landlord_verification", label: "Require Landlord Verification", category: "listings", type: "boolean", description: "Require identity verification before listing", defaultValue: false },
  { key: "allow_agent_listings", label: "Allow Agent Listings", category: "listings", type: "boolean", description: "Allow agents to create property listings", defaultValue: true },
  { key: "enable_reports", label: "Enable Reports", category: "moderation", type: "boolean", description: "Allow users to report listings and users", defaultValue: true },
  { key: "enable_reviews", label: "Enable Reviews", category: "moderation", type: "boolean", description: "Allow tenants to review properties", defaultValue: true },
  { key: "enable_viewings", label: "Enable Viewings", category: "features", type: "boolean", description: "Allow tenants to request property viewings", defaultValue: true },
  { key: "enable_messages", label: "Enable Messaging", category: "features", type: "boolean", description: "Allow direct messaging between users", defaultValue: true },
  { key: "featured_listing_price", label: "Featured Listing Price (UGX)", category: "payments", type: "number", description: "Price for featured listing placement", defaultValue: 50000 },
];

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchSettings();
  }, [status]);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data.settings || []);

      // Merge with defaults
      const values: Record<string, any> = {};
      for (const def of DEFAULT_SETTINGS) {
        const existing = data.settings?.find((s: Setting) => s.key === def.key);
        values[def.key] = existing?.value ?? def.defaultValue;
      }
      setLocalValues(values);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = DEFAULT_SETTINGS.map((def) =>
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: def.key,
            value: localValues[def.key] ?? def.defaultValue,
            category: def.category,
          }),
        })
      );
      await Promise.all(promises);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(DEFAULT_SETTINGS.map((d) => d.category))];
  const categoryIcons: Record<string, any> = {
    general: Globe,
    listings: Settings,
    moderation: Shield,
    features: Bell,
    payments: DollarSign,
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push("/admin")} className="p-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 font-display">System Settings</h1>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>

        <div className="page-container py-6 space-y-6">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat] || Settings;
            const catSettings = DEFAULT_SETTINGS.filter((d) => d.category === cat);
            return (
              <div key={cat} className="card overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-brand-500" />
                    <h2 className="font-semibold text-gray-900 capitalize">{cat} Settings</h2>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {catSettings.map((def) => (
                    <div key={def.key} className="flex items-center gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{def.label}</p>
                        <p className="text-xs text-gray-500">{def.description}</p>
                      </div>
                      <div className="shrink-0">
                        {def.type === "boolean" ? (
                          <button
                            onClick={() => setLocalValues((v) => ({ ...v, [def.key]: !v[def.key] }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              localValues[def.key] ? "bg-green-500" : "bg-gray-300"
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
                            value={localValues[def.key] ?? ""}
                            onChange={(e) => setLocalValues((v) => ({ ...v, [def.key]: Number(e.target.value) }))}
                            className="input w-32 text-right"
                          />
                        ) : (
                          <input
                            type="text"
                            value={localValues[def.key] ?? ""}
                            onChange={(e) => setLocalValues((v) => ({ ...v, [def.key]: e.target.value }))}
                            className="input w-64"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
