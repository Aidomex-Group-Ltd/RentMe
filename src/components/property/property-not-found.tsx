import Link from "next/link";
import Image from "next/image";
import { Search, Home, ArrowLeft, MapPin, BedDouble, Bath, ShieldCheck } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { formatUGX } from "@/lib/utils";

interface SuggestedProperty {
  id: string;
  slug: string | null;
  title: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  district: string | null;
  neighborhood: string | null;
  city: string | null;
  isVerified: boolean;
  images: { url: string; alt: string | null }[];
}

interface PropertyNotFoundProps {
  suggestedProperties?: SuggestedProperty[];
}

const propertyTypeLabels: Record<string, string> = {
  single_room: "Single Room",
  room_self_contained: "Room & Self-Contained",
  studio: "Studio",
  bedsitter: "Bedsitter",
  "1_bedroom": "1 Bedroom",
  "2_bedroom": "2 Bedroom",
  "3_bedroom": "3 Bedroom",
  "4_plus_bedroom": "4+ Bedroom",
  apartment: "Apartment",
  flat: "Flat",
  house: "House",
  villa: "Villa",
  townhouse: "Townhouse",
  duplex: "Duplex",
  hostel: "Hostel",
};

export default function PropertyNotFound({
  suggestedProperties = [],
}: PropertyNotFoundProps) {
  return (
    <MainLayout>
      <div className="min-h-[80vh] bg-gray-50">
        <div className="page-container py-16">
          <div className="mx-auto max-w-2xl text-center">
            {/* Illustration */}
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-brand-50">
              <Home className="h-12 w-12 text-brand-400" />
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-gray-900 font-display">
              Property Not Found
            </h1>

            <p className="mt-4 text-lg text-gray-500">
              This property may have been rented out, removed by the owner, or
              the link may be incorrect.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                <Search className="h-4 w-4" />
                Browse All Properties
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Homepage
              </Link>
            </div>
          </div>

          {/* Suggested Properties */}
          {suggestedProperties.length > 0 && (
            <div className="mx-auto mt-16 max-w-5xl">
              <h2 className="text-xl font-bold text-gray-900 font-display">
                Similar Properties You Might Like
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Here are some available properties you may be interested in.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {suggestedProperties.map((property) => {
                  const propertyHref = property.slug
                    ? `/properties/${property.slug}`
                    : `/properties/${property.id}`;
                  const location = [
                    property.neighborhood,
                    property.district || property.city,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <Link
                      key={property.id}
                      href={propertyHref}
                      className="group block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-gray-300"
                    >
                      {/* Image */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        {property.images?.[0]?.url ? (
                          <Image
                            src={property.images[0].url}
                            alt={property.images[0].alt || property.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
                            <span className="text-4xl">🏠</span>
                          </div>
                        )}

                        {property.isVerified && (
                          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white shadow">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </div>
                        )}

                        <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          {propertyTypeLabels[property.propertyType] ||
                            property.propertyType}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-600 line-clamp-1">
                          {property.title}
                        </h3>

                        {location && (
                          <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{location}</span>
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                          {property.bedrooms > 0 && (
                            <span className="flex items-center gap-1">
                              <BedDouble className="h-4 w-4" />
                              {property.bedrooms}{" "}
                              {property.bedrooms === 1 ? "Bed" : "Beds"}
                            </span>
                          )}
                          {property.bathrooms > 0 && (
                            <span className="flex items-center gap-1">
                              <Bath className="h-4 w-4" />
                              {property.bathrooms}{" "}
                              {property.bathrooms === 1 ? "Bath" : "Baths"}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 border-t border-gray-100 pt-3">
                          <span className="text-lg font-bold text-brand-600">
                            {formatUGX(property.rent)}
                          </span>
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="mx-auto mt-12 max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-600">
              Looking for something specific?{" "}
              <Link href="/search" className="font-semibold text-brand-600 hover:underline">
                Search all available properties
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="font-semibold text-brand-600 hover:underline">
                contact our support team
              </Link>{" "}
              for help finding your next home.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
