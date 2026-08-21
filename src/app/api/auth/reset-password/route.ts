import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyPasswordResetToken } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(10, "Invalid or expired reset link"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database is not configured." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { token, password } = schema.parse(body);

    const verified = verifyPasswordResetToken(token);
    if (!verified) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TOKEN",
            message: "This reset link is invalid or has expired. Request a new one.",
          },
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { id: true, passwordHash: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TOKEN",
            message: "This reset link is invalid or has expired. Request a new one.",
          },
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated. You can sign in now." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
