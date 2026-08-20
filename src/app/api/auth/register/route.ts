import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().email("Invalid email address").optional()
  ),
  phone: z.string().min(10, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["TENANT", "LANDLORD", "AGENT"]).default("TENANT"),
});

function isDatabaseUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("environment variable not found: database_url") ||
    message.includes("can't reach database server") ||
    message.includes("connection refused") ||
    message.includes("p1001") ||
    message.includes("p1000")
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("Registration error: DATABASE_URL is not configured");
      return NextResponse.json(
        {
          error:
            "Database is not configured. Set DATABASE_URL in your Vercel project environment variables.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const normalizedPhone = formatPhoneNumber(validatedData.phone);
    const normalizedEmail = validatedData.email?.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          { phone: normalizedPhone },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email or phone already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        role: validatedData.role,
        profile: {
          create: {
            preferredLocations: [],
            preferredAmenities: [],
          },
        },
        ...(validatedData.role === "TENANT" && {
          tenant: { create: {} },
        }),
        ...(validatedData.role === "LANDLORD" && {
          landlord: { create: {} },
        }),
        ...(validatedData.role === "AGENT" && {
          agent: { create: {} },
        }),
        notificationsPrefs: {
          create: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "An account with this email or phone already exists" },
          { status: 409 }
        );
      }

      if (error.code === "P2021" || error.code === "P2010") {
        console.error("Registration error: database schema missing", error);
        return NextResponse.json(
          {
            error:
              "Database tables are missing. Redeploy after configuring DATABASE_URL so Prisma can sync the schema.",
          },
          { status: 503 }
        );
      }
    }

    if (isDatabaseUnavailable(error)) {
      console.error("Registration error: database unavailable", error);
      return NextResponse.json(
        {
          error:
            "Cannot connect to the database. Check DATABASE_URL in Vercel environment variables.",
        },
        { status: 503 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
