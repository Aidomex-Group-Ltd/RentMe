import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Building,
  Users,
  Award,
  Shield,
  MapPin,
  Check,
  FileText,
  Eye,
} from "lucide-react";
import PlatformChrome from "@/components/home/platform-chrome";
import { districtsByRegion, ugandanRegions } from "@/lib/uganda-districts";
import { formatUGX } from "@/lib/utils";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "RentMe — Discover Your Perfect Home Across Uganda",
  description:
    "Explore verified houses, apartments, and rooms for rent from Kampala to Entebbe, Jinja and beyond. Search free — no account needed.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Discover Your Perfect Home Across Uganda | RentMe",
    description:
      "Verified properties from Kampala to Entebbe, Jinja, and beyond. Search, filter, and apply on Uganda's modern property platform.",
    url: "/",
    siteName: "RentMe",
    type: "website",
  },
};

const FEATURE_FALLBACK = [
  {
    id: "mweya",
    slug: null as string | null,
    title: "Mweya Safari Lodge (Units)",
    location: "Queen Elizabeth National Park",
    priceLabel: "Premium short-stay units",
    tags: ["Luxury", "Wildlife Views"],
    image: "/images/mweya-lodge.svg",
  },
  {
    id: "jinja-condo",
    slug: null as string | null,
    title: "Nalubaale Executive Condos",
    location: "Jinja, Uganda",
    priceLabel: "Lake-view executive living",
    tags: ["Lake Views", "Security"],
    image: "/images/jinja-condo.svg",
  },
  {
    id: "fort-portal",
    slug: null as string | null,
    title: "Fort Portal Cultural Estate",
    location: "Fort Portal, Uganda",
    priceLabel: "Garden estate in the foothills",
    tags: ["Authentic", "Garden"],
    image: "/images/fort-portal.svg",
  },
];

interface FeaturedProperty {
  id: string;
  slug: string;
  title: string;
  district: string | null;
  city: string | null;
  neighborhood?: string | null;
  rent: number;
  paymentFrequency: string;
  propertyType: string;
  bedrooms: number;
  isVerified: boolean;
  images: { url: string }[];
}

async function getFeaturedProperties(): Promise<{
  list: Array<{
    id: string;
    hrefDetail: string;
    hrefApply: string;
    title: string;
    location: string;
    priceLabel: string;
    image: string;
    tags: string[];
  }>;
}> {
  try {
    const rows = (await prisma.property.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: [{ isVerified: "desc" }, { listedAt: "desc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        district: true,
        city: true,
        neighborhood: true,
        rent: true,
        paymentFrequency: true,
        propertyType: true,
        bedrooms: true,
        isVerified: true,
        images: { orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 1 },
      },
    })) as FeaturedProperty[];

    if (!rows.length) throw new Error("empty");

    return {
      list: rows.map((p) => ({
        id: p.id,
        hrefDetail: `/properties/${p.slug}`,
        // Guests authenticate contextually at apply-time and land back here.
        hrefApply: `/login?callbackUrl=${encodeURIComponent(`/properties/${p.slug}`)}&intent=apply`,
        title: p.title,
        location:
          [p.neighborhood, p.district || p.city].filter(Boolean).join(", ") ||
          "Uganda",
        priceLabel: `${formatUGX(p.rent)} / ${
          p.paymentFrequency?.toLowerCase() === "monthly"
            ? "month"
            : p.paymentFrequency?.toLowerCase() || "month"
        }`,
        image:
          p.images?.[0]?.url ||
          ["/images/jinja-condo.svg", "/images/mweya-lodge.svg", "/images/fort-portal.svg"][
            rows.indexOf(p) % 3
          ],
        tags: [
          ...(p.isVerified ? ["Verified"] : []),
          p.bedrooms > 0 ? `${p.bedrooms} Bed` : "Studio",
          p.propertyType.replace(/_/g, " "),
        ].slice(0, 3),
      })),
    };
  } catch {
    return {
      list: FEATURE_FALLBACK.map((f) => ({
        ...f,
        hrefDetail: "/search",
        hrefApply: `/login?callbackUrl=${encodeURIComponent("/search")}&intent=apply`,
        location: f.location,
      })),
    };
  }
}

