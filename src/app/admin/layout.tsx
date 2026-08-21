export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AdminShell from "@/components/admin/admin-layout";

/**
 * Server-side ADMIN gate for every /admin/* page.
 * Middleware also protects these routes; this layout is the authoritative
 * App Router guard so the console never renders for non-admins.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
