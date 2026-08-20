/**
 * Normalize auth-related env vars for Vercel.
 * NEXTAUTH_URL is required for stable cookies/CSRF; fall back to the public site URL.
 */
export function ensureAuthEnv(): void {
  if (!process.env.NEXTAUTH_URL) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
    if (siteUrl) {
      process.env.NEXTAUTH_URL = siteUrl.replace(/\/$/, "");
    }
  }

  if (!process.env.NEXTAUTH_SECRET && process.env.JWT_SECRET) {
    process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET;
  }
}
