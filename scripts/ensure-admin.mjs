#!/usr/bin/env node
/**
 * Ensure a production ADMIN user exists.
 * Usage:
 *   DATABASE_URL=... node scripts/ensure-admin.mjs [email] [password]
 * Defaults: admin@rentme.ug / password123
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const email = (process.argv[2] || "admin@rentme.ug").toLowerCase();
  const password = process.argv[3] || "password123";
  const phone = process.argv[4] || "+256700000000";

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name: "Admin User",
      email,
      phone,
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      phoneVerified: true,
      profile: { create: {} },
    },
    update: {
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Admin ready:", user);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
