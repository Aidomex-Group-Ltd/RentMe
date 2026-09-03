"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Bell, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export default function PlatformChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* ── Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
        <nav className="page-container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/icons/rentmesh-192.png"
              alt="Modern Properties"
              className="h-9 w-9 rounded-xl object-contain"
              width={36}
              height={36}
            />
            <span className="text-xl font-bold text-slate-900 font-display">
              Modern <span className="text-brand-500">Properties</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Global search (desktop) */}
            <form
              action="/search"
              method="GET"
              className="relative hidden max-w-xs lg:block"
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
                placeholder="Search property, land, vehicles and services…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </form>

            {session?.user ? (
              <>
                <Link
                  href="/dashboard/tenant/notices"
                  aria-label="Notifications"
                  className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <Bell size={18} />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                </Link>

                <div className="h-5 w-px bg-slate-200" />

                <Link href="/profile" className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                    {(session.user.name || "U").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-semibold leading-none text-slate-900">
                      {session.user.name}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-brand-500">
                      {session.user.role} Account
                    </p>
                  </div>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="btn-primary hidden sm:inline-flex"
                >
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <div className="page-container space-y-1 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t border-slate-100" />
              {!session?.user && (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary mt-2 w-full"
                  >
                    Get started
                  </Link>
                </>
              )}
              {session?.user && (
                <Link
                  href="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary mt-2 w-full"
                >
                  Search properties
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Canvas ─────────────────────────────────── */}
      <main className="mx-auto w-full flex-1">{children}</main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="page-container py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <img
                  src="/icons/rentmesh-192.png"
                  alt="Modern Properties"
                  className="h-8 w-8 rounded-lg object-contain"
                  width={32}
                  height={32}
                />
                <span className="text-lg font-bold text-slate-900 font-display">
                  Modern <span className="text-brand-500">Properties</span>
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
                Your Sure Property Solution. Discover property, land, vehicles,
                products and services across Uganda.
              </p>
            </div>

            {/* Explore */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Explore
              </h3>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Search Listings", href: "/search" },
                  { label: "Land & Plots", href: "/search?category=land" },
                  { label: "Vehicles", href: "/search?category=vehicle" },
                  { label: "Services", href: "/search?category=service" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Categories
              </h3>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "Residential", href: "/search?category=residential" },
                  { label: "Commercial", href: "/search?category=commercial" },
                  { label: "Vehicles", href: "/search?category=vehicle" },
                  { label: "Products", href: "/search?category=product" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Company</h3>
              <ul className="mt-3 space-y-2">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Contact", href: "/contact" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Safety Tips", href: "/safety" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Modern Properties Uganda. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <a
                href="tel:+256700000000"
                className="transition-colors hover:text-brand-600"
              >
                +256 700 000 000
              </a>
              <a
                href="mailto:hello@rentme.rest"
                className="transition-colors hover:text-brand-600"
              >
                hello@rentme.rest
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
