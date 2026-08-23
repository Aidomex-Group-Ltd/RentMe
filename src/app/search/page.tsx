"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, Grid3X3, Map, Loader2, AlertCircle } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import PropertyCard from "@/components/property/property-card";
import { PROPERTY_TYPES } from "@/lib/utils";
import DistrictSelector from "@/components/ui/district-selector";
import { ugandanRegions, type Region } from "@/lib/uganda-districts";

const PAGE_SIZE = 20;

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
  const router = useRouter();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
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
  const [region, setRegion] = useState(searchParams.get("region") || "");

  const fetchProperties = useCallback(async (targetPage: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (propertyType) params.set("type", propertyType);
      if (minRent) params.set("minRent", minRent);
      if (maxRent) params.set("maxRent", maxRent);
      if (bedrooms) params.set("bedrooms", bedrooms);
      if (district) params.set("district", district);
      if (region) params.set("region", region);
      if (sort) params.set("sort", sort);
      if (furnished) params.set("furnished", furnished);
      if (parking) params.set("parking", parking);
      if (security) params.set("security", security);
      params.set("page", String(targetPage));
      params.set("limit", String(PAGE_SIZE));
      params.set("status", "ACTIVE");

      const res = await fetch(`/api/public/properties?${params.toString()}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      const newProperties = data.properties || [];
      const totalResults = data.pagination?.total || 0;

      // Keep the URL shareable/bookmarkable: mirror active filters into
      // query params without triggering a navigation or scroll reset.
      const urlParams = new URLSearchParams(params);
      urlParams.delete("page");
      urlParams.delete("limit");
      urlParams.delete("status");
      const qs = urlParams.toString();
      window.history.replaceState(null, "", qs ? `/search?${qs}` : "/search");

      if (append) {
        setProperties((prev) => [...prev, ...newProperties]);
      } else {
        setProperties(newProperties);
      }
      setTotal(totalResults);
      setHasMore(targetPage * PAGE_SIZE < totalResults);
    } catch (err) {
      console.error("Search error:", err);
      setError("We couldn't load properties right now. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [q, propertyType, minRent, maxRent, bedrooms, district, region, sort, furnished, parking, security]);

  // Reset and fetch page 1 when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchProperties(1, false);
  }, [fetchProperties]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchProperties(nextPage, true);
        }
      },
      { rootMargin: "200px" } // Start loading 200px before sentinel is visible
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, loadingMore, fetchProperties]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter change triggers useEffect above
  };

  const clearFilters = () => {
    setQ("");
    setPropertyType("");
    setMinRent("");
    setMaxRent("");
    setBedrooms("");
    setDistrict("");
    setRegion("");
    setSort("newest");
    setFurnished("");
    setParking("");
    setSecurity("");
  };

  const activeFilters = [q, propertyType, minRent, maxRent, bedrooms, district, region, furnished, parking, security].filter(Boolean).length;

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
                  className="input pl-10"
                />
              </div>
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search Properties</span>
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
                    <DistrictSelector
                      value={district}
                      onChange={setDistrict}
                      label="District"
                      id="filter-district"
                      placeholder="All districts"
                    />

                    {/* Region */}
                    <div>
                      <label className="label">Region</label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="input"
                      >
                        <option value="">All Regions</option>
                        {ugandanRegions.map((r) => (
                          <option key={r} value={r}>{r}</option>
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
              ) : error ? (
                <div className="card p-12 text-center">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-300" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Something went wrong
                  </h3>
                  <p className="mt-1 text-gray-500">{error}</p>
                  <button onClick={() => fetchProperties(1, false)} className="btn-primary mt-4">
                    Retry
                  </button>
                </div>
              ) : properties.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {properties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>

                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="py-8" />

                  {/* Loading more indicator */}
                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                      <span className="text-sm text-gray-500">Loading more properties…</span>
                    </div>
                  )}

                  {/* End of results */}
                  {!hasMore && properties.length > 0 && (
                    <p className="py-6 text-center text-sm text-gray-400">
                      You&apos;ve seen all {total} properties
                    </p>
                  )}
                </>
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
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
