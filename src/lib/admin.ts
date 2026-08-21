import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export interface AdminSessionUser {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
}

/** Server-side ADMIN gate for API routes. */
export async function requireAdmin(): Promise<
  | { ok: true; user: AdminSessionUser }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email,
    },
  };
}

export const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatar: true,
  phoneVerified: true,
  emailVerified: true,
  createdAt: true,
  lastLoginAt: true,
} as const;
