"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Heart,
  MessageSquare,
  User,
  Home,
  Menu,
  X,
  LogOut,
  Settings,
  LayoutDashboard,
  ChevronDown,
  Shield,
} from "lucide-react";
import { cn, getInitials, dashboardPathForRole } from "@/lib/utils";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/saved", label: "Saved", icon: Heart },
    { href: "/messages", label: "Messages", icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="page-container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-brand-700 font-display">
            RentMe
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
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
              <Link href="/dashboard/landlord" className="hidden btn-primary text-sm md:flex">
                List Property
              </Link>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-50"
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
                  <ChevronDown className="hidden h-4 w-4 text-gray-500 sm:block" />
                </button>

                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.user.email || session.user.phone}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                          {session.user.role}
                        </span>
                      </div>

                      <Link
                        href={dashboardPathForRole(session.user.role)}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>

                      {session.user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      )}

                      <div className="my-1 border-t border-gray-100" />

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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-50 md:hidden"
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
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="page-container space-y-1 py-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-600"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

            {session?.user && (
              <Link
                href="/dashboard/landlord"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                <Home className="h-5 w-5" />
                List Property
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
