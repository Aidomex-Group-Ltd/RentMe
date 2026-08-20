"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Home,
  MapPin,
  CheckCircle,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import SearchBar from "@/components/property/search-bar";
import PropertyCard from "@/components/property/property-card";
import PropertyCarousel, {
  type CarouselProperty,
} from "@/components/property/property-carousel";
import { cn } from "@/lib/utils";

const popularLocations = [
  { name: "Kampala", slug: "Kampala", description: "Find homes in the capital" },
  { name: "Kololo", slug: "Kololo", description: "Premium hilltop living" },
  { name: "Ntinda", slug: "Ntinda", description: "Modern apartments & houses" },
  { name: "Naguru", slug: "Naguru", description: "Quiet residential area" },
  { name: "Bugolobi", slug: "Bugolobi", description: "Convenient city living" },
  { name: "Entebbe", slug: "Entebbe", description: "Live near Lake Victoria" },
  { name: "Jinja", slug: "Jinja", description: "Discover properties in Jinja" },
  { name: "Muyenga", slug: "Muyenga", description: "Scenic hillside homes" },
];

const propertyTypeChips = [
  { value: "", label: "All" },
  { value: "apartment", label: "Apartments" },
  { value: "house", label: "Houses" },
  { value: "single_room", label: "Rooms" },
  { value: "studio", label: "Studios" },
  { value: "bedsitter", label: "Bedsitters" },
  { value: "1_bedroom", label: "1 Bedroom" },
  { value: "2_bedroom", label: "2 Bedroom" },
  { value: "3_bedroom", label: "3+ Bedroom" },
];

const steps = [
  {
    step: "1",
    title: "Search",
    description:
      "Browse thousands of properties across Uganda with advanced filters.",
  },
  {
    step: "2",
    title: "Connect",
    description:
      "Message landlords directly and schedule viewings at your convenience.",
  },
  {
    step: "3",
    title: "Move In",
    description:
      "Submit your application, get approved, and move into your new home.",
  },
];

/** Demo showcase listings when the API has no active properties yet */
const FALLBACK_PROPERTIES: CarouselProperty[] = [
  {
    id: "demo-1",
    slug: "luxury-villa-kololo",
    title: "Luxury Villa Kololo",
    rent: 8500000,
    bedrooms: 5,
    bathrooms: 4,
    neighborhood: "Kololo",
    district: "Kampala",
    propertyType: "villa",
    isVerified: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
        alt: "Luxury villa",
      },
    ],
  },
  {
    id: "demo-2",
    slug: "modern-apt-naguru",
    title: "Modern Apt Naguru",
    rent: 3200000,
    bedrooms: 3,
    bathrooms: 2,
    neighborhood: "Naguru",
    district: "Kampala",
    propertyType: "apartment",
    isVerified: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
        alt: "Modern apartment",
      },
    ],
  },
  {
    id: "demo-3",
    slug: "entebbe-waterfront",
    title: "Entebbe Waterfront",
    rent: 12000000,
    bedrooms: 6,
    bathrooms: 5,
    neighborhood: "Lake shore",
    district: "Entebbe",
    propertyType: "villa",
    isVerified: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
        alt: "Waterfront home",
      },
    ],
  },
  {
    id: "demo-4",
    slug: "jinja-riverside",
    title: "Jinja Riverside",
    rent: 4700000,
    bedrooms: 4,
    bathrooms: 3,
    neighborhood: "Nile view",
    district: "Jinja",
    propertyType: "house",
    isVerified: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
        alt: "Riverside house",
      },
    ],
  },
  {
    id: "demo-5",
    slug: "muyenga-penthouse",
    title: "Muyenga Penthouse",
    rent: 6800000,
    bedrooms: 4,
    bathrooms: 3,
    neighborhood: "Muyenga",
    district: "Kampala",
    propertyType: "apartment",
    isVerified: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
        alt: "Penthouse",
      },
    ],
  },
  {
    id: "demo-6",
    slug: "bugolobi-duplex",
    title: "Bugolobi Duplex",
    rent: 5300000,
    bedrooms: 5,
    bathrooms: 4,
    neighborhood: "Bugolobi",
    district: "Kampala",
    propertyType: "duplex",
    isVerified: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cd40?w=800&q=80",
        alt: "Duplex",
      },
    ],
  },
];

interface ListedProperty extends CarouselProperty {
  deposit?: number | null;
  paymentFrequency: string;
  propertyType: string;
  isVerified: boolean;
  viewCount: number;
  saveCount: number;
  listedAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    landlord?: { verificationStatus?: string } | null;
    agent?: { verificationStatus?: string } | null;
  };
}

