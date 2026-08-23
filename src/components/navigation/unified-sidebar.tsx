"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Receipt,
  Wrench,
  BarChart3,
  Key,
  CreditCard,
  FileText,
  MessageSquare,
  ClipboardList,
  Tag,
  Briefcase,
  X,
} from "lucide-react";

/**
 * Unified multi-role navigation rail.
 *
 * Desktop (≥lg): pinned to the viewport — fixed top-0 left-0 h-screen w-64 —
 * so it never hangs, floats, or scrolls away; page content offsets itself
 * with lg:pl-64.
 *
 * Mobile (<lg): off-canvas drawer controlled by the header hamburger
 * (isOpen/onClose) with a dark backdrop overlay.
 */

type UserRole = "LANDLORD" | "TENANT" | "AGENT";

interface UnifiedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAVIGATION_BY_ROLE: Record<
  UserRole,
  Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }>
> = {
  LANDLORD: [
    { href: "/dashboard/landlord", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { href: "/dashboard/landlord/properties", label: "My Properties", icon: <Building2 size={18} /> },
    { href: "/dashboard/landlord/applications", label: "Applications", icon: <ClipboardList size={18} /> },
    { href: "/dashboard/landlord/rent", label: "Rent Collections", icon: <Receipt size={18} /> },
    { href: "/dashboard/landlord/maintenance", label: "Maintenance Requests", icon: <Wrench size={18} />, badge: "2" },
    { href: "/dashboard/landlord/reports", label: "Financial Reports", icon: <BarChart3 size={18} /> },
  ],
  TENANT: [
    { href: "/dashboard/tenant", label: "My Tenancy", icon: <Key size={18} /> },
    { href: "/dashboard/tenant/payments", label: "Rent & Payments", icon: <CreditCard size={18} /> },
    { href: "/dashboard/tenant/applications", label: "My Applications", icon: <FileText size={18} /> },
    { href: "/dashboard/tenant/maintenance", label: "Report Issue", icon: <Wrench size={18} /> },
    { href: "/dashboard/tenant/documents", label: "Lease Agreement", icon: <ShieldCheck size={18} /> },
  ],
  AGENT: [
    { href: "/dashboard/agent", label: "Agent Workspace", icon: <Briefcase size={18} /> },
    { href: "/dashboard/landlord/properties", label: "Assigned Listings", icon: <Tag size={18} /> },
    { href: "/dashboard/tenant/applications", label: "Tenant Leads", icon: <ClipboardList size={18} />, badge: "5" },
    { href: "/dashboard/landlord/reports", label: "Commissions", icon: <Receipt size={18} /> },
  ],
};

export default function UnifiedSidebar({ isOpen, onClose }: UnifiedSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [activeRole, setActiveRole] = useState<UserRole>("LANDLORD");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          aria-hidden
        />
      )}

      {/* Anchored sidebar shell */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col justify-between overflow-y-auto border-r border-slate-800 bg-slate-900 p-4 text-slate-200 transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-5">
          {/* Brand + mobile close */}
          <div className="flex items-center justify-between px-1 pt-1">
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 font-bold text-xl text-white shadow-md">
                R
              </div>
              <div>
                <h2 className="text-base font-bold leading-none text-white">
                  RentMe TMS
                </h2>
                <span className="text-[10px] font-medium tracking-wide text-teal-400">
                  Unified Platform
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="p-1 text-slate-400 hover:text-white lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Active workspace switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen((v) => !v)}
              aria-expanded={roleMenuOpen}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/80 p-2.5 text-left transition hover:bg-slate-800"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Workspace
                </p>
                <p className="text-sm font-semibold capitalize text-white">
                  {activeRole.toLowerCase()} Mode
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {roleMenuOpen && (
              <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                {(Object.keys(NAVIGATION_BY_ROLE) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setActiveRole(role);
                      setRoleMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition ${
                      activeRole === role
                        ? "bg-slate-700/50 text-teal-400"
                        : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="capitalize">{role.toLowerCase()} View</span>
                    {activeRole === role && (
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Public discovery — open to everyone */}
          <div className="px-1">
            <Link
              href="/search"
              onClick={onClose}
              className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs font-medium transition ${
                pathname === "/search"
                  ? "border-teal-500 bg-teal-600/70 text-white"
                  : "border-teal-700/50 bg-teal-900/40 text-teal-200 hover:bg-teal-900/70"
              }`}
            >
              <Search size={15} />
              <span>Public Property Search</span>
            </Link>
          </div>

          {/* Role navigation */}
          <div className="space-y-1">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {activeRole} Controls
            </p>
            {NAVIGATION_BY_ROLE[activeRole].map((item) => {
              const isActive =
                item.href === "/dashboard/agent"
                  ? pathname.startsWith("/dashboard/agent")
                  : pathname === item.href;
              return (
                <Link
                  key={`${activeRole}-${item.href}-${item.label}`}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom options */}
        <div className="space-y-1 border-t border-slate-800 pt-4">
          <Link
            href="/messages"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <MessageSquare size={18} />
            Messages
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Settings size={18} />
            Settings
          </Link>
          {session?.user ? (
            <button
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-500"
            >
              <LogOut size={18} />
              Sign In
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
