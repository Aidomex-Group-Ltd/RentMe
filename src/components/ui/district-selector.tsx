"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { MapPin, Search, X } from "lucide-react";
import {
  allUgandanDistricts,
  districtsByRegion,
  getRegionByDistrict,
  searchDistricts,
  ugandanRegions,
  type Region,
} from "@/lib/uganda-districts";

interface DistrictSelectorProps {
  value: string;
  onChange: (district: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  id?: string;
}

export default function DistrictSelector({
  value,
  onChange,
  placeholder = "Search districts...",
  label,
  className = "",
  id,
}: DistrictSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState<Region | "">("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredDistricts = useMemo(() => {
    let results = query ? searchDistricts(query) : allUgandanDistricts;
    if (activeRegion) {
      results = results.filter(
        (d) => getRegionByDistrict(d) === activeRegion
      );
    }
    return results;
  }, [query, activeRegion]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={open ? query : value}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input pl-10 pr-8"
        />
        {value && !open && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {/* Region filter chips */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-3 py-2">
            <button
              type="button"
              onClick={() => setActiveRegion("")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                activeRegion === ""
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {ugandanRegions.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() =>
                  setActiveRegion(activeRegion === region ? "" : region)
                }
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeRegion === region
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* District list */}
          <div className="overflow-y-auto max-h-60 p-1">
            {filteredDistricts.length > 0 ? (
              filteredDistricts.map((district) => {
                const region = getRegionByDistrict(district);
                return (
                  <button
                    key={district}
                    type="button"
                    onClick={() => {
                      onChange(district);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      value === district
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{district}</span>
                    <span className="text-xs text-gray-400">{region}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                No districts found
              </div>
            )}
          </div>

          {/* Count */}
          <div className="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400">
            {filteredDistricts.length} of {allUgandanDistricts.length} districts
          </div>
        </div>
      )}
    </div>
  );
}
