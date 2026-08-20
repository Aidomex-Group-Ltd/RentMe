import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(10, "Invalid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["TENANT", "LANDLORD", "AGENT"]).default("TENANT"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const normalizedPhone = formatPhoneNumber(validatedData.phone);
    const normalizedEmail = validatedData.email?.toLowerCase();

    // Check if user exists
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
          create: {},
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
