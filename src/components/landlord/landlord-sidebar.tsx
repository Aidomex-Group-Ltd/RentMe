"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  FileText,
  Wrench,
  BarChart3,
  MessageSquare,
  Plus,
  Settings,
  Bell,
  DollarSign,
  Calendar,
  ChevronRight,
  ClipboardList,
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
 * Props for the LandlordSidebar component
 */
interface LandlordSidebarProps {
  /** Override navigation items (optional) */
  navItems?: NavItem[];
  /** Show compact version (icons only) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default navigation items for the landlord dashboard
 */
const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard/landlord",
    icon: Home,
  },
  {
    label: "Tenants",
    href: "/dashboard/landlord/tenants",
    icon: Users,
  },
  {
    label: "Applications",
    href: "/dashboard/landlord/applications",
    icon: ClipboardList,
  },
  {
    label: "Leases",
    href: "/dashboard/landlord/leases",
    icon: FileText,
  },
  {
    label: "Maintenance",
    href: "/dashboard/landlord/maintenance",
    icon: Wrench,
  },
  {
    label: "Reports",
    href: "/dashboard/landlord/reports",
    icon: BarChart3,
  },
  {
    label: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
];

/**
 * Additional quick action items
 */
const QUICK_ACTIONS: NavItem[] = [
  {
    label: "List Property",
    href: "/dashboard/landlord/create",
    icon: Plus,
  },
];

/**
 * LandlordSidebar - Shared navigation component for landlord dashboard pages
 *
 * Features:
 * - Responsive: horizontal on mobile, vertical sidebar on desktop
 * - Active state highlighting based on current route
 * - Optional badge counts for pending items
 * - Consistent with RentMe design system
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LandlordSidebar />
 *
 * // With custom badges
 * <LandlordSidebar
 *   navItems={[
 *     { label: "Dashboard", href: "/dashboard/landlord", icon: Home },
 *     { label: "Tenants", href: "/dashboard/landlord/tenants", icon: Users, badge: 5 },
 *   ]}
 * />
 * ```
 */
export default function LandlordSidebar({
  navItems = DEFAULT_NAV_ITEMS,
  compact = false,
  className,
}: LandlordSidebarProps) {
  const pathname = usePathname();

  /**
   * Check if a nav item is currently active
   */
  const isActive = (href: string): boolean => {
    if (href === "/dashboard/landlord") {
      return pathname === "/dashboard/landlord";
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
 * LandlordPageLayout - Wrapper component that adds sidebar to landlord pages
 *
 * @example
 * ```tsx
 * <LandlordPageLayout
 *   title="Tenants"
 *   description="Manage your tenants"
 *   navBadges={{ "/dashboard/landlord/maintenance": 3 }}
 * >
 *   <YourPageContent />
 * </LandlordPageLayout>
 * ```
 */
interface LandlordPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  navBadges?: Record<string, number>;
  headerActions?: React.ReactNode;
}

export function LandlordPageLayout({
  children,
  title,
  description,
  navBadges,
  headerActions,
}: LandlordPageLayoutProps) {
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
              <LandlordSidebar navItems={navItems} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="page-container py-6">{children}</div>
    </div>
  );
}
