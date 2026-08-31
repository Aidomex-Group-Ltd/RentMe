import type { Metadata } from "next";
import HeroCarousel from "@/components/home/hero-carousel";
import KampalaLocations from "@/components/home/kampala-locations";
import FeaturedListings from "@/components/home/featured-listings";
import PropertyCategories from "@/components/home/property-categories";
import HowItWorks from "@/components/home/how-it-works";
import BenefitsSection from "@/components/home/benefits-section";
import TenantPreview from "@/components/home/tenant-preview";
import TrustSection from "@/components/home/trust-section";
import FinalCTA from "@/components/home/final-cta";
import { formatUGX } from "@/lib/utils";
import prisma from "@/lib/prisma";
import PlatformChrome from "@/components/home/platform-chrome";

export const metadata: Metadata = {
  title: "Rent Mesh — Find Your Perfect Home in Uganda",
  description:
    "Discover verified houses, apartments, and rooms for rent anywhere in Uganda. Search, filter, and apply — free.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Find Your Perfect Home in Uganda | Rent Mesh",
    description:
      "Verified properties in Kampala, Entebbe, Jinja, Mbarara, Gulu, and beyond. Uganda's modern property platform.",
    url: "/",
    siteName: "Rent Mesh",
    type: "website",
  },
};

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
  bathrooms: number;
  isVerified: boolean;
  images: { url: string }[];
}

async function getFeaturedProperties() {
  try {
    const rows = (await prisma.property.findMany({
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: [{ isVerified: "desc" }, { listedAt: "desc" }],
      take: 4,
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
        bathrooms: true,
        isVerified: true,
        images: { orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 1 },
      },
    })) as FeaturedProperty[];

    return rows.map((p) => ({
      id: p.id,
      slug: p.slug || p.id,
      title: p.title,
      location:
        [p.neighborhood, p.district || p.city].filter(Boolean).join(", ") ||
        "Uganda",
      rent: p.rent,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      type: p.propertyType.replace(/_/g, " "),
      isVerified: p.isVerified,
      image:
        p.images?.[0]?.url ||
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&auto=format",
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featured = await getFeaturedProperties();

  return (
    <PlatformChrome>
      <div className="bg-white font-sans text-slate-800">
        {/* 1. Hero Carousel */}
        <HeroCarousel />

        {/* 2. Floating Search */}
        <section className="relative z-20 -mt-16 sm:-mt-20">
          <div className="page-container">
            <div className="glass rounded-3xl p-6 shadow-2xl sm:p-8">
              <h2 className="mb-4 text-center text-lg font-bold text-slate-900">
                Start your search
              </h2>
              <form
                action="/search"
                method="GET"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <div className="relative">
                  <select
                    name="district"
                    aria-label="Location"
                    className="input pl-4"
                  >
                    <option value="">All locations</option>
                    <option value="Kampala">Kampala</option>
                    <option value="Wakiso">Wakiso</option>
                    <option value="Mukono">Mukono</option>
                    <option value="Entebbe">Entebbe</option>
                    <option value="Jinja">Jinja</option>
                    <option value="Mbarara">Mbarara</option>
                    <option value="Gulu">Gulu</option>
                  </select>
                </div>

                <select
                  name="type"
                  aria-label="Property type"
                  className="input"
                >
                  <option value="">All types</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="bedsitter">Bedsitter</option>
                  <option value="villa">Villa</option>
                  <option value="flat">Flat</option>
                  <option value="1_bedroom">1 Bedroom</option>
                  <option value="2_bedroom">2 Bedroom</option>
                </select>

                <input
                  type="number"
                  name="maxRent"
                  min="0"
                  placeholder="Max rent (UGX)"
                  aria-label="Maximum rent in UGX"
                  className="input"
                />

                <button
                  type="submit"
                  className="btn-primary w-full"
                >
                  Search properties
                </button>
              </form>
              <p className="mt-3 text-center text-xs text-slate-400">
                No account needed to browse · free forever
              </p>
            </div>
          </div>
        </section>

        {/* 3. Popular Locations */}
        <KampalaLocations />

        {/* 4. Featured Listings */}
        <FeaturedListings listings={featured} />

        {/* 5. Property Categories */}
        <PropertyCategories />

        {/* 6. How Rent Mesh Works */}
        <HowItWorks />

        {/* 7. Benefits for Renters + Owners */}
        <BenefitsSection />

        {/* 8. Tenant Management Preview */}
        <TenantPreview />

        {/* 9. Trust & Safety */}
        <TrustSection />

        {/* 10. Final CTA */}
        <FinalCTA />
      </div>
    </PlatformChrome>
  );
}
