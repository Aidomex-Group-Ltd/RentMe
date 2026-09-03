"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Shield,
  Bell,
  Building2,
  Key,
  ScrollText,
  ClipboardList,
  DollarSign,
  Wrench,
  FileText,
} from "lucide-react";
import { cn, getInitials, dashboardPathForRole } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { displayRoleLabel, roleAccountLabel } from "@/lib/roles";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen && mobilePanelRef.current) {
      mobilePanelRef.current.focus();
    }
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    ...(session?.user
      ? [
          { href: "/saved", label: "Saved", icon: Heart },
          { href: "/messages", label: "Messages", icon: MessageSquare },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <nav className="page-container flex h-16 items-center justify-between">
        {/* Logo */}          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/icons/rentmesh-192.png"
              alt="Erikot Properties"
              className="h-9 w-9 rounded-xl object-contain"
              width={36}
              height={36}
            />
            <span className="text-xl font-bold text-slate-900 font-display">
              Erikot <span className="text-brand-500">Properties</span>
            </span>
          </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              {session.user.role === "TENANT" ? (
                <Link href="/search" className="hidden btn-primary text-sm md:flex">
                  Explore Listings
                </Link>
              ) : (
                <Link href="/dashboard/landlord/create" className="hidden btn-primary text-sm md:flex">
                  List Listing
                </Link>
              )}

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-semibold">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      getInitials(session.user.name || "U")
                    )}
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
                </button>

                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {session.user.email || session.user.phone}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                          {roleAccountLabel(session.user.role)}
                        </span>
                      </div>

                      <Link
                        href={dashboardPathForRole(session.user.role)}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>

                      {session.user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      )}

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="btn-secondary text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="btn-primary text-sm hidden sm:flex"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            ref={hamburgerRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobilePanelRef}
          tabIndex={-1}
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-slate-100 bg-white md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
        >
          <div className="page-container space-y-1 py-3">
            {session?.user && (
              <div className="mb-1 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-medium text-slate-600">
                  {roleAccountLabel(session.user.role)}
                </p>
                <span className="text-xs font-semibold text-brand-600">
                  {displayRoleLabel(session.user.role)}
                </span>
              </div>
            )}

            {(!session?.user || session.user.role !== "TENANT") && navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

            {session?.user && session.user.role === "TENANT" && (
              <>
                {[
                  { href: "/dashboard/tenant", label: "Overview", icon: LayoutDashboard },
                  { href: "/dashboard/tenant/tenancy", label: "My Home", icon: Building2 },
                  { href: "/dashboard/tenant/move-in", label: "Move In", icon: Key },
                  { href: "/dashboard/tenant/lease", label: "Lease", icon: ScrollText },
                  { href: "/dashboard/tenant/applications", label: "Applications", icon: ClipboardList },
                  { href: "/dashboard/tenant/payments", label: "Payments", icon: DollarSign },
                  { href: "/dashboard/tenant/maintenance", label: "Maintenance", icon: Wrench },
                  { href: "/dashboard/tenant/notices", label: "Notices", icon: Bell },
                  { href: "/dashboard/tenant/documents", label: "Documents", icon: FileText },
                  { href: "/dashboard/tenant/move-out", label: "Move Out", icon: LogOut },
                  { href: "/dashboard/tenant/profile", label: "Profile", icon: User },
                ].map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-600"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/messages"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Bell className="h-5 w-5" />
                  Notifications
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </>
            )}

            {session?.user && session.user.role !== "TENANT" && (
              <>
                <Link
                  href={dashboardPathForRole(session.user.role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <MessageSquare className="h-5 w-5" />
                  Messages
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Bell className="h-5 w-5" />
                  Notifications
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <User className="h-5 w-5" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </>
            )}

            {!session?.user && (
              <div className="space-y-1 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-600"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
