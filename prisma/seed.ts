import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding RentMe database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.viewingRequest.deleteMany();
  await prisma.application.deleteMany();
  await prisma.report.deleteMany();
  await prisma.savedProperty.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.propertyVideo.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.property.deleteMany();
  await prisma.review.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.landlord.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.user.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.location.deleteMany();

  const password = await bcrypt.hash("password123", 12);

  // Create amenity records
  const amenities = await Promise.all(
    [
      { name: "Parking" },
      { name: "Security" },
      { name: "Water Supply" },
      { name: "Electricity" },
      { name: "Internet" },
      { name: "Garden" },
      { name: "Air Conditioning" },
      { name: "Security Guard" },
      { name: "Generator" },
      { name: "Gated Community" },
      { name: "Compound" },
      { name: "Balcony" },
      { name: "Furnished" },
      { name: "Self-Contained" },
      { name: "Swimming Pool" },
    ].map((a) =>
      prisma.amenity.create({ data: a })
    )
  );

  // Create locations
  const uganda = await prisma.location.create({
    data: { name: "Uganda", type: "country" },
  });

  const central = await prisma.location.create({
    data: { name: "Central Region", type: "region", parentId: uganda.id },
  });

  const districts = await Promise.all(
    ["Kampala", "Wakiso", "Mukono", "Entebbe", "Jinja", "Mbarara"].map((d) =>
      prisma.location.create({
        data: { name: d, type: "district", parentId: central.id },
      })
    )
  );

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@rentme.ug",
      phone: "+256700000000",
      passwordHash: password,
      role: "ADMIN",
      emailVerified: true,
      phoneVerified: true,
      profile: { create: {} },
    },
  });

  // Create landlord users
  const landlords = [];
  const landlordData = [
    { name: "James Okello", email: "james@rentme.ug", phone: "+256701234567" },
    { name: "Sarah Nambi", email: "sarah@rentme.ug", phone: "+256702345678" },
    { name: "Peter Ssemwanga", email: "peter@rentme.ug", phone: "+256703456789" },
    { name: "Grace Nakamya", email: "grace@rentme.ug", phone: "+256704567890" },
    { name: "David Mugisha", email: "david@rentme.ug", phone: "+256705678901" },
  ];

  for (const ld of landlordData) {
    const user = await prisma.user.create({
      data: {
        ...ld,
        passwordHash: password,
        role: "LANDLORD",
        emailVerified: true,
        phoneVerified: true,
        profile: { create: {} },
        landlord: {
          create: {
            verificationStatus: "VERIFIED",
          },
        },
      },
    });
    landlords.push(user);
  }

  // Create tenant users
  const tenants = [];
  const tenantData = [
    { name: "Alice Achieng", email: "alice@rentme.ug", phone: "+256706789012" },
    { name: "Brian Ochieng", email: "brian@rentme.ug", phone: "+256707890123" },
    { name: "Catherine Auma", email: "catherine@rentme.ug", phone: "+256708901234" },
  ];

  for (const td of tenantData) {
    const user = await prisma.user.create({
      data: {
        ...td,
        passwordHash: password,
        role: "TENANT",
        emailVerified: true,
        phoneVerified: true,
        profile: {
          create: {
            budgetMin: 200000,
            budgetMax: 1500000,
          },
        },
        tenant: { create: {} },
      },
    });
    tenants.push(user);
  }

  // Create properties
  const properties = [
    {
      title: "2 Bedroom Apartment in Ntinda",
      description:
        "Beautiful 2 bedroom apartment located in the heart of Ntinda. Close to shops, schools, and public transport. The apartment features a modern kitchen, spacious living room, and two well-lit bedrooms. Water and electricity are available 24/7. Perfect for small families or professionals.",
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 2,
      rent: 800000,
      deposit: 800000,
      district: "Kampala",
      neighborhood: "Ntinda",
      city: "Kampala",
      isSelfContained: true,
      hasParking: true,
      hasSecurity: true,
      hasWater: true,
      hasElectricity: true,
      hasInternet: true,
      isVerified: true,
      userId: landlords[0].id,
    },
    {
      title: "1 Bedroom Bedsitter in Kisaasi",
      description:
        "Cozy 1 bedroom bedsitter in Kisaasi. Quiet neighborhood with easy access to Kisaasi-Kisementi road. Suitable for a single person or couple. Water tank available. Close to supermarkets and restaurants.",
      propertyType: "1_bedroom",
      bedrooms: 1,
      bathrooms: 1,
      rent: 400000,
      deposit: 400000,
      district: "Kampala",
      neighborhood: "Kisaasi",
      city: "Kampala",
      isSelfContained: true,
      hasWater: true,
      hasElectricity: true,
      isVerified: true,
      userId: landlords[0].id,
    },
    {
      title: "3 Bedroom House in Bugolobi",
      description:
        "Spacious 3 bedroom house in Bugolobi with a large compound. Ideal for families. Features include modern kitchen, en-suite master bedroom, parking for 2 cars, and 24/7 security. Located near Bugolobi经商区.",
      propertyType: "house",
      bedrooms: 3,
      bathrooms: 3,
      rent: 2500000,
      deposit: 5000000,
      agencyFee: 1000000,
      district: "Kampala",
      neighborhood: "Bugolobi",
      city: "Kampala",
      isSelfContained: true,
      hasCompound: true,
      hasParking: true,
      hasSecurity: true,
      hasWater: true,
      hasElectricity: true,
      hasGarden: true,
      hasSecurityGuard: true,
      isGatedCommunity: true,
      isVerified: true,
      userId: landlords[1].id,
    },
    {
      title: "Single Room in Mengo",
      description:
        "Affordable single room in Mengo. Close to Mengo market and Namirembe road. Shared bathroom. Water included in rent. Perfect for students or young professionals starting out.",
      propertyType: "single_room",
      bedrooms: 0,
      bathrooms: 0,
      rent: 150000,
      deposit: 150000,
      district: "Kampala",
      neighborhood: "Mengo",
      city: "Kampala",
      hasWater: true,
      hasElectricity: true,
      isVerified: true,
      userId: landlords[2].id,
    },
    {
      title: "Studio Apartment in Kololo",
      description:
        "Modern studio apartment in Kololo. Fully furnished with contemporary furniture. Includes air conditioning, WiFi, and parking. Perfect for diplomats and business professionals. Close to Kololo Airstrip and restaurants.",
      propertyType: "studio",
      bedrooms: 0,
      bathrooms: 1,
      rent: 1200000,
      deposit: 1200000,
      district: "Kampala",
      neighborhood: "Kololo",
      city: "Kampala",
      isFurnished: true,
      isSelfContained: true,
      hasParking: true,
      hasSecurity: true,
      hasAirConditioning: true,
      hasInternet: true,
      hasWater: true,
      hasElectricity: true,
      isVerified: true,
      userId: landlords[3].id,
    },
    {
      title: "2 Bedroom House in Wakiso",
      description:
        "Newly built 2 bedroom house in Wakiso town. Quiet residential area with friendly neighbors. Good road access. Near schools and health center. Great value for money.",
      propertyType: "2_bedroom",
      bedrooms: 2,
      bathrooms: 1,
      rent: 500000,
      deposit: 500000,
      district: "Wakiso",
      neighborhood: "Wakiso Town",
      city: "Wakiso",
      hasCompound: true,
      hasWater: true,
      hasElectricity: true,
      hasParking: true,
      isVerified: true,
      userId: landlords[0].id,
    },
    {
      title: "4 Bedroom Villa in Munyonyo",
      description:
        "Luxurious 4 bedroom villa in Munyonyo with lake views. Features include swimming pool, gym, servant quarters, and large garden. 24/7 security with CCTV. Perfect for families who want premium living.",
      propertyType: "villa",
      bedrooms: 4,
      bathrooms: 4,
      rent: 5000000,
      deposit: 10000000,
      agencyFee: 2000000,
      district: "Kampala",
      neighborhood: "Munyonyo",
      city: "Kampala",
      isSelfContained: true,
      hasCompound: true,
      hasBalcony: true,
      hasGarden: true,
      hasParking: true,
      hasSecurity: true,
      hasWater: true,
      hasElectricity: true,
      hasGenerator: true,
      hasSecurityGuard: true,
      isGatedCommunity: true,
      isVerified: true,
      userId: landlords[1].id,
    },
    {
      title: "Bedsitter in Mukono",
      description:
        "Affordable bedsitter in Mukono near the main market. Close to Mukono University. Shared facilities. Reliable water supply. Good for students and workers in Mukono.",
      propertyType: "bedsitter",
      bedrooms: 0,
      bathrooms: 1,
      rent: 200000,
      deposit: 200000,
      district: "Mukono",
      neighborhood: "Mukono Town",
      city: "Mukono",
      isSelfContained: true,
      hasWater: true,
      hasElectricity: true,
      userId: landlords[2].id,
    },
    {
      title: "Townhouse in Entebbe",
      description:
        "Elegant townhouse in Entebbe with beautiful garden views. 3 bedrooms, modern kitchen, and spacious living area. Near Entebbe Road and beaches. Perfect for families wanting a peaceful suburban lifestyle.",
      propertyType: "townhouse",
      bedrooms: 3,
      bathrooms: 2,
      rent: 1800000,
      deposit: 3000000,
      district: "Entebbe",
      neighborhood: "Kitooro",
      city: "Entebbe",
      isSelfContained: true,
      hasCompound: true,
      hasGarden: true,
      hasParking: true,
      hasSecurity: true,
      hasWater: true,
      hasElectricity: true,
      isVerified: true,
      userId: landlords[3].id,
    },
    {
      title: "1 Bedroom Apartment in Jinja",
      description:
        "Modern 1 bedroom apartment in Jinja town. Close to the Source of the Nile. Features modern finishes, good water supply, and reliable electricity. Great for young professionals working in Jinja.",
      propertyType: "1_bedroom",
      bedrooms: 1,
      bathrooms: 1,
      rent: 350000,
      deposit: 350000,
      district: "Jinja",
      neighborhood: "Jinja Town",
      city: "Jinja",
      isSelfContained: true,
      hasWater: true,
      hasElectricity: true,
      hasInternet: true,
      isVerified: true,
      userId: landlords[4].id,
    },
    {
      title: "Room & Self-Contained in Wandegeya",
      description:
        "Room and self-contained in Wandegeya. Ideal for university students (near Makerere University). Quiet environment with good security. Shared compound. Water and electricity included.",
      propertyType: "room_self_contained",
      bedrooms: 1,
      bathrooms: 1,
      rent: 250000,
      deposit: 250000,
      district: "Kampala",
      neighborhood: "Wandegeya",
      city: "Kampala",
      isSelfContained: true,
      hasWater: true,
      hasElectricity: true,
      isVerified: true,
      userId: landlords[2].id,
    },
    {
      title: "3 Bedroom Apartment in Mbarara",
      description:
        "Spacious 3 bedroom apartment in Mbarara town. Close to Mbarara University and Mbarara Regional Referral Hospital. Modern finishes with large rooms. Good for families and professionals.",
      propertyType: "apartment",
      bedrooms: 3,
      bathrooms: 2,
      rent: 700000,
      deposit: 700000,
      district: "Mbarara",
      neighborhood: "Mbarara Town",
      city: "Mbarara",
      isSelfContained: true,
      hasParking: true,
      hasWater: true,
      hasElectricity: true,
      hasInternet: true,
      isVerified: true,
      userId: landlords[4].id,
    },
    {
      title: "4+ Bedroom House in Najjera",
      description:
        "Large 5 bedroom house in Najjera with spacious compound. Features include servant quarters, double garage, modern kitchen, and backup generator. Perfect for large families. Close to Kampala via Najjera-Kira road.",
      propertyType: "4_plus_bedroom",
      bedrooms: 5,
      bathrooms: 4,
      rent: 3500000,
      deposit: 7000000,
      agencyFee: 1500000,
      district: "Wakiso",
      neighborhood: "Najjera",
      city: "Wakiso",
      isSelfContained: true,
      hasCompound: true,
      hasGarden: true,
      hasParking: true,
      hasSecurity: true,
      hasWater: true,
      hasElectricity: true,
      hasGenerator: true,
      hasSecurityGuard: true,
      isVerified: true,
      userId: landlords[0].id,
    },
    {
      title: "Hostel Room Near Makerere",
      description:
        "Student hostel room near Makerere University Main Gate. Shared bathroom and kitchen. Secure with 24/7 security guard. Close to shops and transport. Affordable for students.",
      propertyType: "hostel",
      bedrooms: 0,
      bathrooms: 0,
      rent: 100000,
      deposit: 100000,
      district: "Kampala",
      neighborhood: "Makerere",
      city: "Kampala",
      hasWater: true,
      hasElectricity: true,
      hasSecurity: true,
      userId: landlords[4].id,
    },
    {
      title: "Duplex in Muyenga",
      description:
        "Stunning duplex in Muyenga with panoramic views of Kampala. 4 bedrooms, 3 bathrooms, private garden, and dedicated parking. Premium finishes throughout. Security estate with 24/7 guards.",
      propertyType: "duplex",
      bedrooms: 4,
      bathrooms: 3,
      rent: 4000000,
      deposit: 8000000,
      district: "Kampala",
      neighborhood: "Muyenga",
      city: "Kampala",
      isSelfContained: true,
      hasCompound: true,
      hasBalcony: true,
      hasGarden: true,
      hasParking: true,
      hasSecurity: true,
      hasWater: true,
      hasElectricity: true,
      hasAirConditioning: true,
      hasSecurityGuard: true,
      isGatedCommunity: true,
      isVerified: true,
      userId: landlords[1].id,
    },
    {
      title: "Flat in Kabalagala",
      description:
        "Furnished 1 bedroom flat in Kabalagala. Walking distance to restaurants, bars, and shops. Modern kitchen with appliances. Ideal for young professionals who want to be close to the action.",
      propertyType: "flat",
      bedrooms: 1,
      bathrooms: 1,
      rent: 600000,
      deposit: 600000,
      district: "Kampala",
      neighborhood: "Kabalagala",
      city: "Kampala",
      isFurnished: true,
      isSelfContained: true,
      hasWater: true,
      hasElectricity: true,
      hasInternet: true,
      isVerified: true,
      userId: landlords[3].id,
    },
  ];

  for (let i = 0; i < properties.length; i++) {
    const p = properties[i];
    const slug =
      p.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .slice(0, 50) +
      "-" +
      (i + 1);

    await prisma.property.create({
      data: {
        ...p,
        slug,
        status: "ACTIVE",
        viewCount: Math.floor(Math.random() * 500) + 10,
        saveCount: Math.floor(Math.random() * 50) + 1,
        images: {
          create: [
            {
              url: `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop`,
              alt: p.title,
              isCover: true,
              order: 0,
            },
          ],
        },
      },
    });
  }

  console.log("✅ Seed data created successfully!");
  console.log(`   - ${landlords.length} landlords`);
  console.log(`   - ${tenants.length} tenants`);
  console.log(`   - ${properties.length} properties`);
  console.log(`   - ${amenities.length} amenities`);
  console.log(`   - 1 admin`);
  console.log("\n📧 Demo login: admin@rentme.ug / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