export default async function HomePage() {
  const featured = await getFeaturedProperties();

  return (
    <PlatformChrome>
      <div className="bg-slate-50 font-sans text-slate-800">
        {/* ─── Hero + unified dashboard rail (first screen) ── */}
        <section className="relative overflow-hidden bg-slate-900 px-4 py-10 text-white sm:px-6 lg:py-14">
          <div
            className="absolute inset-0 z-0 opacity-45 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/uganda-skyline.svg')" }}
            aria-hidden
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/70" aria-hidden />

          <div className="relative z-10 mx-auto max-w-4xl space-y-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Discover Your Perfect Home Across Uganda
            </h1>
            <p className="text-lg font-light text-slate-200 md:text-xl">
              Explore Verified Properties from Kampala to Entebbe, Jinja, and
              Beyond.
            </p>
            <div className="pt-2">
              <Link
                href="/search"
                className="inline-block rounded-md bg-teal-700 px-6 py-3 font-medium text-white shadow-lg transition hover:bg-teal-800"
              >
                Browse Featured Listings
              </Link>
            </div>

          {/* ─── Floating search card ─────────────────────── */}
          <div className="relative z-20 mx-auto mt-10 w-full max-w-4xl rounded-xl bg-white p-6 text-slate-800 shadow-2xl">
            <h2 className="mb-4 text-center text-lg font-bold text-slate-900">
              Start Your Search Now
            </h2>
            <form
              action="/search"
              method="GET"
              className="grid grid-cols-1 gap-3 md:grid-cols-4"
            >
              <select
                name="district"
                aria-label="Location"
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="">Location (All Uganda — 100+ districts)</option>
                {ugandanRegions.map((region) => (
                  <optgroup key={region} label={`${region} Region`}>
                    {districtsByRegion[region].map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <select
                name="type"
                aria-label="Property type"
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="">Property Type</option>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="flat">Flat</option>
                <option value="house">House</option>
                <option value="bedsitter">Bedsitter</option>
              </select>

              <input
                type="number"
                name="maxRent"
                min="0"
                placeholder="Max Rent (UGX)"
                aria-label="Maximum rent in UGX"
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-700"
              />

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-teal-800 p-2.5 text-sm font-medium text-white transition hover:bg-teal-900"
              >
                <Search className="h-4 w-4" /> Search Properties
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-slate-400">
              No account needed to browse · free forever
            </p>
          </div>
          </div>
        </section>

        {/* ─── Showcase & management grid ───────────────────── */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-2">
          {/* Featured properties */}
          <div>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Featured Properties
              </h2>
              <Link
                href="/search"
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {featured.list.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-36 bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <h3 className="truncate text-sm font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {item.location}
                    </p>
                    <p className="text-xs font-semibold text-slate-900">
                      {item.priceLabel}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                        >
                          <Check className="h-2.5 w-2.5 text-teal-600" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link
                        href={item.hrefDetail}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-slate-300 py-1.5 text-xs font-medium hover:bg-slate-50"
                      >
                        <Eye className="h-3 w-3" /> View Details
                      </Link>
                      <Link
                        href={item.hrefApply}
                        className="flex flex-1 items-center justify-center gap-1 rounded bg-teal-800 py-1.5 text-xs font-medium text-white hover:bg-teal-900"
                      >
                        <FileText className="h-3 w-3" /> Apply Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions for everyone */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Solutions for Everyone
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Landlords */}
              <div className="space-y-4 rounded-lg bg-slate-800 p-6 text-white">
                <h3 className="text-center text-lg font-bold">For Landlords</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-teal-400" /> List Your
                    Properties
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-400" /> Manage Tenancies
                    & Leases
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-teal-400" /> Applications,
                    Notices & Renewals
                  </li>
                </ul>
                <Link
                  href="/register"
                  className="block rounded bg-slate-100 py-2 text-center text-xs font-semibold text-slate-900 transition hover:bg-white"
                >
                  Landlord Solutions
                </Link>
              </div>

              {/* Tenants */}
              <div className="space-y-4 rounded-lg bg-teal-900 p-6 text-white">
                <h3 className="text-center text-lg font-bold">For Tenants</h3>
                <ul className="space-y-2 text-xs text-teal-100">
                  <li className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-teal-300" /> Search & Apply
                    for Homes
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-teal-300" /> Secure Mobile
                    Rent Payments
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-teal-300" /> Direct
                    Maintenance Requests
                  </li>
                </ul>
                <Link
                  href="/register"
                  className="block rounded bg-white py-2 text-center text-xs font-semibold text-teal-900 transition hover:bg-teal-50"
                >
                  Tenant Solutions
                </Link>
              </div>
            </div>

            {/* Trust metrics */}
            <div className="flex items-center justify-around rounded-lg bg-slate-900 p-6 text-center text-white">
              <div>
                <p className="text-xl font-bold text-teal-400">1,200+</p>
                <p className="text-xs text-slate-400">Verified Properties</p>
              </div>
              <div className="h-8 border-r border-slate-700" />
              <div>
                <p className="text-xl font-bold text-teal-400">5,000+</p>
                <p className="text-xs text-slate-400">Active Tenants</p>
              </div>
              <div className="h-8 border-r border-slate-700" />
              <div>
                <p className="text-xl font-bold text-teal-400">Uganda&apos;s</p>
                <p className="text-xs text-slate-400">Top Platform</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PlatformChrome>
  );
}
