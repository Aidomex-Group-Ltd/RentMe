/**
 * Centralized role configuration for the role-aware dashboard.
 *
 * The authenticated user's trusted internal role (tenant/landlord/agent) is
 * resolved server-side. UI presentation uses `roleLabels` from ./brand so that
 * tenant → Client, landlord → Owner, agent → Agent.
 *
 * Server-side authorization (src/lib/rbac.ts) remains the source of truth.
 * Client-side menu configuration here is only for navigation presentation.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  CreditCard,
  Wrench,
  FileText,
  Users,
  Key,
  BarChart3,
  Search,
  Home,
  MessageSquare,
  Bell,
  Settings,
  User,
  Tag,
  Briefcase,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { roleLabels } from "@/lib/brand";

export type DisplayRole = "tenant" | "landlord" | "agent";

export interface RoleNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

/**
 * Internal role → dashboard path helpers for the shared shell.
 * Preserves the existing route structure (no role value changes).
 */
export function dashboardPathForInternalRole(role?: string | null): string {
  switch ((role || "").toLowerCase()) {
    case "landlord":
      return "/dashboard/landlord";
    case "agent":
      return "/dashboard/agent";
    case "tenant":
    default:
      return "/dashboard/tenant";
  }
}

/**
 * User-facing label for a role. Falls back to the raw value (capitalized)
 * when unknown so no UI ever renders a raw internal enum by accident.
 */
export function displayRoleLabel(role?: string | null): string {
  if (!role) return "";
  return roleLabels[role] ?? roleLabels[role.toLowerCase()] ?? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

/**
 * A short account descriptor, e.g. "Client account".
 */
export function roleAccountLabel(role?: string | null): string {
  const label = displayRoleLabel(role);
  return label ? `${label} account` : "Account";
}

/**
 * Role-aware navigation for the shared dashboard shell.
 * Only one role's navigation is rendered for a given authenticated user.
 */
export const ROLE_NAVIGATION: Record<DisplayRole, RoleNavItem[]> = {
  landlord: [
    { href: "/dashboard/landlord", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/landlord/create", label: "Create Listing", icon: Home },
    { href: "/dashboard/landlord/properties", label: "Listings & Assets", icon: Building2 },
    { href: "/dashboard/landlord/units", label: "Units & Occupancy", icon: Key },
    { href: "/dashboard/landlord/tenants", label: "Clients", icon: Users },
    { href: "/dashboard/landlord/applications", label: "Applications", icon: ClipboardList },
    { href: "/dashboard/landlord/rent", label: "Rent & Transactions", icon: CreditCard },
    { href: "/dashboard/landlord/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/dashboard/landlord/leases", label: "Leases", icon: FileText },
    { href: "/dashboard/landlord/renewals", label: "Renewals", icon: RefreshCw },
    { href: "/dashboard/landlord/reports", label: "Performance", icon: BarChart3 },
  ],
  tenant: [
    { href: "/dashboard/tenant", label: "Overview", icon: LayoutDashboard },
    { href: "/search", label: "Explore", icon: Search },
    { href: "/saved", label: "Saved Listings", icon: Tag },
    { href: "/dashboard/tenant/tenancy", label: "My Tenancy", icon: Home },
    { href: "/dashboard/tenant/applications", label: "Applications", icon: ClipboardList },
    { href: "/dashboard/tenant/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/tenant/maintenance", label: "Report Issue", icon: Wrench },
    { href: "/dashboard/tenant/lease", label: "Lease", icon: FileText },
  ],
  agent: [
    { href: "/dashboard/agent", label: "Agent Workspace", icon: Briefcase },
    { href: "/dashboard/landlord/properties", label: "Assigned Listings", icon: Tag },
    { href: "/dashboard/landlord/applications", label: "Leads & Enquiries", icon: ClipboardList },
    { href: "/dashboard/landlord/rent", label: "Transactions", icon: CreditCard },
    { href: "/dashboard/landlord/reports", label: "Commissions", icon: BarChart3 },
  ],
};

/**
 * Message / notification / profile / settings links shared by all roles.
 */
export const SHARED_NAV_ITEMS: RoleNavItem[] = [
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Resolve which role navigation to show for an internal role string.
 * ADMIN, unknown and guest fall back to the tenant/client marketplace nav.
 */
export function navigationForRole(role?: string | null): RoleNavItem[] {
  switch ((role || "").toLowerCase()) {
    case "landlord":
      return ROLE_NAVIGATION.landlord;
    case "agent":
      return ROLE_NAVIGATION.agent;
    case "tenant":
    case "admin":
    default:
      return ROLE_NAVIGATION.tenant;
  }
}
