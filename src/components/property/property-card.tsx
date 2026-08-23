"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Heart, MapPin, BedDouble, Bath, Maximize, Eye, ShieldCheck, AlertTriangle, FileText } from "lucide-react";
import { cn, formatUGX, truncate } from "@/lib/utils";

interface PropertyCardProps {
  property: {
    id: string;
    slug: string;
    title: string;
    rent: number;
    deposit?: number | null;
    paymentFrequency: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    district?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    viewCount: number;
    saveCount: number;
    isVerified: boolean;
    isFlagged?: boolean;
    listedAt: string;
    images: { url: string; alt?: string | null }[];
    user: {
      id?: string;
      name: string;
      avatar?: string | null;
      landlord?: { verificationStatus?: string } | null;
      agent?: { verificationStatus?: string } | null;
    };
  };
  onSave?: (id: string) => void;
  isSaved?: boolean;
}

const propertyTypeLabels: Record<string, string> = {
  single_room: "Single Room",
  room_self_contained: "Room & Self-Contained",
  studio: "Studio",
  bedsitter: "Bedsitter",
  "1_bedroom": "1 Bedroom",
  "2_bedroom": "2 Bedroom",
  "3_bedroom": "3 Bedroom",
  "4_plus_bedroom": "4+ Bedroom",
  apartment: "Apartment",
  flat: "Flat",
  house: "House",
  villa: "Villa",
  townhouse: "Townhouse",
  duplex: "Duplex",
  hostel: "Hostel",
};

export default function PropertyCard({ property, onSave, isSaved }: PropertyCardProps) {
  const [saved, setSaved] = useState(isSaved || false);
  const [imageError, setImageError] = useState(false);
  const { data: session } = useSession();

  // Guests authenticate contextually at apply-time and are returned to
  // this listing; signed-in users go straight to the listing's apply flow.
  const applyHref = session?.user
    ? `/properties/${property.slug}`
    : `/login?callbackUrl=${encodeURIComponent(`/properties/${property.slug}`)}&intent=apply`;

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(!saved);
    onSave?.(property.id);
  };

  const location = [property.neighborhood, property.district || property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <Link href={`/properties/${property.slug}`} className="property-card group block">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {property.images?.[0]?.url && !imageError ? (
          <img
            src={property.images[0].url}
            alt={property.images[0].alt || property.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <span className="text-4xl">🏠</span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          className={cn(
            "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-all",
            saved
              ? "bg-red-500 text-white shadow-lg"
              : "bg-white/90 text-gray-600 shadow backdrop-blur-sm hover:bg-white hover:text-red-500"
          )}
          aria-label={saved ? "Unsave property" : "Save property"}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>

        {/* Verification badge */}
        {property.isVerified && !property.isFlagged && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white shadow">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </div>
        )}
        {property.isFlagged && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-xs font-medium text-white shadow">
            <AlertTriangle className="h-3 w-3" />
            Scam alert
          </div>
        )}

        {/* Property type badge */}
        <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {propertyTypeLabels[property.propertyType] || property.propertyType}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600 line-clamp-1">
            {property.title}
          </h3>
        </div>

        <div className="mb-3 flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{location || "Uganda"}</span>
        </div>

        <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-4 w-4" />
              {property.bedrooms} {property.bedrooms === 1 ? "Bed" : "Beds"}
            </span>
          )}
          {property.bathrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {property.bathrooms} {property.bathrooms === 1 ? "Bath" : "Baths"}
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-400">
            <Eye className="h-3.5 w-3.5" />
            {property.viewCount}
          </span>
        </div>

        <div className="flex items-end justify-between border-t border-gray-100 pt-3">
          <div>
            <span className="text-xl font-bold text-brand-600">
              {formatUGX(property.rent)}
            </span>
            <span className="text-sm text-gray-500">
              /{property.paymentFrequency?.toLowerCase() === "monthly"
                ? "month"
                : property.paymentFrequency?.toLowerCase()}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            {property.user.name}
          </p>
        </div>

        {/* Guest-friendly actions: View works for everyone; Apply requests
            identity only at the moment of application (context preserved
            via callbackUrl so the visitor returns to this listing). */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors group-hover:border-brand-200 group-hover:text-brand-600">
            <Eye className="h-4 w-4" />
            View Property
          </span>
          <Link
            href={applyHref}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            <FileText className="h-4 w-4" />
            Apply Now
          </Link>
        </div>
      </div>
    </Link>
  );
}
