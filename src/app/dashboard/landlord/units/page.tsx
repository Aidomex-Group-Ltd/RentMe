"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Home,
  BedDouble,
  Bath,
  DollarSign,
  Save,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX } from "@/lib/utils";
import { toast } from "sonner";

const UNIT_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available", color: "bg-green-100 text-green-800" },
  { value: "RESERVED", label: "Reserved", color: "bg-yellow-100 text-yellow-800" },
  { value: "OCCUPIED", label: "Occupied", color: "bg-blue-100 text-blue-800" },
  { value: "MAINTENANCE", label: "Maintenance", color: "bg-orange-100 text-orange-800" },
  { value: "UNAVAILABLE", label: "Unavailable", color: "bg-red-100 text-red-800" },
];

const UNIT_TYPES = [
  "Studio",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "4 Bedroom",
  "Penthouse",
  "Self-contained",
  " Bedsitter",
  "Single Room",
  "Other",
];

type Property = {
  id: string;
  title: string;
  rent: number;
  district: string | null;
  bedrooms: number;
  bathrooms: number;
};

type Unit = {
  id: string;
  unitNumber: string;
  unitType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rent: number | null;
  deposit: number | null;
  status: string;
  amenities: string[];
  notes: string | null;
  _count: { tenancies: number };
};

type UnitForm = {
  unitNumber: string;
  unitType: string;
  bedrooms: string;
  bathrooms: string;
  rent: string;
  deposit: string;
  notes: string;
};

const EMPTY_FORM: UnitForm = {
  unitNumber: "",
  unitType: "",
  bedrooms: "",
  bathrooms: "",
  rent: "",
  deposit: "",
  notes: "",
};

