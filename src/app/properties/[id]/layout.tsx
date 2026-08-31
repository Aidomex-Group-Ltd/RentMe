import type { Metadata } from "next";
import { getPublicProperty, type PublicPropertyData } from "@/lib/public-property";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

function formatUGX(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Dynamic SEO Metadata ──────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  let property;
  try {
    property = await getPublicProperty(params.id);
  } catch {
    return {
      title: "Property Not Found | Rent Mesh",
      description:
        "This property may have been removed or is no longer available.",
    };
  }

  if (!property) {
    return {
      title: "Property Not Found | Rent Mesh",
      description:
        "This property may have been removed or is no longer available.",
    };
  }

  const location = [
    property.neighborhood,
    property.district,
    property.city,
    "Uganda",
  ]
    .filter(Boolean)
    .join(", ");

  const pageTitle = `${property.title} — ${formatUGX(property.rent || 0)}/mo in ${location}`;
  const ogTitle = `${pageTitle} | Rent Mesh`;
  const description =
    property.description?.slice(0, 155)?.trim() ||
    `Rent ${property.title} in ${location} for ${formatUGX(property.rent || 0)}/month. ${property.bedrooms || 0} bed, ${property.bathrooms || 0} bath. Verified on Rent Mesh.`;

  const pAny = property as any;
  const imageUrl = pAny.images?.[0]?.url || "/og-property-default.jpg";
  const pageUrl = `/properties/${property.slug || property.id}`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: ogTitle,
      description,
      url: pageUrl,
      siteName: "Rent Mesh",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${property.title} in ${location}`,
        },
      ],
      locale: "en_UG",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [imageUrl],
    },
  };
}

// ─── JSON-LD Structured Data ───────────────────────────────
// Schema.org Apartment for Google rich results
// https://developers.google.com/search/docs/appearance/structured-data/real-estate

function buildJsonLd(property: PublicPropertyData): Record<string, unknown> {
  const location = [
    property.neighborhood,
    property.district,
    property.city,
  ]
    .filter(Boolean)
    .join(", ");

  const pageUrl = `${BASE}/properties/${property.slug || property.id}`;
  const pAny = property as any;
  const imageUrl =
    pAny.images?.[0]?.url || `${BASE}/og-property-default.jpg`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: property.title,
    description:
      property.description ||
      `${property.title} for rent in ${location}, Uganda.`,
    url: pageUrl,
    image: imageUrl,
    datePosted: property.listedAt?.toISOString() || new Date().toISOString(),
    offers: {
      "@type": "Offer",
      price: property.rent || 0,
      priceCurrency: "UGX",
      availability: "https://schema.org/InStock",
      validFrom: property.listedAt?.toISOString() || new Date().toISOString(),
      seller: {
        "@type": "RealEstateAgent",
        name: pAny.user?.name || "Rent Mesh",
        url: BASE,
      },
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city || property.district || "",
      addressRegion: property.district || "",
      addressCountry: "UG",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: property.latitude || 0,
      longitude: property.longitude || 0,
    },
    numberOfRooms: property.bedrooms || 0,
    numberOfBathroomsTotal: property.bathrooms || 0,
    containedInPlace: {
      "@type": "City",
      name: property.city || property.district || "Uganda",
    },
    provider: {
      "@type": "Organization",
      name: "Rent Mesh",
      url: BASE,
      logo: `${BASE}/icons/icon-512.png`,
    },
  };

  if (property.bedrooms && property.bedrooms > 0) {
    (schema as any).floorSize = {
      "@type": "QuantitativeValue",
      value: property.bedrooms * 25,
      unitText: "SQM",
    };
  }

  if (pAny.amenities && pAny.amenities.length > 0) {
    const amenityNames = pAny.amenities
      .map((a: any) => a.amenity?.name)
      .filter(Boolean) as string[];
    if (amenityNames.length > 0) {
      (schema as any).amenityFeature = amenityNames.map((name) => ({
        "@type": "LocationFeatureSpecification",
        name,
        value: true,
      }));
    }
  }

  return schema;
}

// ─── Layout Component ──────────────────────────────────────

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  let property;
  try {
    property = await getPublicProperty(params.id);
  } catch {
    property = null;
  }

  return (
    <>
      {property && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildJsonLd(property)),
          }}
        />
      )}
      {children}
    </>
  );
}
