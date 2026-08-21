import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { cacheAuthUser, invalidateAuthUserCache } from "@/lib/cache";
import { ensureAuthEnv } from "@/lib/env";
import { formatPhoneNumber } from "@/lib/utils";

ensureAuthEnv();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null;

        const email = credentials.email?.trim().toLowerCase() || undefined;
        const phoneInput = credentials.phone?.trim() || undefined;
        const phone = phoneInput ? formatPhoneNumber(phoneInput) : undefined;

        if (!email && !phone) return null;

        try {
          if (!process.env.DATABASE_URL) {
            console.error("Auth error: DATABASE_URL is not configured");
            return null;
          }

          // Match both normalized E.164 and common raw inputs users may have stored.
          const phoneCandidates = phoneInput
            ? Array.from(
                new Set(
                  [phone, phoneInput, formatPhoneNumber(phoneInput)].filter(
                    (value): value is string => Boolean(value)
                  )
                )
              )
            : [];

          let user = await prisma.user.findFirst({
            where: {
              OR: [
                ...(email ? [{ email }] : []),
                ...phoneCandidates.map((value) => ({ phone: value })),
              ],
              deletedAt: null,
            },
          });

          // Legacy rows may store phones with spaces/dashes; match on last 9 digits.
          if (!user && phone) {
            const last9 = phone.replace(/\D/g, "").slice(-9);
            if (last9.length === 9) {
              try {
                const rows = await prisma.$queryRaw<Array<{ id: string }>>`
                  SELECT id FROM users
                  WHERE "deletedAt" IS NULL
                    AND phone IS NOT NULL
                    AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = ${last9}
                  LIMIT 1
                `;
                if (rows[0]?.id) {
                  user = await prisma.user.findFirst({
                    where: { id: rows[0].id, deletedAt: null },
                  });
                }
              } catch (legacyPhoneError) {
                console.error("Auth legacy phone lookup error:", legacyPhoneError);
              }
            }
          }

          if (!user || !user.passwordHash) return null;
          if (user.status === "BANNED" || user.status === "SUSPENDED") return null;

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) return null;

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          invalidateAuthUserCache(user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            phone: user.phone ?? null,
            status: user.status,
            image: user.avatar,
          };
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  useSecureCookies:
    (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "").startsWith(
      "https://"
    ),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  theme: {
    colorScheme: "light",
    brandColor: "#172554",
    logo: "/icons/icon-192.png",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? token.role;
        token.phone = user.phone ?? null;
        token.status = user.status ?? token.status;
      }
      if (token.id) {
        try {
          const dbUser = await cacheAuthUser(token.id as string, () =>
            prisma.user.findUnique({
              where: { id: token.id as string },
              select: { role: true, phone: true, status: true },
            })
          );
          if (dbUser) {
            token.role = dbUser.role;
            token.phone = dbUser.phone ?? null;
            token.status = dbUser.status;
          }
        } catch (error) {
          console.error("Auth jwt refresh error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.phone = token.phone ?? null;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
};
