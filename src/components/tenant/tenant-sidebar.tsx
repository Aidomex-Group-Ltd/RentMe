"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  DollarSign,
  Wrench,
  Bell,
  FileText,
  User,
  Search,
  MessageSquare,
  ChevronRight,
  ClipboardList,
  ScrollText,
  LogOut,
  Key,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navigation item configuration
 */
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
}

/**
 * Props for the TenantSidebar component
 */
interface TenantSidebarProps {
  /** Override navigation items (optional) */
  navItems?: NavItem[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default navigation items for the tenant dashboard
 */
const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/tenant",
    icon: Home,
  },
  {
    label: "My Home",
    href: "/dashboard/tenant/tenancy",
    icon: Building2,
  },
  {
    label: "Move In",
    href: "/dashboard/tenant/move-in",
    icon: Key,
  },
  {
    label: "Lease",
    href: "/dashboard/tenant/lease",
    icon: ScrollText,
  },
  {
    label: "Applications",
    href: "/dashboard/tenant/applications",
    icon: ClipboardList,
  },
  {
    label: "Payments",
    href: "/dashboard/tenant/payments",
    icon: DollarSign,
  },
  {
    label: "Maintenance",
    href: "/dashboard/tenant/maintenance",
    icon: Wrench,
  },
  {
    label: "Notices",
    href: "/dashboard/tenant/notices",
    icon: Bell,
  },
  {
    label: "Documents",
    href: "/dashboard/tenant/documents",
    icon: FileText,
  },
  {
    label: "Move Out",
    href: "/dashboard/tenant/move-out",
    icon: LogOut,
  },
  {
    label: "Profile",
    href: "/dashboard/tenant/profile",
    icon: User,
  },
];

/**
 * Additional quick action items
 */
const QUICK_ACTIONS: NavItem[] = [
  {
    label: "Explore Listings",
    href: "/search",
    icon: Search,
  },
  {
    label: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
];

/**
 * TenantSidebar - Shared navigation component for tenant dashboard pages
 *
 * Features:
 * - Desktop (md+): fixed rail anchored to the top and left viewport edges
 * - Mobile: collapsed behind a hamburger menu with an overlay drawer
 * - Active state highlighting based on current route
 * - Optional badge counts for pending items
 * - Consistent with Erikot Properties design system
 * - Mirrors LandlordSidebar architecture
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TenantSidebar />
 *
 * // With custom badges
 * <TenantSidebar
 *   navItems={DEFAULT_NAV_ITEMS.map(item => ({
 *     ...item,
 *     badge: item.href.includes("maintenance") ? 3 : undefined,
 *   }))}
 * />
 * ```
 */
export default function TenantSidebar({
  navItems = DEFAULT_NAV_ITEMS,
  className,
}: TenantSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * Check if a nav item is currently active
   */
  const isActive = (href: string): boolean => {
    if (href === "/dashboard/tenant") {
      return pathname === "/dashboard/tenant";
    }
    return pathname.startsWith(href);
  };

  const activeItem =
    [...navItems, ...QUICK_ACTIONS].find((item) => isActive(item.href)) ??
    null;

  const linkClass = (active: boolean) =>
    cn(
      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      active
        ? "bg-brand-50 text-brand-600"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    );

  const renderNavItems = (onNavigate?: () => void) =>
    navItems.map((item) => {
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={linkClass(active)}
        >
          <item.icon
            className={cn(
              "h-5 w-5 shrink-0",
              active
                ? "text-brand-600"
                : "text-gray-400 group-hover:text-gray-600"
            )}
          />
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge !== 0 && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                item.badgeColor || "bg-red-100 text-red-700"
              )}
            >
              {item.badge}
            </span>
          )}
          {active && <ChevronRight className="h-4 w-4 text-brand-400" />}
        </Link>
      );
    });

  const renderQuickActions = (onNavigate?: () => void) => (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Quick Actions
      </p>
      {QUICK_ACTIONS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <item.icon className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-brand-500" />
          <span className="flex-1">{item.label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile: hamburger trigger */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
          <span>{activeItem?.label ?? "Menu"}</span>
        </button>
      </div>

      {/* Mobile: overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4">
              <div className="flex items-center gap-2">
                <img src="/icons/rentmesh-48.png" alt="" className="h-6 w-6 rounded-md object-contain" width={24} height={24} aria-hidden />
                <span className="font-display text-base font-bold text-brand-700">
                  Erikot Properties
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {renderNavItems(() => setMobileOpen(false))}
              <div className="my-4 border-t border-gray-200" />
              {renderQuickActions(() => setMobileOpen(false))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: fixed rail anchored to the top and left edges (below global navbar) */}
      <aside
        className={cn(
          "hidden md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-64 md:flex-col md:border-r md:border-gray-200 md:bg-white",
          className
        )}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6 pt-20">
          {renderNavItems()}
          <div className="my-4 border-t border-gray-200" />
          {renderQuickActions()}
        </nav>
      </aside>
    </>
  );
}

/**
 * TenantPageLayout - Wrapper component that adds sidebar to tenant pages
 *
 * @example
 * ```tsx
 * <TenantPageLayout
 *   title="My Maintenance"
 *   description="Track your maintenance requests"
 *   navBadges={{ "/dashboard/tenant/maintenance": 2 }}
 * >
 *   <YourPageContent />
 * </TenantPageLayout>
 * ```
 */
interface TenantPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  navBadges?: Record<string, number>;
  headerActions?: React.ReactNode;
}

export function TenantPageLayout({
  children,
  title,
  description,
  navBadges,
  headerActions,
}: TenantPageLayoutProps) {
  // Merge default nav items with badges
  const navItems = DEFAULT_NAV_ITEMS.map((item) => ({
    ...item,
    badge: navBadges?.[item.href],
  }));

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
      {/* Header */}
      {(title || headerActions) && (
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900 font-display">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1 text-gray-500">{description}</p>
                )}
              </div>
              {headerActions}
            </div>

            {/* Navigation */}
            <div className="mt-6">
              <TenantSidebar navItems={navItems} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="page-container py-6">{children}</div>
    </div>
  );
}
