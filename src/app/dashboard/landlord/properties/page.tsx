"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Search,
  Plus,
  Eye,
  Heart,
  MapPin,
  DollarSign,
  BedDouble,
  Bath,
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  Filter,
  ChevronRight,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import LandlordSidebar from "@/components/landlord/landlord-sidebar";
import { formatUGX } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All Properties" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "DRAFT", label: "Draft" },
  { value: "INACTIVE", label: "Inactive" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  DRAFT: "bg-gray-100 text-gray-600",
  INACTIVE: "bg-red-100 text-red-800",
  RENTED: "bg-blue-100 text-blue-800",
};

type Property = {
  id: string;
  title: string;
  slug: string;
  rent: number;
  status: string;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  district: string | null;
  city: string | null;
  viewCount: number;
  saveCount: number;
  listedAt: string;
  images: { url: string; isCover: boolean }[];
  units?: {
    id: string;
    unitNumber: string;
    status: string;
    rent: number | null;
  }[];
  _count?: {
    tenancies: number;
    units: number;
    applications: number;
  };
};

type OccupancyInfo = {
  totalUnits: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
};

export default function LandlordPropertiesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchProperties();
  }, [authStatus, statusFilter, page]);

  async function fetchProperties() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mine: "1",
        page: String(page),
        limit: "20",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/properties?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  // Client-side search
  const filtered = properties.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  });

  // Compute occupancy for a property
  function getOccupancy(property: Property): OccupancyInfo {
    if (!property.units || property.units.length === 0) {
      // Single-unit property — check tenancy count
      const hasTenant = (property._count?.tenancies || 0) > 0;
      return {
        totalUnits: 1,
        occupied: hasTenant ? 1 : 0,
        available: hasTenant ? 0 : 1,
        reserved: 0,
        maintenance: 0,
      };
    }

    const units = property.units;
    return {
      totalUnits: units.length,
      occupied: units.filter((u) => u.status === "OCCUPIED").length,
      available: units.filter((u) => u.status === "AVAILABLE").length,
      reserved: units.filter((u) => u.status === "RESERVED").length,
      maintenance: units.filter((u) => u.status === "MAINTENANCE").length,
    };
  }

  // Portfolio summary
  const portfolioSummary = {
    totalProperties: total,
    totalUnits: filtered.reduce(
      (sum, p) => sum + getOccupancy(p).totalUnits,
      0
    ),
    occupied: filtered.reduce(
      (sum, p) => sum + getOccupancy(p).occupied,
      0
    ),
    available: filtered.reduce(
      (sum, p) => sum + getOccupancy(p).available,
      0
    ),
  };

  const occupancyRate =
    portfolioSummary.totalUnits > 0
      ? Math.round(
          (portfolioSummary.occupied / portfolioSummary.totalUnits) * 100
        )
      : 0;

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  My Properties
                </h1>
                <p className="mt-1 text-gray-500">
                  Manage your property portfolio and occupancy
                </p>
              </div>
              <Link href="/dashboard/landlord/create" className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Link>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <LandlordSidebar />
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Portfolio Summary */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-500">Properties</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {portfolioSummary.totalProperties}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <p className="text-sm text-gray-500">Total Units</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {portfolioSummary.totalUnits}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <p className="text-sm text-gray-500">Occupied</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {portfolioSummary.occupied}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-gray-500">Available</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {portfolioSummary.available}
              </p>
            </div>
            <div className="col-span-2 lg:col-span-1 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <p className="text-sm text-gray-500">Occupancy</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {occupancyRate}%
              </p>
              {portfolioSummary.totalUnits > 0 && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, district, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Properties List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl bg-gray-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <Home className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {search || statusFilter
                  ? "No properties match your filters"
                  : "No properties yet"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || statusFilter
                  ? "Try adjusting your filters."
                  : "Start by listing your first property."}
              </p>
              {!search && !statusFilter && (
                <Link
                  href="/dashboard/landlord/create"
                  className="btn-primary mt-4 inline-flex text-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  List Property
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((property) => {
                const occupancy = getOccupancy(property);
                const occupancyPct =
                  occupancy.totalUnits > 0
                    ? Math.round(
                        (occupancy.occupied / occupancy.totalUnits) * 100
                      )
                    : 0;
                const coverImage = property.images?.find(
                  (img) => img.isCover
                ) || property.images?.[0];

                return (
                  <div
                    key={property.id}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="relative h-48 sm:h-auto sm:w-48 shrink-0 bg-gray-100">
                        {coverImage ? (
                          <img
                            src={coverImage.url}
                            alt={property.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl">
                            🏠
                          </div>
                        )}
                        <span
                          className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[property.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {property.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/properties/${property.slug}`}
                              className="text-lg font-semibold text-gray-900 hover:text-brand-600"
                            >
                              {property.title}
                            </Link>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                              {property.district && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {property.district}
                                  {property.city
                                    ? `, ${property.city}`
                                    : ""}
                                </span>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <BedDouble className="h-3.5 w-3.5" />
                                {property.bedrooms} bed
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Bath className="h-3.5 w-3.5" />
                                {property.bathrooms} bath
                              </span>
                              <span>•</span>
                              <span className="font-medium text-gray-900">
                                {formatUGX(property.rent)}/mo
                              </span>
                            </div>

                            {/* Stats */}
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {property.viewCount} views
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {property.saveCount} saves
                              </span>
                              {property._count?.applications ? (
                                <span className="flex items-center gap-1 text-blue-500">
                                  {property._count.applications} application
                                  {property._count.applications !== 1
                                    ? "s"
                                    : ""}
                                </span>
                              ) : null}
                              <span>Listed {new Date(property.listedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Occupancy Widget */}
                          <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:min-w-[180px]">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Occupancy
                            </p>
                            {occupancy.totalUnits > 1 ? (
                              <>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-lg font-bold text-gray-900">
                                    {occupancy.occupied}/{occupancy.totalUnits}
                                  </span>
                                  <span
                                    className={`text-sm font-medium ${
                                      occupancyPct >= 80
                                        ? "text-green-600"
                                        : occupancyPct >= 50
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {occupancyPct}%
                                  </span>
                                </div>
                                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      occupancyPct >= 80
                                        ? "bg-green-500"
                                        : occupancyPct >= 50
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${occupancyPct}%` }}
                                  />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                                  {occupancy.available > 0 && (
                                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                                      {occupancy.available} avail
                                    </span>
                                  )}
                                  {occupancy.reserved > 0 && (
                                    <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
                                      {occupancy.reserved} reserved
                                    </span>
                                  )}
                                  {occupancy.maintenance > 0 && (
                                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">
                                      {occupancy.maintenance} maint
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="mt-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                    occupancy.occupied > 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {occupancy.occupied > 0
                                    ? "Occupied"
                                    : "Available"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Row */}
                        <div className="mt-4 flex items-center gap-2">
                          <Link
                            href={`/properties/${property.slug}`}
                            className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            View Listing
                          </Link>
                          <Link
                            href={`/dashboard/landlord/tenants`}
                            className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Tenants
                          </Link>
                          {property.status === "ACTIVE" && (
                            <Link
                              href={`/properties/${property.slug}`}
                              className="ml-auto flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                            >
                              Manage
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          )}
                          {property.status === "PENDING_REVIEW" && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-yellow-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Awaiting admin review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn-secondary px-3 py-1 text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn-secondary px-3 py-1 text-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