export default function HomePage() {
  const [featuredProperties, setFeaturedProperties] = useState<ListedProperty[]>(
    []
  );
  const [newestProperties, setNewestProperties] = useState<ListedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("");

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      try {
        const typeParam = activeType ? `&type=${activeType}` : "";
        const [featured, newest] = await Promise.all([
          fetch(
            `/api/properties?limit=10&sort=most_viewed&status=ACTIVE${typeParam}`
          ).then((r) => r.json()),
          fetch(
            `/api/properties?limit=6&sort=newest&status=ACTIVE${typeParam}`
          ).then((r) => r.json()),
        ]);
        setFeaturedProperties(featured.properties || []);
        setNewestProperties(newest.properties || []);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, [activeType]);

  const carouselProperties: CarouselProperty[] =
    featuredProperties.length > 0 ? featuredProperties : FALLBACK_PROPERTIES;

  return (
    <MainLayout>
      {/* Mobile-first premium showcase */}
      <section className="bg-[#f4f6fa] pb-8 pt-5 md:pt-8">
        <div className="mb-4 px-5 text-center md:mb-6">
          <p className="text-sm font-medium text-[#385a4b]">
            Property showcase
          </p>
          <h1 className="mt-1 bg-gradient-to-br from-[#1a4d42] to-[#2f8b76] bg-clip-text text-2xl font-bold tracking-tight text-transparent font-display sm:text-3xl">
            Browse homes across Uganda
          </h1>
          <p className="mt-1.5 text-sm text-[#5b6f7a]">
            Swipe, tap, or let listings rotate — key details at a glance
          </p>
        </div>

        <div className="px-3 md:px-4">
          {loading ? (
            <div className="mx-auto max-w-[500px] overflow-hidden rounded-[36px] bg-white p-1 pb-4 shadow-lg">
              <div className="skeleton aspect-[1.2/1] w-full rounded-[28px]" />
              <div className="space-y-3 px-3 pt-4">
                <div className="skeleton h-6 w-3/4" />
                <div className="skeleton h-8 w-1/2 rounded-full" />
                <div className="skeleton h-10 w-full" />
              </div>
            </div>
          ) : (
            <PropertyCarousel properties={carouselProperties} />
          )}
        </div>

        <div className="mt-2.5 flex justify-center">
          <span className="inline-flex items-center rounded-full bg-white/40 px-6 py-1.5 text-xs tracking-wide text-[#6b808e] backdrop-blur-sm">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            verified listings · 300+ properties
          </span>
        </div>
      </section>

      {/* Search hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76]">
        <div className="page-container relative py-12 sm:py-14 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl font-display">
              Find a place you&apos;ll love to call home
            </h2>
            <p className="mb-8 text-base text-white/80 sm:text-lg">
              Discover rental houses, apartments, and rooms across Kampala,
              Entebbe, Jinja, and all of Uganda.
            </p>
          </div>

          <SearchBar />

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {popularLocations.slice(0, 6).map((loc) => (
              <Link
                key={loc.name}
                href={`/search?district=${loc.name}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <MapPin className="h-3 w-3" />
                {loc.name}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-5 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Verified Listings
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Secure Messaging
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Direct Contact
            </span>
          </div>
        </div>
      </section>

      {/* Property Type Filter Chips */}
      <section className="border-b border-gray-100 bg-white py-4">
        <div className="page-container">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {propertyTypeChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setActiveType(chip.value)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
                  activeType === chip.value
                    ? "bg-[#1f6d5e] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured grid (desktop / secondary) */}
      <section className="section">
        <div className="page-container">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
                Featured Properties
              </h2>
              <p className="mt-1 text-gray-500">
                Most viewed properties this week
              </p>
            </div>
            <Link
              href="/search"
              className="hidden items-center gap-1 text-sm font-semibold text-[#1f6d5e] hover:text-[#1a4d42] sm:flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
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
          ) : featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProperties.slice(0, 6).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Home className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900">
                No properties yet
              </h3>
              <p className="mt-1 text-gray-500">
                Be the first to list a property on RentMe. Showcase above uses
                sample listings until yours go live.
              </p>
              <Link href="/register" className="btn-primary mt-4">
                List Your Property
              </Link>
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/search"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1f6d5e]"
            >
              View all properties
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Explore by Location */}
      <section className="section bg-[#f4f6fa]">
        <div className="page-container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
              Explore by Location
            </h2>
            <p className="mt-1 text-gray-500">
              Discover properties in Uganda&apos;s most popular areas
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {popularLocations.map((loc) => (
              <Link
                key={loc.name}
                href={`/search?district=${loc.slug}`}
                className="group rounded-2xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#2a7f6e]">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-[#1f6d5e]">
                  {loc.name}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">{loc.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newly Listed */}
      {newestProperties.length > 0 && (
        <section className="section">
          <div className="page-container">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
                  Newly Listed
                </h2>
                <p className="mt-1 text-gray-500">
                  Fresh properties just added to RentMe
                </p>
              </div>
              <Link
                href="/search?sort=newest"
                className="hidden items-center gap-1 text-sm font-semibold text-[#1f6d5e] hover:text-[#1a4d42] sm:flex"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newestProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="section bg-[#f4f6fa]">
        <div className="page-container">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
              How RentMe Works
            </h2>
            <p className="mt-1 text-gray-500">
              Find your next home in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1f6d5e] text-xl font-bold text-white">
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {s.title}
                </h3>
                <p className="text-gray-500">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#1a4d42]">
        <div className="page-container text-center">
          <h2 className="mb-4 text-3xl font-bold text-white font-display sm:text-4xl">
            Are you a landlord or agent?
          </h2>
          <p className="mb-8 text-lg text-white/80">
            List your properties on RentMe and reach thousands of potential
            tenants across Uganda.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#1a4d42] shadow-sm transition-all hover:bg-gray-50"
            >
              List Your Property
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
