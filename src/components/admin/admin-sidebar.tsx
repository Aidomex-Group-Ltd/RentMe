"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronRight,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/properties", label: "Properties", icon: Home },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/verification", label: "Verification", icon: Shield },
  { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/activity", label: "Activity Log", icon: Activity },
  { href: "/admin/health", label: "System Health", icon: HeartPulse },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const navContent = (
    <nav className="flex flex-1 flex-col px-3 py-4">
      <div className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-brand-50 text-brand-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <item.icon className={`h-5 w-5 shrink-0 ${isActive(item.href) ? "text-brand-500" : "text-gray-400"}`} />
            <span className="flex-1">{item.label}</span>
            {isActive(item.href) && (
              <ChevronRight className="h-4 w-4 text-brand-400" />
            )}
          </Link>
        ))}
      </div>

      <div className="mt-auto border-t border-gray-200 pt-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0 text-gray-400" />
          <span>Back to Site</span>
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-md border border-gray-200 lg:hidden"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <span className="text-lg font-bold text-brand-700 font-display">RentMe Admin</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
            <Link href="/admin" className="text-lg font-bold text-brand-700 font-display">
              RentMe Admin
            </Link>
            <AdminNotifications />
          </div>
          {navContent}
        </div>
      </div>
    </>
  );
}
