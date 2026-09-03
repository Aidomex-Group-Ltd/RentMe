"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import AdminNotifications from "./admin-notifications";
import {
  LayoutDashboard,
  Home,
  BarChart3,
  Users,
  Shield,
  MapPin,
  Settings,
  Activity,
  HeartPulse,
  AlertTriangle,
  Menu,
  X,
  LogOut,
  Search,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/properties", label: "Properties", icon: Home },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
  { href: "/admin/verification", label: "Verification", icon: Shield },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/health", label: "Health", icon: HeartPulse },
];

interface AdminShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState("");

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Route global admin search to the most likely destination
    if (/report|scam|abuse/i.test(q)) {
      window.location.href = `/admin/reports`;
      return;
    }
    if (/propert|listing|house|apartment/i.test(q)) {
      window.location.href = `/admin/properties`;
      return;
    }
    window.location.href = `/admin/users`;
  };

  const navContent = (
    <nav className="flex flex-1 flex-col px-3 py-4" aria-label="Admin">
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isActive(item.href)
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <item.icon
              className={`h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 ${
                isActive(item.href) ? "text-brand-600" : "text-gray-400"
              }`}
              aria-hidden
            />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-auto border-t border-gray-200 pt-4">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Admin
        </p>
        <p className="mt-1 truncate px-3 text-sm font-medium text-gray-800">
          {user?.name || "Administrator"}
        </p>
        <p className="truncate px-3 text-xs text-gray-500">{user?.email}</p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Mobile drawer */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4">
              <Link href="/admin" className="flex items-center gap-2 text-base font-bold text-brand-700 font-display">
                <img src="/icons/rentmesh-48.png" alt="" className="h-7 w-7 rounded-md object-contain" width={28} height={28} aria-hidden />
                Erikot Properties Admin
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-60 lg:flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <Link href="/admin" className="flex items-center gap-2 text-base font-bold text-brand-700 font-display">
            <img src="/icons/rentmesh-48.png" alt="" className="h-7 w-7 rounded-md object-contain" width={28} height={28} aria-hidden />
            Erikot Properties Admin
          </Link>
        </div>
        {navContent}
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 pl-14 sm:px-6 lg:pl-8 lg:pr-8">
            <form onSubmit={onSearch} className="relative hidden min-w-0 flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <label htmlFor="admin-global-search" className="sr-only">
                Search admin
              </label>
              <input
                id="admin-global-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, properties, reports…"
                className="w-full max-w-md rounded-md border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </form>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <AdminNotifications />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {(user?.name || "A").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-sm font-medium text-gray-900 max-w-[10rem]">
                      {user?.name || "Admin"}
                    </span>
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-brand-600">
                      {user?.role || "ADMIN"}
                    </span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" aria-hidden />
                </button>

                {accountOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      aria-label="Close account menu"
                      onClick={() => setAccountOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      <Link
                        href="/"
                        role="menuitem"
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setAccountOpen(false)}
                      >
                        Back to site
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                      >
                        <LogOut className="h-4 w-4" aria-hidden />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>
    </div>
  );
}
