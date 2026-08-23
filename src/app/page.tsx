"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Home,
  MapPin,
  CheckCircle,
  Building,
  Users,
  Award,
  Check,
  Search,
  DollarSign,
  Star,
  Clock,
  ChevronRight,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import SearchBar from "@/components/property/search-bar";
import PropertyCard from "@/components/property/property-card";
import PropertyCarousel, {
  type CarouselProperty,
} from "@/components/property/property-carousel";
import { cn, formatUGX } from "@/lib/utils";

// ─── Static Data ───────────────────────────────────────────

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

// ─── Main Page ─────────────────────────────────────────────

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
      {/* ═══════════════════════════════════════════════════════
          HERO SECTION — "Discover Your Perfect Home Across Uganda"
         ═══════════════════════════════════════════════════════ */}
      <section className="relative bg-gradient-to-br from-[#0f2b23] via-[#1a4d42] to-[#1f6d5e] text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(255,255,255,0.05),transparent_50%)]" />
        </div>

        {/* Gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2f8b76] via-[#48c9a8] to-[#2f8b76]" />

        <div className="page-container relative z-10 pt-16 pb-32 sm:pt-20 sm:pb-40 lg:pt-24 lg:pb-48">
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-emerald-300" />
              Uganda&apos;s Trusted Property Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display">
              Discover Your Perfect
              <br />
              <span className="bg-gradient-to-r from-[#48c9a8] to-[#6ee7c4] bg-clip-text text-transparent">
                Home Across Uganda
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-white/70 font-light leading-relaxed">
              Explore verified properties from Kampala to Entebbe, Jinja, and
              beyond. List, manage, and pay — all on one platform.
            </p>

            <div className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-center">
              <Link
                href="#featured"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-[#1a4d42] shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl active:scale-[0.98]"
              >
                Browse Featured Listings
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login?role=landlord"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                List Your Property
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Verified Listings
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Secure Payments
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Tenant Management
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                24/7 Support
              </span>
            </div>
          </div>
        </div>

        {/* ─── Floating Search Bar Card ─────────────────────── */}
        <div className="relative z-20 -mb-16 sm:-mb-20">
          <div className="page-container">
            <div className="mx-auto max-w-4xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
              <h3 className="text-center font-bold text-lg text-gray-900 mb-4 font-display">
                Start Your Search Now
              </h3>
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SHOWCASE & MANAGEMENT GRID
         ═══════════════════════════════════════════════════════ */}
      <section className="pt-24 sm:pt-28 pb-16 bg-white">
        <div className="page-container grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* ─── Left: Featured Properties ──────────────────── */}
          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
                  Featured Properties
                </h2>
                <p className="mt-1 text-gray-500">Most viewed this week</p>
              </div>
              <Link
                href="/search"
                className="hidden items-center gap-1 text-sm font-semibold text-[#1f6d5e] hover:text-[#1a4d42] sm:flex"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mobile carousel */}
            <div className="lg:hidden">
              {loading ? (
                <div className="mx-auto max-w-[500px] overflow-hidden rounded-[36px] bg-gray-50 p-1 pb-4 shadow-lg">
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

            {/* Desktop grid */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {loading
                ? [...Array(4)].map((_, i) => (
                    <div key={i} className="card overflow-hidden">
                      <div className="skeleton aspect-[4/3] w-full" />
                      <div className="space-y-3 p-4">
                        <div className="skeleton h-5 w-3/4" />
                        <div className="skeleton h-4 w-1/2" />
                        <div className="skeleton h-8 w-1/3" />
                      </div>
                    </div>
                  ))
                : carouselProperties.slice(0, 4).map((p) => (
                    <PropertyCard key={p.id} property={p as ListedProperty} />
                  ))}
            </div>

            <div className="mt-4 text-center lg:hidden">
              <Link
                href="/search"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#1f6d5e]"
              >
                View all properties
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* ─── Right: Solutions for Everyone ───────────────── */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
                Solutions for Everyone
              </h2>
              <p className="mt-1 text-gray-500">
                Whether you own or rent — we have you covered
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Landlord Card */}
              <div className="relative bg-gradient-to-br from-[#0f2b23] to-[#1a4d42] text-white p-6 rounded-2xl space-y-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
                <div className="relative z-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <Building className="h-6 w-6 text-emerald-300" />
                  </div>
                  <h4 className="font-bold text-lg">For Landlords</h4>
                  <p className="text-xs text-white/60 mt-1">
                    Manage your entire rental portfolio from one dashboard
                  </p>
                </div>
                <ul className="relative z-10 text-xs space-y-2.5 text-white/80">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    List & manage properties
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Track applications & tenants
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Manage leases & rent collection
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Handle maintenance requests
                  </li>
                </ul>
                <Link
                  href="/login?role=landlord"
                  className="relative z-10 block text-center py-2.5 bg-white text-[#1a4d42] text-xs font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Landlord Dashboard
                </Link>
              </div>

              {/* Tenant Card */}
              <div className="relative bg-gradient-to-br from-[#1a4d42] to-[#2f8b76] text-white p-6 rounded-2xl space-y-4 overflow-hidden">
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
                <div className="relative z-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-bold text-lg">For Tenants</h4>
                  <p className="text-xs text-white/60 mt-1">
                    Find, apply, and manage your home seamlessly
                  </p>
                </div>
                <ul className="relative z-10 text-xs space-y-2.5 text-white/80">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-200" />
                    Search & book homes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-200" />
                    Pay rent via mobile money
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-200" />
                    Submit maintenance requests
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-200" />
                    View lease & payment history
                  </li>
                </ul>
                <Link
                  href="/login?role=tenant"
                  className="relative z-10 block text-center py-2.5 bg-white text-[#1a4d42] text-xs font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Tenant Dashboard
                </Link>
              </div>
            </div>

            {/* Trust Metrics */}
            <div className="bg-[#0f2b23] text-white p-6 rounded-2xl">
              <div className="grid grid-cols-3 divide-x divide-white/10">
                <div className="text-center px-4">
                  <p className="text-2xl font-bold text-[#48c9a8]">1,200+</p>
                  <p className="text-xs text-white/50 mt-1">Verified Properties</p>
                </div>
                <div className="text-center px-4">
                  <p className="text-2xl font-bold text-[#48c9a8]">5,000+</p>
                  <p className="text-xs text-white/50 mt-1">Active Tenants</p>
                </div>
                <div className="text-center px-4">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-[#48c9a8]">Uganda&apos;s</p>
                  </div>
                  <p className="text-xs text-white/50 mt-1">Top Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SEARCH HERO (kept from original for deep-link access)
         ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76] py-16 sm:py-20">
        <div className="page-container relative z-10">
          <div className="mx-auto max-w-3xl text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              Find a place you&apos;ll love to call home
            </h2>
            <p className="mt-2 text-base text-white/70">
              Connecting tenants with homes and landlords with tenants across
              Uganda
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
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

          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Secure Messaging
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Direct Contact
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              Mobile Payments
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PROPERTY TYPE FILTER + FEATURED GRID
         ═══════════════════════════════════════════════════════ */}
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

      <section id="featured" className="section">
        <div className="page-container">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
                All Properties
              </h2>
              <p className="mt-1 text-gray-500">
                Browse our complete listing collection
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

      {/* ═══════════════════════════════════════════════════════
          EXPLORE BY LOCATION
         ═══════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════
          NEWLY LISTED
         ═══════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════
          TMS FEATURES SHOWCASE
         ═══════════════════════════════════════════════════════ */}
      <section className="section bg-[#f4f6fa]">
        <div className="page-container">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1a4d42]/10 px-4 py-1.5 text-xs font-semibold text-[#1a4d42] mb-4">
              <Award className="h-3.5 w-3.5" />
              Tenant Management System
            </span>
            <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
              More Than Just Listings
            </h2>
            <p className="mt-2 text-gray-500 max-w-xl mx-auto">
              A complete property-to-tenancy lifecycle platform — from search
              to move-out, all in one place
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Lease Management */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Lease Management</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                Digital leases with full lifecycle tracking — from draft to
                active to renewal. Never miss an expiry.
              </p>
            </div>

            {/* Rent & Payments */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900">Rent & Payments</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                Automated rent reminders, mobile money payments, real-time
                ledger tracking, and instant receipts.
              </p>
            </div>

            {/* Maintenance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <Search className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-bold text-gray-900">Maintenance Requests</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                Tenants report issues, landlords assign and track. Full
                visibility from submission to resolution.
              </p>
            </div>

            {/* Applications */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900">Tenant Applications</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                Streamlined application pipeline — submit, review, approve, and
                convert to tenancy in one flow.
              </p>
            </div>

            {/* Communication */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50">
                <Star className="h-5 w-5 text-cyan-600" />
              </div>
              <h3 className="font-bold text-gray-900">Communication</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                Direct messaging between tenants and landlords, plus notices,
                announcements, and document sharing.
              </p>
            </div>

            {/* Renewals & Move-out */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <Clock className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="font-bold text-gray-900">Renewals & Move-Out</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                Lease renewal offers, tenant responses, move-in inspections, and
                structured move-out workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
         ═══════════════════════════════════════════════════════ */}
      <section className="section">
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

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA
         ═══════════════════════════════════════════════════════ */}
      <section className="section bg-gradient-to-br from-[#0f2b23] via-[#1a4d42] to-[#1f6d5e]">
        <div className="page-container text-center">
          <h2 className="mb-4 text-3xl font-bold text-white font-display sm:text-4xl">
            Are you a landlord or agent?
          </h2>
          <p className="mb-8 text-lg text-white/70 max-w-xl mx-auto">
            List your properties on RentMe and reach thousands of potential
            tenants across Uganda. Manage everything from one dashboard.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-[#1a4d42] shadow-sm transition-all hover:bg-gray-50"
            >
              List Your Property
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
