import Link from "next/link";
import { MapPin, ArrowRight, BedDouble, Bath, ShieldCheck } from "lucide-react";
import { formatUGX } from "@/lib/utils";

interface FeaturedListing {
  id: string;
  slug: string;
  title: string;
  location: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  type: string;
  isVerified: boolean;
  image: string;
}

interface FeaturedListingsProps {
  listings: FeaturedListing[];
}

const FALLBACK_LISTINGS: FeaturedListing[] = [
  {
    id: "1",
    slug: "modern-villa-kololo",
    title: "Modern Villa in Kololo",
    location: "Kololo, Kampala",
    rent: 3500000,
    bedrooms: 4,
    bathrooms: 3,
    type: "Villa",
    isVerified: true,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80&auto=format",
  },
  {
    id: "2",
    slug: "executive-apartment-naguru",
    title: "Executive Apartment in Naguru",
    location: "Naguru, Kampala",
    rent: 2800000,
    bedrooms: 3,
    bathrooms: 2,
    type: "Apartment",
    isVerified: true,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&auto=format",
  },
  {
    id: "3",
    slug: "furnished-flat-ntinda",
    title: "Furnished Flat in Ntinda",
    location: "Ntinda, Kampala",
    rent: 1800000,
    bedrooms: 2,
    bathrooms: 2,
    type: "Flat",
    isVerified: false,
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80&auto=format",
  },
  {
    id: "4",
    slug: "family-home-muyenga",
    title: "Family Home in Muyenga",
    location: "Muyenga, Kampala",
    rent: 4200000,
    bedrooms: 5,
    bathrooms: 4,
    type: "House",
    isVerified: true,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80&auto=format",
  },
];

export default function FeaturedListings({ listings }: FeaturedListingsProps) {
  const items = listings.length > 0 ? listings : FALLBACK_LISTINGS;

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
              Featured
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Popular listings
            </h2>
            <p className="mt-2 text-lg text-slate-500">
              Handpicked properties across Kampala.
            </p>
          </div>
          <Link
            href="/search"
            className="hidden items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 sm:flex"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/properties/${item.slug}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-slate-300"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {item.isVerified && (
                  <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </div>
                )}
                <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {item.type}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                  {item.title}
                </h3>
                <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">{item.location}</span>
                </div>

                <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4 text-slate-400" />
                    {item.bedrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4 text-slate-400" />
                    {item.bathrooms}
                  </span>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <span className="text-lg font-bold text-brand-600">
                    {formatUGX(item.rent)}
                  </span>
                  <span className="text-sm text-slate-500">/month</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md"
          >
            View all properties
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
