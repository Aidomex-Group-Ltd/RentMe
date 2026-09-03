"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Building2,
  ChevronDown,
  Search,
  Crown,
  LayoutDashboard,
  Building,
  CreditCard,
  Wrench,
  BarChart3,
  Key,
  Home,
  Wallet,
  FileText,
  ShieldCheck,
  Briefcase,
  Tags,
  Users,
  CalendarDays,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Shuffle,
} from "lucide-react";

/**
 * Unified multi-role navigation (landing-page showcase).
 *
 * Mirrors the in-app dashboards: one dark rail covering Public Search,
 * Landlord, Tenant, and Agent workspaces. A role selector narrows the
 * view; "All Roles" shows everything. Guests who pick a protected
 * section flow through contextual login and land back after signing in.
 */

type RoleFilter = "ALL" | "LANDLORD" | "TENANT" | "AGENT";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: "ALL", label: "Active: All Roles" },
  { value: "LANDLORD", label: "Active: Landlord" },
  { value: "TENANT", label: "Active: Tenant" },
  { value: "AGENT", label: "Active: Agent" },
];

const PUBLIC_ITEM: NavItem = {
  label: "Public Search",
  href: "/search",
  icon: Search,
};

const GROUPS: Array<{
  role: Exclude<RoleFilter, "ALL">;
  title: string;
  titleIcon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}> = [
  {
    role: "LANDLORD",
    title: "Landlord Controls",
    titleIcon: Crown,
    items: [
      { label: "Overview", href: "/dashboard/landlord", icon: LayoutDashboard },
      { label: "My Properties", href: "/dashboard/landlord/properties", icon: Building },
      { label: "Rent Collections", href: "/dashboard/landlord/rent", icon: CreditCard },
      { label: "Maintenance", href: "/dashboard/landlord/maintenance", icon: Wrench, badge: 2 },
      { label: "Financial Reports", href: "/dashboard/landlord/reports", icon: BarChart3 },
    ],
  },
  {
    role: "TENANT",
    title: "Tenant Controls",
    titleIcon: Key,
    items: [
      { label: "My Tenancy", href: "/dashboard/tenant/tenancy", icon: Home },
      { label: "Payments & Receipts", href: "/dashboard/tenant/payments", icon: Wallet },
      { label: "Applications", href: "/dashboard/tenant/applications", icon: FileText },
      { label: "Lease Agreement", href: "/dashboard/tenant/lease", icon: ShieldCheck },
    ],
  },
  {
    role: "AGENT",
    title: "Agent Controls",
    titleIcon: Briefcase,
    items: [
      { label: "Assigned Listings", href: "/dashboard/agent", icon: Tags },
      { label: "Tenant Leads", href: "/dashboard/agent", icon: Users, badge: 5 },
      { label: "Showing Schedule", href: "/dashboard/agent", icon: CalendarDays },
      { label: "Commissions", href: "/dashboard/agent", icon: DollarSign },
    ],
  },
];

const FOOTER_ITEMS: NavItem[] = [
  { label: "Messages", href: "/messages", icon: MessageSquare, badge: 3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function UnifiedSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [roleOpen, setRoleOpen] = useState(false);

  const groups = role === "ALL" ? GROUPS : GROUPS.filter((g) => g.role === role);

  const linkClass = (href: string) => {
    const active =
      href === "/search"
        ? pathname === "/search"
        : pathname.startsWith(href) && href !== "/dashboard/agent";
    return active
      ? "flex items-center gap-2.5 rounded-lg bg-teal-600/90 px-3 py-2 text-sm font-medium text-white shadow"
      : "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white";
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-slate-800">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">Modern Properties</p>
          <p className="text-[10px] text-slate-400">Your Sure Property Solution</p>
        </div>
      </div>

      {/* Role selector */}
      <div className="relative border-b border-slate-800 px-3 py-3">
        <button
          onClick={() => setRoleOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          aria-expanded={roleOpen}
        >
          <span className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-teal-400" />
            {ROLE_OPTIONS.find((r) => r.value === role)?.label}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${roleOpen ? "rotate-180" : ""}`}
          />
        </button>
        {roleOpen && (
          <div className="absolute left-3 right-3 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setRole(opt.value);
                  setRoleOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm transition ${
                  role === opt.value
                    ? "bg-teal-600/80 text-white"
                    : "text-slate-300 hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {/* Public search — highlighted special item */}
        <Link href={PUBLIC_ITEM.href} className={linkClass(PUBLIC_ITEM.href)}>
          <Search className="h-4 w-4" />
          <span className="flex-1">{PUBLIC_ITEM.label}</span>
          <span className="rounded-full bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-300">
            Free
          </span>
        </Link>

        {groups.map((group) => {
          const TitleIcon = group.titleIcon;
          return (
            <div key={group.role}>
              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <TitleIcon className="h-3 w-3 text-amber-400/80" />
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label + item.href} href={item.href} className={linkClass(item.href)}>
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-slate-800 px-3 py-3">
        {FOOTER_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className={linkClass(item.href)}>
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        {session?.user ? (
          <button
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        ) : (
          <Link
            href="/login?callbackUrl=%2Fsearch"
            className="flex w-full items-center gap-2.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-500"
          >
            <LogOut className="h-4 w-4" /> Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
