"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Bell, Menu } from "lucide-react";
import UnifiedSidebar from "@/components/navigation/unified-sidebar";

/**
 * Platform chrome for the public landing experience:
 * - Desktop: sidebar pinned fixed top-left (h-screen, w-64); canvas shifts
 *   with lg:pl-64 so nothing hides behind or hangs beside the rail.
 * - Mobile: rail becomes an off-canvas drawer opened by the header
 *   hamburger; a dark backdrop closes it.
 */
export default function PlatformChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <UnifiedSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Sticky header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex max-w-lg flex-1 items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <Menu size={22} />
            </button>

            {/* Global search → /search */}
            <form
              action="/search"
              method="GET"
              className="relative w-full"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get("q");
                router.push(`/search${q ? `?q=${encodeURIComponent(String(q))}` : ""}`);
              }}
            >
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="q"
                placeholder="Search properties, units, tenants…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </form>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard/tenant/notices"
              aria-label="Notifications"
              className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
            >
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </Link>

            <div className="h-6 w-px bg-slate-200" />

            {session?.user ? (
              <Link href="/profile" className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {(session.user.name || "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold leading-none text-slate-900">
                    {session.user.name}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-teal-600">
                    {session.user.role} Account
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="hidden rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 sm:block"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Workspace / marketing canvas */}
        <main className="mx-auto w-full max-w-7xl flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
          RentMe TMS — Unified Property Discovery & Management · Uganda
        </footer>
      </div>
    </div>
  );
}
