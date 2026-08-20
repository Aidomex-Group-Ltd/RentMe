"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import SearchBar from "@/components/property/search-bar";
import PropertyCard from "@/components/property/property-card";
import { formatUGX } from "@/lib/utils";

const popularLocations = [
  { name: "Kampala", count: 1240, image: "🏙️" },
  { name: "Wakiso", count: 856, image: "🏘️" },
  { name: "Mukono", count: 543, image: "🌿" },
  { name: "Entebbe", count: 321, image: "🏖️" },
  { name: "Jinja", count: 234, image: "🌊" },
  { name: "Mbarara", count: 189, image: "🌄" },
];

const stats = [
  { label: "Properties Listed", value: "5,000+", icon: Home },
  { label: "Happy Tenants", value: "12,000+", icon: Users },
  { label: "Verified Landlords", value: "2,500+", icon: Shield },
  { label: "Cities Covered", value: "50+", icon: MapPin },
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

  useEffect(() => {
    async function fetchProperties() {
      try {
        const [featured, newest] = await Promise.all([
          fetch("/api/properties?limit=6&sort=most_viewed&status=ACTIVE").then(
            (r) => r.json()
          ),
          fetch("/api/properties?limit=6&sort=newest&status=ACTIVE").then(
            (r) => r.json()
          ),
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
  }, []);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="page-container relative py-16 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              Uganda&apos;s Most Trusted Rental Marketplace
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl font-display">
              Find a place you&apos;ll{" "}
              <span className="text-accent-400">love</span> to call home
            </h1>
            <p className="mb-10 text-lg text-white/80 sm:text-xl">
              Discover rental houses, apartments, and rooms across Kampala, Wakiso,
              Mukono, and all of Uganda.
            </p>
          </div>

          <SearchBar />

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/70">
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

      {/* Stats */}
      <section className="border-b border-gray-100 bg-white py-8">
        <div className="page-container">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-2 h-6 w-6 text-brand-500" />
                <p className="text-2xl font-bold text-gray-900 font-display">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProperties.map((property) => (
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

      {/* Popular Locations */}
      <section className="section bg-gray-50">
        <div className="page-container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 font-display sm:text-3xl">
              Popular Locations
            </h2>
            <p className="mt-1 text-gray-500">
              Explore properties in Uganda&apos;s most popular areas
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {popularLocations.map((loc) => (
              <Link
                key={loc.name}
                href={`/search?district=${loc.name}`}
                className="card group overflow-hidden text-center transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 text-4xl">
                  {loc.image}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-600">
                    {loc.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {loc.count.toLocaleString()} properties
                  </p>
                </div>
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
              href="/about"
              className="inline-flex items-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
