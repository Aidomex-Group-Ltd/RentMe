"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Maximize2,
  Phone,
  RefreshCw,
  Tag,
} from "lucide-react";
import { cn, formatUGX } from "@/lib/utils";

export interface CarouselProperty {
  id: string;
  slug: string;
  title: string;
  rent: number;
  paymentFrequency?: string;
  bedrooms: number;
  bathrooms: number;
  district?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  propertyType?: string;
  isVerified?: boolean;
  images: { url: string; alt?: string | null }[];
}

interface PropertyCarouselProps {
  properties: CarouselProperty[];
  className?: string;
}

const propertyTypeLabels: Record<string, string> = {
  single_room: "For Rent",
  room_self_contained: "For Rent",
  studio: "For Rent",
  bedsitter: "For Rent",
  "1_bedroom": "For Rent",
  "2_bedroom": "For Rent",
  "3_bedroom": "For Rent",
  "4_plus_bedroom": "For Rent",
  apartment: "For Rent",
  flat: "For Rent",
  house: "For Rent",
  villa: "For Sale",
  townhouse: "For Rent",
  duplex: "For Rent",
  hostel: "For Rent",
};

function locationLabel(property: CarouselProperty): string {
  return (
    [property.neighborhood, property.district || property.city]
      .filter(Boolean)
      .join(", ") || "Uganda"
  );
}

export default function PropertyCarousel({
  properties,
  className,
}: PropertyCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const total = properties.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (total <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 4800);
  }, [clearTimer, total]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [properties]);

  const goTo = (index: number) => {
    if (total === 0) return;
    const next = ((index % total) + total) % total;
    setCurrentIndex(next);
    startTimer();
  };

  const next = () => goTo(currentIndex + 1);
  const prev = () => goTo(currentIndex - 1);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
    clearTimer();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    } else {
      startTimer();
    }
  };

  if (total === 0) return null;

  return (
    <div className={cn("w-full max-w-[500px] mx-auto", className)}>
      <div
        className="overflow-hidden rounded-[36px] bg-white p-1 pb-4 shadow-[0_20px_40px_-12px_rgba(0,30,30,0.15),0_4px_18px_rgba(0,0,0,0.02)] transition-shadow duration-300 hover:shadow-[0_24px_48px_-12px_rgba(0,40,30,0.2)]"
        onMouseEnter={clearTimer}
        onMouseLeave={startTimer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex gap-1 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {properties.map((property) => {
            const imageUrl = property.images?.[0]?.url;
            const hasError = imageErrors[property.id];
            const badge =
              propertyTypeLabels[property.propertyType || ""] || "For Rent";

            return (
              <article
                key={property.id}
                className="w-full shrink-0 overflow-hidden rounded-[32px] bg-white p-1"
              >
                <div className="relative aspect-[1.2/1] overflow-hidden rounded-[28px] bg-[#d9e2e9]">
                  {imageUrl && !hasError ? (
                    <img
                      src={imageUrl}
                      alt={property.images[0]?.alt || property.title}
                      className="h-full w-full object-cover transition-transform duration-400 active:scale-[1.01]"
                      loading="lazy"
                      onError={() =>
                        setImageErrors((prev) => ({
                          ...prev,
                          [property.id]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e3f0ed] to-[#d9e2e9]">
                      <MapPin className="h-12 w-12 text-[#2a7f6e]/40" />
                    </div>
                  )}
                  <span className="absolute left-4 top-4 flex items-center rounded-full border border-white/20 bg-black/55 px-4 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur-sm">
                    <Tag className="mr-1.5 h-3 w-3" />
                    {property.isVerified ? "Verified" : badge}
                  </span>
                </div>

                <div className="px-3 pb-1 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="truncate text-lg font-bold tracking-tight text-[#141b24]">
                      {property.title}
                    </h3>
                    <span className="shrink-0 rounded-full bg-[#e6f3f0] px-3.5 py-1 text-[15px] font-bold tracking-tight text-[#1f6d5e]">
                      {formatUGX(property.rent)}
                    </span>
                  </div>

                  <div className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f0f4f9] px-3 py-1.5 text-sm font-normal text-[#3a4e5e]">
                    <MapPin className="h-3.5 w-3.5 text-[#2a7f6e]" />
                    {locationLabel(property)}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2.5">
                    <div className="flex gap-4 text-[13px] font-medium text-[#314a5a]">
                      {property.bedrooms > 0 && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-4 w-4 text-[#487466]" />
                          {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms > 0 && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4 text-[#487466]" />
                          {property.bathrooms}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Maximize2 className="h-4 w-4 text-[#487466]" />
                        {property.propertyType?.replace(/_/g, " ") || "Home"}
                      </span>
                    </div>
                    <Link
                      href={
                        property.id.startsWith("demo-")
                          ? `/search?district=${encodeURIComponent(property.district || "Kampala")}`
                          : `/properties/${property.slug}`
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-[#1c3d33] px-5 py-2.5 text-sm font-semibold tracking-wide text-white shadow-[0_6px_14px_rgba(26,77,66,0.2)] transition-all active:scale-95 active:bg-[#0f2b23]"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Contact
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 px-2">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous property"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/70 text-[#1b3a30] shadow-[0_6px_14px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all active:scale-95 active:bg-[#e4edf2]"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="flex gap-2">
            {properties.map((property, i) => (
              <button
                key={property.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to property ${i + 1}`}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  i === currentIndex
                    ? "w-[30px] bg-[#1f6d5e] shadow-[0_0_0_2px_rgba(31,109,94,0.2)]"
                    : "w-2.5 bg-[#cbd8e2]"
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Next property"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/70 text-[#1b3a30] shadow-[0_6px_14px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all active:scale-95 active:bg-[#e4edf2]"
          >
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/50 px-3.5 py-1.5 text-xs font-medium text-[#385a4b] backdrop-blur-sm">
          <RefreshCw className="h-3.5 w-3.5 animate-pulse text-[#2a7f6e]" />
          rotating · premium
        </span>
        <span className="inline-flex items-center rounded-full bg-[#e7eef3] px-4 py-1 text-[13px] text-[#3e5f6b]">
          <MapPin className="mr-1.5 h-3.5 w-3.5" />
          Kampala · Entebbe · Jinja
        </span>
      </div>
    </div>
  );
}
