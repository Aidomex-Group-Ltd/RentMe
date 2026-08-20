"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, Grid3X3, Map } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import PropertyCard from "@/components/property/property-card";
import { PROPERTY_TYPES, UGANDA_DISTRICTS } from "@/lib/utils";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageFallback() {
  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="border-b border-gray-200 bg-white">
          <div className="page-container py-4">
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="page-container py-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-[4/3] w-full" />
                <div className="space-y-3 p-4">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-8 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"grid" | "map">("grid");

  // Filter state
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [propertyType, setPropertyType] = useState(searchParams.get("type") || "");
  const [minRent, setMinRent] = useState(searchParams.get("minRent") || "");
  const [maxRent, setMaxRent] = useState(searchParams.get("maxRent") || "");
  const [bedrooms, setBedrooms] = useState(searchParams.get("bedrooms") || "");
  const [district, setDistrict] = useState(searchParams.get("district") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [furnished, setFurnished] = useState(searchParams.get("furnished") || "");
  const [parking, setParking] = useState(searchParams.get("parking") || "");
  const [security, setSecurity] = useState(searchParams.get("security") || "");

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (propertyType) params.set("type", propertyType);
      if (minRent) params.set("minRent", minRent);
      if (maxRent) params.set("maxRent", maxRent);
      if (bedrooms) params.set("bedrooms", bedrooms);
      if (district) params.set("district", district);
      if (sort) params.set("sort", sort);
      if (furnished) params.set("furnished", furnished);
      if (parking) params.set("parking", parking);
      if (security) params.set("security", security);
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("status", "ACTIVE");

      const res = await fetch(`/api/properties?${params.toString()}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [q, propertyType, minRent, maxRent, bedrooms, district, sort, furnished, parking, security, page]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProperties();
  };

  const clearFilters = () => {
    setQ("");
    setPropertyType("");
    setMinRent("");
    setMaxRent("");
    setBedrooms("");
    setDistrict("");
    setSort("newest");
    setFurnished("");
    setParking("");
    setSecurity("");
    setPage(1);
  };

  const activeFilters = [q, propertyType, minRent, maxRent, bedrooms, district, furnished, parking, security].filter(Boolean).length;

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        {/* Search header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="page-container py-4">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by location, property name..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  list="search-districts"
                  className="input pl-10"
                />
                <datalist id="search-districts">
                  {UGANDA_DISTRICTS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <button type="submit" className="btn-primary">
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary relative ${showFilters ? "bg-brand-50 border-brand-200" : ""}`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilters > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                    {activeFilters}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="page-container py-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Filters sidebar */}
            {showFilters && (
              <div className="w-full shrink-0 lg:w-72">
                <div className="card sticky top-24 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    {activeFilters > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Property Type */}
                    <div>
                      <label className="label">Property Type</label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="input"
                      >
                        <option value="">All Types</option>
                        {PROPERTY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* District */}
                    <div>
                      <label className="label">District</label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="input"
                      >
                        <option value="">All Districts</option>
                        {UGANDA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Price Range */}
                    <div>
                      <label className="label">Rent Range (UGX)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={minRent}
                          onChange={(e) => setMinRent(e.target.value)}
                          className="input"
                          min="0"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxRent}
                          onChange={(e) => setMaxRent(e.target.value)}
                          className="input"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Bedrooms */}
                    <div>
                      <label className="label">Bedrooms</label>
                      <select
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="input"
                      >
                        <option value="">Any</option>
                        <option value="0">Studio</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4+</option>
                      </select>
                    </div>

                    {/* Amenities */}
                    <div>
                      <label className="label">Amenities</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={furnished === "true"}
                            onChange={(e) => setFurnished(e.target.checked ? "true" : "")}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          Furnished
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={parking === "true"}
                            onChange={(e) => setParking(e.target.checked ? "true" : "")}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          Parking
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={security === "true"}
                            onChange={(e) => setSecurity(e.target.checked ? "true" : "")}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          />
                          Security
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            <div className="flex-1">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {loading ? "Searching..." : `${total} properties found`}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                    className="input w-auto py-1.5 text-sm"
                  >
                    <option value="newest">Newest</option>
                    <option value="price_low">Lowest Price</option>
                    <option value="price_high">Highest Price</option>
                    <option value="most_viewed">Most Viewed</option>
                  </select>
                  <div className="hidden rounded-lg border border-gray-200 sm:flex">
                    <button
                      onClick={() => setView("grid")}
                      className={`p-2 ${view === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setView("map")}
                      className={`p-2 ${view === "map" ? "bg-gray-100 text-gray-900" : "text-gray-400"}`}
                    >
                      <Map className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="card overflow-hidden">
                      <div className="skeleton aspect-[4/3] w-full" />
                      <div className="p-4 space-y-3">
                        <div className="skeleton h-5 w-3/4" />
                        <div className="skeleton h-4 w-1/2" />
                        <div className="skeleton h-8 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : properties.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <MapPin className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    No houses found
                  </h3>
                  <p className="mt-1 text-gray-500">
                    We couldn&apos;t find houses matching those filters. Try adjusting your search.
                  </p>
                  <button onClick={clearFilters} className="btn-secondary mt-4">
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Pagination */}
              {total > 20 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-sm"
                  >
                    Previous
                  </button>
                  <span className="px-4 text-sm text-gray-600">
                    Page {page} of {Math.ceil(total / 20)}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(total / 20)}
                    className="btn-secondary text-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
