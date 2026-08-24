import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off script: Seed a "1 Bedroom House in Kazo" property
 * so the URL /properties/1-bedroom-house-kazo-mt5jf5jw resolves.
 *
 * Run: npx tsx scripts/seed-kazo-property.ts
 */
async function main() {
  console.log("🏠 Seeding Kazo property...");

  // Find an existing landlord to assign this property to
  const landlord = await prisma.user.findFirst({
    where: { role: "LANDLORD" },
    select: { id: true, name: true },
  });

  if (!landlord) {
    console.error("❌ No landlord user found. Run the seed first.");
    process.exit(1);
  }

  console.log(`   Assigning to: ${landlord.name} (${landlord.id})`);

  const property = await prisma.property.upsert({
    where: { slug: "1-bedroom-house-kazo-mt5jf5jw" },
    update: {},
    create: {
      title: "1 Bedroom House in Kazo",
      description:
        "Cozy 1 bedroom house in Kazo, located along the Kampala-Mpigi road. " +
        "This self-contained unit features a spacious bedroom, modern bathroom, " +
        "and a compact kitchen area. The property has reliable water supply from " +
        "a shared tank and electricity connection. The compound is shared with " +
        "other units but well maintained with a paved parking area. " +
        "Close to Kazo trading center, schools, and health facilities. " +
        "Ideal for a single professional or couple looking for affordable, " +
        "comfortable accommodation in a quiet residential neighborhood.",
      slug: "1-bedroom-house-kazo-mt5jf5jw",
      propertyType: "house",
      bedrooms: 1,
      bathrooms: 1,
      rent: 300000,
      deposit: 300000,
      paymentFrequency: "MONTHLY",
      minimumMonths: 1,
      district: "Wakiso",
      neighborhood: "Kazo",
      city: "Wakiso",
      isSelfContained: true,
      hasCompound: true,
      hasWater: true,
      hasElectricity: true,
      hasParking: true,
      status: "ACTIVE",
      isVerified: true,
      viewCount: 142,
      saveCount: 18,
      userId: landlord.id,
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
            alt: "1 Bedroom House in Kazo - Exterior view",
            isCover: true,
            order: 0,
          },
          {
            url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
            alt: "1 Bedroom House in Kazo - Living area",
            isCover: false,
            order: 1,
          },
          {
            url: "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&h=600&fit=crop",
            alt: "1 Bedroom House in Kazo - Bedroom",
            isCover: false,
            order: 2,
          },
        ],
      },
    },
  });

  console.log(`✅ Property created!`);
  console.log(`   ID:     ${property.id}`);
  console.log(`   Slug:   ${property.slug}`);
  console.log(`   URL:    /properties/${property.slug}`);
  console.log(`   Rent:   UGX ${property.rent.toLocaleString()}/month`);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
