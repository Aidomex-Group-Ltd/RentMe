"use client";

import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";

const LOCATIONS = [
  // Kampala
  {
    name: "Kololo",
    slug: "Kololo",
    district: "Kampala",
    region: "Central",
    description: "Premium hilltop neighborhood",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80&auto=format",
    count: 45,
  },
  {
    name: "Ntinda",
    slug: "Ntinda",
    district: "Kampala",
    region: "Central",
    description: "Central and convenient",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80&auto=format",
    count: 52,
  },
  // Wakiso
  {
    name: "Lubowa",
    slug: "Lubowa",
    district: "Wakiso",
    region: "Central",
    description: "Suburban family homes",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=80&auto=format",
    count: 35,
  },
  // Entebbe
  {
    name: "Entebbe",
    slug: "Entebbe",
    district: "Entebbe",
    region: "Central",
    description: "Lakeside living near the airport",
    image: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=400&q=80&auto=format",
    count: 28,
  },
  // Jinja
  {
    name: "Jinja",
    slug: "Jinja",
    district: "Jinja",
    region: "Eastern",
    description: "Adventure capital of Uganda",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80&auto=format",
    count: 33,
  },
  // Mbarara
  {
    name: "Mbarara",
    slug: "Mbarara",
    district: "Mbarara",
    region: "Western",
    description: "Gateway to western Uganda",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&q=80&auto=format",
    count: 22,
  },
  // Gulu
  {
    name: "Gulu",
    slug: "Gulu",
    district: "Gulu",
    region: "Northern",
    description: "Northern Uganda's hub",
    image: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=400&q=80&auto=format",
    count: 18,
  },
  // Mukono
  {
    name: "Mukono",
    slug: "Mukono",
    district: "Mukono",
    region: "Central",
    description: "Growing lakeside town",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80&auto=format",
    count: 26,
  },
];

export default function KampalaLocations() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        {/* Section header */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
            <MapPin className="h-3.5 w-3.5" />
            Popular areas
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Explore locations across Uganda
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            From Kampala&apos;s hills to lakeside towns — find your ideal location.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {LOCATIONS.map((loc) => (
            <Link
              key={loc.slug}
              href={`/search?district=${loc.district}&q=${loc.name}`}
              className="group relative overflow-hidden rounded-2xl bg-slate-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={loc.image}
                  alt={`${loc.name}, ${loc.district}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </div>

              {/* Info overlay */}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-lg font-bold text-white">{loc.name}</h3>
                <p className="text-sm text-white/70">{loc.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/60">
                    {loc.count} listings
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
