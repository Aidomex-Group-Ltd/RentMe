import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hour

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET (or JWT_SECRET) is required for password reset");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Create a signed, time-limited password-reset token (no DB storage). */
export function createPasswordResetToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${userId}.${exp}.${nonce}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

/** Verify token; returns userId or null if invalid/expired. */
export function verifyPasswordResetToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) return null;

    const [userId, expStr, nonce, sig] = parts;
    if (!userId || !expStr || !nonce || !sig) return null;

    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;

    const payload = `${userId}.${expStr}.${nonce}`;
    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return { userId };
  } catch {
    return null;
  }
}

export function siteBaseUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return raw.replace(/\/$/, "");
}
