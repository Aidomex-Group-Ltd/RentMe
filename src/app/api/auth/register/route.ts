import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { formatPhoneNumber, isValidUgandanPhone } from "@/lib/utils";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters"),
  email: z.preprocess(
    (value) => {
      if (value == null) return undefined;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed.toLowerCase();
    },
    z.string().email("Invalid email address").optional()
  ),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .transform((value) => formatPhoneNumber(value))
    .refine(isValidUgandanPhone, {
      message: "Enter a valid Ugandan phone number (e.g. 0700 000 000)",
    }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.preprocess(
    (value) => {
      if (value == null || value === "") return "TENANT";
      if (typeof value === "string") return value.trim().toUpperCase();
      return value;
    },
    z.enum(["TENANT", "LANDLORD", "AGENT"], {
      errorMap: () => ({ message: "Invalid account type" }),
    })
  ),
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

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("Registration error: DATABASE_URL is not configured");
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATABASE_NOT_CONFIGURED",
            message:
              "Database is not configured. Set DATABASE_URL in your Vercel project environment variables.",
          },
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const normalizedPhone = validatedData.phone;
    const normalizedEmail = validatedData.email;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          { phone: normalizedPhone },
        ],
      },
    });

    if (existingUser) {
      const matchedField =
        normalizedEmail && existingUser.email === normalizedEmail
          ? "email"
          : "phone";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_EXISTS",
            message: `An account with this ${matchedField} already exists. Please sign in instead.`,
          },
        },
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
      const fields = zodFieldErrors(error);
      const firstMessage =
        Object.values(fields)[0] || "Please check your details and try again.";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: firstMessage,
            fields,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ACCOUNT_EXISTS",
              message:
                "An account with this email or phone already exists. Please sign in instead.",
            },
          },
          { status: 409 }
        );
      }

      if (error.code === "P2021" || error.code === "P2010") {
        console.error("Registration error: database schema missing", error);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SCHEMA_MISSING",
              message:
                "Database tables are missing. Redeploy after configuring DATABASE_URL so Prisma can sync the schema.",
            },
          },
          { status: 503 }
        );
      }
    }

    if (isDatabaseUnavailable(error)) {
      console.error("Registration error: database unavailable", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATABASE_UNAVAILABLE",
            message:
              "Cannot connect to the database. Check DATABASE_URL in Vercel environment variables.",
          },
        },
        { status: 503 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
