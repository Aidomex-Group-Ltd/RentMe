"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Home, DollarSign } from "lucide-react";
import { PROPERTY_TYPES } from "@/lib/utils";
import { allUgandanDistricts } from "@/lib/uganda-districts";

export default function SearchBar({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("q", location);
    if (propertyType) params.set("type", propertyType);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (bedrooms) params.set("bedrooms", bedrooms);
    router.push(`/search?${params.toString()}`);
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Where?"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            list="districts-compact"
            className="input pl-10"
          />
          <datalist id="districts-compact">            {allUgandanDistricts.map((d) => (
            <option key={d} value={d} />
          ))}
          </datalist>
        </div>
        <button type="submit" className="btn-primary">
          <Search className="h-4 w-4" />
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className="w-full rounded-2xl bg-white p-3 shadow-xl sm:p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Location */}
        <div className="relative lg:col-span-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Where do you want to live?"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            list="districts"
            className="input pl-10"
          />
          <datalist id="districts">            {allUgandanDistricts.map((d) => (
            <option key={d} value={d} />
          ))}
          </datalist>
        </div>

        {/* Property Type */}
        <div className="relative">
          <Home className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="input appearance-none pl-10 pr-8"
          >
            <option value="">Property Type</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Min Rent */}
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            placeholder="Min UGX"
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
            className="input pl-10"
            min="0"
            step="50000"
          />
        </div>

        {/* Max Rent */}
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            placeholder="Max UGX"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            className="input pl-10"
            min="0"
            step="50000"
          />
        </div>

        {/* Bedrooms */}
        <select
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="input"
        >
          <option value="">Bedrooms</option>
          <option value="0">Studio</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4+</option>
        </select>
      </div>

      <button type="submit" className="btn-primary mt-3 w-full sm:mt-4 sm:w-auto">
        <Search className="mr-2 h-4 w-4" />
        Search Properties
      </button>
    </form>
  );
}
