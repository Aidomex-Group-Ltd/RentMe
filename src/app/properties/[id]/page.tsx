import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPublicProperty } from "@/lib/public-property";
import PropertyDetailClient from "@/components/property/property-detail-client";

/**
 * Server component for property detail pages.
 *
 * Uses the shared cached `getPublicProperty` fetcher so the layout
 * (metadata + JSON-LD) and the page (render) share a single DB query
 * within the same request via Next.js unstable_cache.
 */
export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Shared cached fetch — layout's generateMetadata and this page
  // both call getPublicProperty(key), but Next.js deduplicates
  // within the same request via unstable_cache.
  const property = await getPublicProperty(params.id);

  if (!property) {
    notFound();
  }

  // Server-side session check
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;
  const isOwner = userId === property.userId;

  // Check if user already reported this property
  let alreadyReported = false;
  if (userId) {
    const report = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        propertyId: property.id,
      },
    });
    alreadyReported = Boolean(report);
  }

  // Flatten amenity keys for the client component
  const propertyWithAmenities: Record<string, any> = { ...property };
  if (property.amenities) {
    for (const pa of property.amenities) {
      if (pa.amenity?.name) {
        const key = pa.amenity.name.toLowerCase().replace(/\s+/g, "");
        propertyWithAmenities[key] = true;
      }
    }
  }

  // Safety/flagging info
  const safety = {
    level: property.isFlagged ? ("warning" as const) : ("none" as const),
    title: property.isFlagged ? "Flagged Listing" : "",
    messages: property.flagReason ? [property.flagReason] : [],
    hideDirectContact: Boolean(property.isFlagged),
    blockInquiries: false,
  };
  propertyWithAmenities.safety = safety;

  return (
    <PropertyDetailClient
      property={propertyWithAmenities}
      isOwner={isOwner}
      alreadyReported={alreadyReported}
      userId={userId}
    />
  );
}
