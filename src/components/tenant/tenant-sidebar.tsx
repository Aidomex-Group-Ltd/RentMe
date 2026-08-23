"use client";

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
    label: "Find a House",
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
 * - Responsive: horizontal on mobile, vertical sidebar on desktop
 * - Active state highlighting based on current route
 * - Optional badge counts for pending items
 * - Consistent with RentMe design system
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

  /**
   * Check if a nav item is currently active
   */
  const isActive = (href: string): boolean => {
    if (href === "/dashboard/tenant") {
      return pathname === "/dashboard/tenant";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className={cn("w-full", className)}>
      {/* Mobile: Horizontal scrollable nav */}
      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 px-1 py-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge !== 0 && (
                  <span
                    className={cn(
                      "ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
                      item.badgeColor || "bg-red-100 text-red-700"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-600"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: Vertical sidebar */}
      <div className="hidden md:block">
        <div className="sticky top-20 space-y-1">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
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
                  {active && (
                    <ChevronRight className="h-4 w-4 text-brand-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200" />

          {/* Quick Actions */}
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Quick Actions
            </p>
            {QUICK_ACTIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <item.icon className="h-5 w-5 shrink-0 text-gray-400" />
                <span className="flex-1">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
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
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
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
