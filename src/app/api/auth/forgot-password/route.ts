import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/sanitize";
import {
  createPasswordResetToken,
  siteBaseUrl,
} from "@/lib/password-reset";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

function requestBaseUrl(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return siteBaseUrl();
}

/**
 * Always returns a generic success message to avoid account enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database is not configured." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { email } = schema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, passwordHash: true },
    });

    if (user?.email && user.passwordHash) {
      const token = createPasswordResetToken(user.id);
      const resetUrl = `${requestBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;

      const safeName = escapeHtml(user.name || "there");
      const safeUrl = escapeHtml(resetUrl);
      await sendEmail({
        to: user.email,
        subject: "Reset your Rent Mesh password",
        text: `Hi ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>Hi ${safeName},</p><p>Reset your password using this link (valid for 1 hour):</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
      });
    }

    return NextResponse.json({
      message:
        "If an account exists for that email, we sent password reset instructions.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