export default function LandlordUnitsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState<UnitForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchProperties();
  }, [authStatus]);

  async function fetchProperties() {
    setLoading(true);
    try {
      const res = await fetch("/api/properties?mine=1&limit=100");
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
        if (data.properties?.length > 0) {
          setSelectedPropertyId(data.properties[0].id);
        }
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  const fetchUnits = useCallback(async (propertyId: string) => {
    if (!propertyId) {
      setUnits([]);
      return;
    }
    setLoadingUnits(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`);
      if (res.ok) {
        const data = await res.json();
        setUnits(data.units || []);
      }
    } catch {
      /* noop */
    } finally {
      setLoadingUnits(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPropertyId) fetchUnits(selectedPropertyId);
  }, [selectedPropertyId, fetchUnits]);

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setEditingUnit(null);
    setShowCreateModal(true);
  }

  function openEditModal(unit: Unit) {
    setForm({
      unitNumber: unit.unitNumber,
      unitType: unit.unitType || "",
      bedrooms: unit.bedrooms?.toString() || "",
      bathrooms: unit.bathrooms?.toString() || "",
      rent: unit.rent?.toString() || "",
      deposit: unit.deposit?.toString() || "",
      notes: unit.notes || "",
    });
    setEditingUnit(unit);
    setShowCreateModal(true);
  }

  function closeModal() {
    setShowCreateModal(false);
    setEditingUnit(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!form.unitNumber.trim()) {
      toast.error("Unit number is required");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        unitNumber: form.unitNumber.trim(),
        unitType: form.unitType || null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : null,
        rent: form.rent ? parseInt(form.rent, 10) : null,
        deposit: form.deposit ? parseInt(form.deposit, 10) : null,
        notes: form.notes || null,
      };

      let res;
      if (editingUnit) {
        res = await fetch(`/api/properties/${selectedPropertyId}/units`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitId: editingUnit.id, ...body }),
        });
      } else {
        res = await fetch(`/api/properties/${selectedPropertyId}/units`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        toast.success(editingUnit ? "Unit updated" : "Unit created");
        closeModal();
        fetchUnits(selectedPropertyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save unit");
      }
    } catch {
      toast.error("Failed to save unit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(unitId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/properties/${selectedPropertyId}/units`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Unit status updated to ${newStatus.toLowerCase()}`);
        fetchUnits(selectedPropertyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(unitId: string) {
    if (!confirm("Are you sure you want to delete this unit?")) return;

    setDeletingId(unitId);
    try {
      const res = await fetch(
        `/api/properties/${selectedPropertyId}/units?unitId=${unitId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        toast.success("Unit deleted");
        fetchUnits(selectedPropertyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete unit");
      }
    } catch {
      toast.error("Failed to delete unit");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  // Status summary
  const statusCounts = units.reduce(
    (acc, u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Units
                </h1>
                <p className="mt-1 text-gray-500">
                  Manage units across your properties
                </p>
              </div>
              <button
                onClick={openCreateModal}
                disabled={!selectedPropertyId}
                className="btn-primary disabled:opacity-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Unit
              </button>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar />
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Property Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">
              Select Property
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="input mt-1 max-w-md"
            >
              <option value="">Select a property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.district ? ` (${p.district})` : ""}
                </option>
              ))}
            </select>
            {properties.length === 0 && !loading && (
              <p className="mt-1 text-xs text-gray-500">
                No properties found.{" "}
                <Link href="/dashboard/landlord/create" className="text-brand-600 hover:underline">
                  Create one first
                </Link>
                .
              </p>
            )}
          </div>

          {selectedPropertyId && (
            <>
              {/* Property Summary & Status Counts */}
              {selectedProperty && (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {selectedProperty.title}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedProperty.district} • {selectedProperty.bedrooms} bed •{" "}
                        {selectedProperty.bathrooms} bath • Base rent:{" "}
                        {formatUGX(selectedProperty.rent)}/mo
                      </p>
                    </div>
                    <Link
                      href={`/properties/${selectedProperty.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      View Listing
                    </Link>
                  </div>

                  {/* Status Bar */}
                  {units.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {UNIT_STATUS_OPTIONS.map((opt) => {
                        const count = statusCounts[opt.value] || 0;
                        return (
                          <span
                            key={opt.value}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                              count > 0 ? opt.color : "bg-gray-50 text-gray-400"
                            }`}
                          >
                            {opt.label}: {count}
                          </span>
                        );
                      })}
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        Total: {units.length}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Units List */}
              {loadingUnits ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No units yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add units to this property to manage individual rental spaces.
                  </p>
                  <button
                    onClick={openCreateModal}
                    className="btn-primary mt-4 text-sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Unit
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {units.map((unit) => {
                    const statusOpt = UNIT_STATUS_OPTIONS.find(
                      (s) => s.value === unit.status
                    );
                    return (
                      <div
                        key={unit.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          {/* Unit Info */}
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg font-bold text-gray-700">
                              {unit.unitNumber}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  Unit {unit.unitNumber}
                                </h3>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusOpt?.color || "bg-gray-100 text-gray-600"}`}
                                >
                                  {statusOpt?.label || unit.status}
                                </span>
                                {unit._count.tenancies > 0 && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                    {unit._count.tenancies} active tenancy
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                {unit.unitType && <span>{unit.unitType}</span>}
                                {unit.bedrooms != null && (
                                  <span className="flex items-center gap-1">
                                    <BedDouble className="h-3.5 w-3.5" />
                                    {unit.bedrooms} bed
                                  </span>
                                )}
                                {unit.bathrooms != null && (
                                  <span className="flex items-center gap-1">
                                    <Bath className="h-3.5 w-3.5" />
                                    {unit.bathrooms} bath
                                  </span>
                                )}
                                {unit.rent != null && (
                                  <span className="font-medium text-gray-900">
                                    {formatUGX(unit.rent)}/mo
                                  </span>
                                )}
                                {unit.deposit != null && (
                                  <span className="text-gray-400">
                                    Deposit: {formatUGX(unit.deposit)}
                                  </span>
                                )}
                              </div>
                              {unit.notes && (
                                <p className="mt-1 text-xs text-gray-400 line-clamp-1">
                                  {unit.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Status Quick Change */}
                            <select
                              value={unit.status}
                              onChange={(e) =>
                                handleStatusChange(unit.id, e.target.value)
                              }
                              className="input w-auto py-1 text-xs"
                            >
                              {UNIT_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => openEditModal(unit)}
                              className="rounded-lg bg-gray-50 p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                              title="Edit unit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(unit.id)}
                              disabled={
                                deletingId === unit.id ||
                                unit.status === "OCCUPIED"
                              }
                              className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 disabled:opacity-50"
                              title={
                                unit.status === "OCCUPIED"
                                  ? "Cannot delete occupied unit"
                                  : "Delete unit"
                              }
                            >
                              {deletingId === unit.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUnit ? "Edit Unit" : "Add Unit"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedProperty && (
              <p className="mt-1 text-sm text-gray-500">
                {selectedProperty.title}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {/* Unit Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.unitNumber}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unitNumber: e.target.value }))
                  }
                  className="input mt-1"
                  placeholder="e.g. A1, 2B, Studio 1"
                  required
                />
              </div>

              {/* Unit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Unit Type
                </label>
                <select
                  value={form.unitType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, unitType: e.target.value }))
                  }
                  className="input mt-1"
                >
                  <option value="">Select type...</option>
                  {UNIT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bedrooms & Bathrooms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, bedrooms: e.target.value }))
                    }
                    className="input mt-1"
                    min={0}
                    max={20}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        bathrooms: e.target.value,
                      }))
                    }
                    className="input mt-1"
                    min={0}
                    max={20}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Rent & Deposit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rent (UGX/month)
                  </label>
                  <input
                    type="number"
                    value={form.rent}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, rent: e.target.value }))
                    }
                    className="input mt-1"
                    min={0}
                    placeholder={
                      selectedProperty
                        ? `Default: ${selectedProperty.rent}`
                        : "0"
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to use property default rent
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deposit (UGX)
                  </label>
                  <input
                    type="number"
                    value={form.deposit}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, deposit: e.target.value }))
                    }
                    className="input mt-1"
                    min={0}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="input mt-1"
                  rows={2}
                  placeholder="Optional notes about this unit..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.unitNumber.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {editingUnit ? "Save Changes" : "Create Unit"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
