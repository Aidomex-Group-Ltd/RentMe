"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  MapPin,
  Search,
  ToggleLeft,
  ToggleRight,
  Building,
  Globe,
} from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import { toast } from "sonner";

export default function AdminLocationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("district");

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchLocations();
  }, [status, typeFilter]);

  async function fetchLocations() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/locations?${params}`);
      const data = await res.json();
      setLocations(data.locations || []);
    } catch {
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }

  const createLocation = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      if (res.ok) {
        toast.success("Location created");
        setNewName("");
        setShowCreate(false);
        fetchLocations();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create location");
      }
    } catch {
      toast.error("Failed to create location");
    }
  };

  const toggleActive = async (locationId: string, isActive: boolean) => {
    try {
      await fetch("/api/admin/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, isActive }),
      });
      fetchLocations();
    } catch {
      toast.error("Failed to update location");
    }
  };

  const typeColors: Record<string, string> = {
    country: "bg-blue-100 text-blue-700",
    region: "bg-green-100 text-green-700",
    district: "bg-purple-100 text-purple-700",
    city: "bg-amber-100 text-amber-700",
    division: "bg-cyan-100 text-cyan-700",
    neighborhood: "bg-pink-100 text-pink-700",
  };

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 font-display">Locations</h1>
              <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
                <Plus className="mr-2 h-4 w-4" /> Add Location
              </button>
            </div>
          </div>
        </div>

        <div className="page-container py-6 space-y-6">
          {/* Create form */}
          {showCreate && (
            <div className="card p-6">
              <h3 className="mb-4 font-semibold text-gray-900">New Location</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Location name"
                  className="input flex-1"
                  onKeyDown={(e) => e.key === "Enter" && createLocation()}
                />
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="input w-auto">
                  <option value="country">Country</option>
                  <option value="region">Region</option>
                  <option value="district">District</option>
                  <option value="city">City</option>
                  <option value="division">Division</option>
                  <option value="neighborhood">Neighborhood</option>
                </select>
                <button onClick={createLocation} className="btn-primary">
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLocations()}
                className="input pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["", "country", "district", "city", "division", "neighborhood"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    typeFilter === t
                      ? "bg-brand-500 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t || "All"}
                </button>
              ))}
            </div>
          </div>

          {/* Locations table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : locations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Properties</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Children</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {locations.map((loc) => (
                      <tr key={loc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{loc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge text-xs ${typeColors[loc.type] || "bg-gray-100 text-gray-600"}`}>
                            {loc.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{loc._count?.properties || 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{loc._count?.children || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`badge text-xs ${loc.isActive ? "badge-verified" : "bg-gray-100 text-gray-600"}`}>
                            {loc.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleActive(loc.id, !loc.isActive)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {loc.isActive ? (
                              <ToggleRight className="h-5 w-5 text-green-500" />
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
            ) : (
              <div className="p-12 text-center text-gray-500">No locations found</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
