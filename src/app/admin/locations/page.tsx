"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Plus,
  MapPin,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import StatusBadge from "@/components/admin/status-badge";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import { toast } from "sonner";

interface LocationRow {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  _count?: { properties: number; children: number };
}

const TYPE_OPTIONS = ["", "country", "region", "district", "city", "division", "neighborhood"];

const TYPE_TONE: Record<string, string> = {
  country: "bg-blue-50 text-blue-800 ring-blue-600/20",
  region: "bg-green-50 text-green-800 ring-green-600/20",
  district: "bg-brand-50 text-brand-800 ring-brand-600/20",
  city: "bg-amber-50 text-amber-800 ring-amber-600/20",
  division: "bg-cyan-50 text-cyan-800 ring-cyan-600/20",
  neighborhood: "bg-gray-100 text-gray-700 ring-gray-500/20",
};

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("district");
  const [creating, setCreating] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<LocationRow | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/locations?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLocations(data.locations || []);
    } catch {
      setError("Unable to load locations. Please try again.");
      toast.error("Unable to load locations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function createLocation() {
    if (!newName.trim()) {
      toast.error("Enter a location name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to create location"
        );
      }
      toast.success("Location created");
      setNewName("");
      setShowCreate(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create location");
    } finally {
      setCreating(false);
    }
  }

  async function applyToggle() {
    if (!toggleTarget) return;
    setActing(true);
    const next = !toggleTarget.isActive;
    try {
      const res = await fetch("/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: toggleTarget.id, isActive: next }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(next ? "Location activated" : "Location deactivated");
      setToggleTarget(null);
      await load();
    } catch {
      toast.error("Failed to update location. Please try again.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Locations"
        description="Districts, cities, and neighborhoods used across listings"
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
            <button type="button" onClick={() => setShowCreate((v) => !v)} className="btn-primary text-sm">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add location
            </button>
          </div>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {showCreate && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">New location</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Location name"
                className="input flex-1"
                onKeyDown={(e) => e.key === "Enter" && createLocation()}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="input w-full sm:w-auto"
              >
                <option value="country">Country</option>
                <option value="region">Region</option>
                <option value="district">District</option>
                <option value="city">City</option>
                <option value="division">Division</option>
                <option value="neighborhood">Neighborhood</option>
              </select>
              <button
                type="button"
                onClick={createLocation}
                disabled={creating}
                className="btn-primary"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="search"
              placeholder="Search locations…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearch(searchInput.trim());
              }}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t || "all"}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-brand-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t || "All"}
              </button>
            ))}
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => setSearch(searchInput.trim())}
            >
              Search
            </button>
          </div>
        </div>

        {loading && locations.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error && locations.length === 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : locations.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No locations found</p>
            <p className="mt-1 text-sm text-gray-500">
              Add a district or neighborhood, or clear search filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Properties
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Children
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" aria-hidden />
                          <span className="text-sm font-medium text-gray-900">{loc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            TYPE_TONE[loc.type] || TYPE_TONE.neighborhood
                          }`}
                        >
                          {loc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {loc._count?.properties ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {loc._count?.children ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={loc.isActive ? "ACTIVE" : "ARCHIVED"} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setToggleTarget(loc)}
                          className="inline-flex text-gray-400 hover:text-gray-700"
                          aria-label={loc.isActive ? "Deactivate location" : "Activate location"}
                        >
                          {loc.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-300" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-2 md:hidden">
              {locations.map((loc) => (
                <li key={loc.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{loc.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500 capitalize">{loc.type}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {loc._count?.properties ?? 0} properties · {loc._count?.children ?? 0}{" "}
                        children
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setToggleTarget(loc)}
                      aria-label={loc.isActive ? "Deactivate location" : "Activate location"}
                    >
                      {loc.isActive ? (
                        <ToggleRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-300" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {toggleTarget && (
        <ConfirmDialog
          open
          title={toggleTarget.isActive ? "Deactivate location" : "Activate location"}
          description={
            toggleTarget.isActive
              ? `Deactivate “${toggleTarget.name}”? It will be hidden from location pickers. Existing listings keep their district text. This can be reversed.`
              : `Activate “${toggleTarget.name}”? It will appear in location pickers again.`
          }
          confirmLabel={toggleTarget.isActive ? "Deactivate" : "Activate"}
          tone={toggleTarget.isActive ? "warning" : "neutral"}
          loading={acting}
          onConfirm={applyToggle}
          onCancel={() => !acting && setToggleTarget(null)}
        />
      )}
    </div>
  );
}
