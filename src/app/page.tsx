"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Shield,
  Star,
  MapPin,
  ArrowRight,
  TrendingUp,
  Home,
  Users,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Bath,
  Heart,
  ArrowUpRight,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import SearchBar from "@/components/property/search-bar";
import PropertyCard from "@/components/property/property-card";
import { formatUGX, cn } from "@/lib/utils";

const popularLocations = [
  { name: "Kampala", slug: "Kampala", description: "Find homes in the capital", emoji: "🏙️" },
  { name: "Kololo", slug: "Kololo", description: "Premium hilltop living", emoji: "🌳" },
  { name: "Ntinda", slug: "Ntinda", description: "Modern apartments & houses", emoji: "🏢" },
  { name: "Naguru", slug: "Naguru", description: "Quiet residential area", emoji: "🏡" },
  { name: "Bugolobi", slug: "Bugolobi", description: "Convenient city living", emoji: "🏘️" },
  { name: "Entebbe", slug: "Entebbe", description: "Live near Lake Victoria", emoji: "🏖️" },
  { name: "Jinja", slug: "Jinja", description: "Discover properties in Jinja", emoji: "🌊" },
  { name: "Muyenga", slug: "Muyenga", description: "Scenic hillside homes", emoji: "🌄" },
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
    description: "Browse thousands of properties across Uganda with advanced filters.",
  },
  {
    step: "2",
    title: "Connect",
    description: "Message landlords directly and schedule viewings at your convenience.",
  },
  {
    step: "3",
    title: "Move In",
    description: "Submit your application, get approved, and move into your new home.",
  },
];

export default function HomePage() {
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [newestProperties, setNewestProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const carouselContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const typeParam = activeType ? `&type=${activeType}` : "";
        const [featured, newest] = await Promise.all([
          fetch(`/api/properties?limit=10&sort=most_viewed&status=ACTIVE${typeParam}`).then(
            (r) => r.json()
          ),
          fetch(`/api/properties?limit=6&sort=newest&status=ACTIVE${typeParam}`).then(
            (r) => r.json()
          ),
        ]);
        setFeaturedProperties(featured.properties || []);
        setNewestProperties(newest.properties || []);
        setCarouselIndex(0);
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, [activeType]);

  // Auto-rotate carousel
  const startCarouselTimer = useCallback(() => {
    if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    carouselTimerRef.current = setInterval(() => {
      setCarouselIndex((prev) => {
        const max = featuredProperties.length;
        if (max <= 1) return 0;
        return (prev + 1) % max;
      });
    }, 6000);
  }, [featuredProperties.length]);

  useEffect(() => {
    if (featuredProperties.length > 1 && !loading) {
      startCarouselTimer();
    }
    return () => {
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    };
  }, [featuredProperties.length, loading, startCarouselTimer]);

  const pauseCarousel = () => {
    if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
  };

  const resumeCarousel = () => {
    startCarouselTimer();
  };

  const goToSlide = (index: number) => {
    setCarouselIndex(index);
    startCarouselTimer();
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev === 0 ? featuredProperties.length - 1 : prev - 1));
    startCarouselTimer();
  };

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % featuredProperties.length);
    startCarouselTimer();
  };

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="page-container relative py-14 sm:py-16 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              Uganda&apos;s Most Trusted Rental Marketplace
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl font-display">
              Find a place you&apos;ll{" "}
              <span className="text-accent-400">love</span> to call home
            </h1>
            <p className="mb-8 text-base text-white/80 sm:text-lg">
              Discover rental houses, apartments, and rooms across Kampala,
              Wakiso, Mukono, and all of Uganda.
            </p>
          </div>

          <SearchBar />

          {/* Location chips */}
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
              <CheckCircle className="h-4 w-4 text-green-400" />
              Verified Listings
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
              Secure Messaging
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
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
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties Carousel */}
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
              className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex"
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
                  <div className="p-4 space-y-3">
                    <div className="skeleton h-5 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-8 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProperties.length > 0 ? (
            <>
              {/* Mobile carousel */}
              <div
                className="relative sm:hidden"
                onMouseEnter={pauseCarousel}
                onMouseLeave={resumeCarousel}
                onTouchStart={pauseCarousel}
                onTouchEnd={resumeCarousel}
              >
                <div className="overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                  >
                    {featuredProperties.map((property) => (
                      <div key={property.id} className="w-full shrink-0 px-0.5">
                        <PropertyCard property={property} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carousel controls */}
                {featuredProperties.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-2 top-1/3 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                      aria-label="Previous property"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-2 top-1/3 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                      aria-label="Next property"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Dots */}
                    <div className="mt-4 flex items-center justify-center gap-1.5">
                      {featuredProperties.slice(0, 8).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goToSlide(i)}
                          className={cn(
                            "h-2 rounded-full transition-all",
                            i === carouselIndex
                              ? "w-6 bg-brand-500"
                              : "w-2 bg-gray-300 hover:bg-gray-400"
                          )}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Desktop grid */}
              <div className="hidden grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProperties.slice(0, 6).map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <Home className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900">
                No properties yet
              </h3>
              <p className="mt-1 text-gray-500">
                Be the first to list a property on RentMe.
              </p>
              <Link href="/register" className="btn-primary mt-4">
                List Your Property
              </Link>
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/search"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600"
            >
              View all properties
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Explore by Location */}
      <section className="section bg-gray-50">
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
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-5xl">
                  {loc.emoji}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600">
                    {loc.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {loc.description}
                  </p>
                </div>
                <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-gray-300 transition-colors group-hover:text-brand-500" />
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
                className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:flex"
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
      <section className="section bg-gray-50">
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
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
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
      <section className="section bg-brand-700">
        <div className="page-container text-center">
          <h2 className="mb-4 text-3xl font-bold text-white font-display sm:text-4xl">
            Are you a landlord or agent?
          </h2>
          <p className="mb-8 text-lg text-white/80">
            List your properties on RentMe and reach thousands of potential tenants
            across Uganda.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition-all hover:bg-gray-50"
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
