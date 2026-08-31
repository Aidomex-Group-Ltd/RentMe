"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  BedDouble,
  Bath,
  Pause,
  Play,
} from "lucide-react";
import { cn, formatUGX } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Hero Slide Data
   Real Unsplash images — all free-to-use under Unsplash license.
   ═══════════════════════════════════════════════════════════════ */

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  location: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  type: string;
  alt: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80&auto=format",
    title: "Modern Villa in Kololo",
    location: "Kololo, Kampala",
    rent: 3500000,
    bedrooms: 4,
    bathrooms: 3,
    type: "Villa",
    alt: "Modern villa with pool and garden in Kololo, Kampala",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80&auto=format",
    title: "Lakeside Villa in Entebbe",
    location: "Entebbe",
    rent: 3200000,
    bedrooms: 3,
    bathrooms: 2,
    type: "Villa",
    alt: "Lakeside villa with garden views in Entebbe, Uganda",
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1920&q=80&auto=format",
    title: "Furnished Flat in Ntinda",
    location: "Ntinda, Kampala",
    rent: 1800000,
    bedrooms: 2,
    bathrooms: 2,
    type: "Flat",
    alt: "Furnished flat in Ntinda, Kampala",
  },
  {
    id: "4",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80&auto=format",
    title: "Riverside Home in Jinja",
    location: "Jinja",
    rent: 2500000,
    bedrooms: 4,
    bathrooms: 3,
    type: "House",
    alt: "Riverside family home with garden in Jinja, Uganda",
  },
  {
    id: "5",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1920&q=80&auto=format",
    title: "Studio in Bukoto",
    location: "Bukoto, Kampala",
    rent: 800000,
    bedrooms: 1,
    bathrooms: 1,
    type: "Studio",
    alt: "Modern studio apartment in Bukoto, Kampala",
  },
  {
    id: "6",
    image: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1920&q=80&auto=format",
    title: "Modern Home in Mbarara",
    location: "Mbarara",
    rent: 1500000,
    bedrooms: 3,
    bathrooms: 2,
    type: "House",
    alt: "Modern family home in Mbarara, Uganda",
  },
];

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

interface HeroCarouselProps {
  className?: string;
}

export default function HeroCarousel({ className }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = HERO_SLIDES.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (total <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 5500);
  }, [clearTimer, total, isPaused]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  // Pause on hover/focus
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => setIsPaused(true);
    const handleMouseLeave = () => setIsPaused(false);
    const handleFocusIn = () => setIsPaused(true);
    const handleFocusOut = () => setIsPaused(false);

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("focusin", handleFocusIn);
    container.addEventListener("focusout", handleFocusOut);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("focusin", handleFocusIn);
      container.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const goTo = (index: number) => {
    const next = ((index % total) + total) % total;
    setCurrent(next);
  };

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === " ") {
      e.preventDefault();
      setIsPaused((p) => !p);
    }
  };

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setIsPaused(false);
  };

  // Preload adjacent images
  useEffect(() => {
    HERO_SLIDES.forEach((slide, i) => {
      if (Math.abs(i - current) <= 1) {
        const img = new window.Image();
        img.src = slide.image;
      }
    });
  }, [current]);

  const slide = HERO_SLIDES[current];

  return (
    <section
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-slate-900 text-white",
        className
      )}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured properties"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background images with crossfade */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out",
            i === current ? "opacity-100 z-[1]" : "opacity-0 z-0"
          )}
          style={{ backgroundImage: `url('${s.image}')` }}
          aria-hidden={i !== current}
        />
      ))}

      {/* Gradient overlay for text readability */}
      <div
        className="absolute inset-0 z-[2] bg-gradient-to-b from-slate-900/60 via-slate-900/30 to-slate-900/80"
        aria-hidden
      />

      {/* Kampala skyline subtle background */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[2] h-40 bg-no-repeat bg-bottom bg-contain opacity-30"
        style={{ backgroundImage: "url('/images/kampala-skyline.svg')" }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-12">
          {/* Text side */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            {/* Badge */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5 text-brand-400" />
              Uganda&apos;s trusted rental platform
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up delay-100 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find your place{" "}
              <span className="bg-gradient-to-r from-brand-300 to-accent-300 bg-clip-text text-transparent">
                in Uganda.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="animate-fade-in-up delay-200 mx-auto max-w-lg text-lg font-light text-slate-300 sm:text-xl lg:mx-0">
              Discover verified homes, manage tenancies and stay
              connected — from search to move-in.
            </p>

            {/* CTAs */}
            <div className="animate-fade-in-up delay-300 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/search"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all duration-200 hover:bg-brand-400 hover:shadow-brand-400/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                Explore properties
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:border-white/30 active:scale-[0.98]"
              >
                List a property
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="animate-fade-in-up delay-400 flex items-center gap-6 pt-2 text-sm text-slate-400 sm:justify-center lg:justify-start">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                1,200+ verified
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                5,000+ tenants
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                Free to browse
              </span>
            </div>
          </div>

          {/* Featured slide card */}
          <div className="animate-scale-in delay-200 w-full max-w-md lg:max-w-sm xl:max-w-md">
            <div className="glass-dark overflow-hidden rounded-3xl p-1.5 shadow-2xl">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-slate-800">
                {/* Image */}
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className={cn(
                    "h-full w-full object-cover transition-all duration-700",
                    imageLoaded[current] ? "opacity-100 scale-100" : "opacity-0 scale-105"
                  )}
                  loading={current === 0 ? "eager" : "lazy"}
                  onLoad={() =>
                    setImageLoaded((prev) => ({ ...prev, [current]: true }))
                  }
                />

                {/* Loading skeleton */}
                {!imageLoaded[current] && (
                  <div className="absolute inset-0 animate-pulse bg-slate-700" />
                )}

                {/* Property type badge */}
                <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {slide.type}
                </div>

                {/* Gradient bottom */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Card info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-base font-bold text-white">
                    {slide.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-brand-500/20 px-3 py-1 text-sm font-bold text-brand-300">
                    {formatUGX(slide.rent)}
                    <span className="text-xs font-normal text-slate-400">/mo</span>
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  {slide.location}
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4 text-brand-400" />
                    {slide.bedrooms} Bed
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4 text-brand-400" />
                    {slide.bathrooms} Bath
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls row */}
        <div className="relative z-10 mt-8 flex items-center justify-center gap-4 lg:justify-start">
          {/* Prev */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous property"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === current
                    ? "w-8 bg-brand-400 shadow-[0_0_8px_rgba(13,143,110,0.4)]"
                    : "w-2 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>

          {/* Next */}
          <button
            type="button"
            onClick={next}
            aria-label="Next property"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Pause / Play */}
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? "Resume auto-rotation" : "Pause auto-rotation"}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </section>
  );
}
