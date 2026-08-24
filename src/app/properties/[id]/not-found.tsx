import prisma from "@/lib/prisma";
import PropertyNotFound from "@/components/property/property-not-found";

/**
 * Property-specific not-found page.
 * Shows a friendly "Property Not Found" message with suggested similar properties.
 */
export default async function PropertiesNotFound() {
  let suggestedProperties: any[] = [];

  try {
    suggestedProperties = await prisma.property.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        rent: true,
        bedrooms: true,
        bathrooms: true,
        propertyType: true,
        district: true,
        neighborhood: true,
        city: true,
        isVerified: true,
        images: {
          orderBy: { isCover: "desc" },
          take: 1,
          select: { url: true, alt: true },
        },
      },
      orderBy: { viewCount: "desc" },
      take: 6,
    });
  } catch {
    // If DB query fails, render without suggestions
    suggestedProperties = [];
  }

  return <PropertyNotFound suggestedProperties={suggestedProperties} />;
}
