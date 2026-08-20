"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users,
  Home,
  AlertTriangle,
  Shield,
  MapPin,
  Settings,
  TrendingUp,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { formatUGX } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTenants: 0,
    totalLandlords: 0,
    totalAgents: 0,
    totalProperties: 0,
    activeListings: 0,
    pendingReview: 0,
    totalReports: 0,
  });
  const [recentProperties, setRecentProperties] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated" || (session?.user && session.user.role !== "ADMIN")) {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchAdminData();
    }
  }, [status, session]);

  async function fetchAdminData() {
    try {
      const [usersRes, propsRes, reportsRes] = await Promise.all([
        fetch("/api/admin/users?limit=5"),
        fetch("/api/admin/properties?limit=5"),
        fetch("/api/reports?limit=5"),
      ]);
      const [usersData, propsData, reportsData] = await Promise.all([
        usersRes.json(),
        propsRes.json(),
        reportsRes.json(),
      ]);

      if (usersData.pagination) {
        setStats((s) => ({ ...s, totalUsers: usersData.pagination.total }));
      }
      if (propsData.pagination) {
        setStats((s) => ({
          ...s,
          totalProperties: propsData.pagination.total,
          activeListings: propsData.properties?.filter((p: any) => p.status === "ACTIVE").length || 0,
          pendingReview: propsData.properties?.filter((p: any) => p.status === "PENDING_REVIEW").length || 0,
        }));
      }
      if (reportsData.pagination) {
        setStats((s) => ({ ...s, totalReports: reportsData.pagination.total }));
      }
      setRecentProperties(propsData.properties || []);
      setRecentReports(reportsData.reports || []);
    } catch (error) {
      console.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  const adminStats = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Active Listings", value: stats.activeListings, icon: Home, color: "bg-green-50 text-green-600" },
    { label: "Pending Review", value: stats.pendingReview, icon: Clock, color: "bg-amber-50 text-amber-600" },
    { label: "Reports", value: stats.totalReports, icon: AlertTriangle, color: "bg-red-50 text-red-600" },
  ];

  const adminLinks = [
    { href: "/admin/users", label: "User Management", icon: Users, desc: "View, verify, suspend users" },
    { href: "/admin/properties", label: "Property Moderation", icon: Home, desc: "Review and approve listings" },
    { href: "/admin/reports", label: "Reports", icon: AlertTriangle, desc: "Review scam and abuse reports" },
    { href: "/admin/verification", label: "Verification", icon: Shield, desc: "Verify landlords and agents" },
    { href: "/admin/locations", label: "Locations", icon: MapPin, desc: "Manage districts and areas" },
    { href: "/admin/settings", label: "System Settings", icon: Settings, desc: "Platform configuration" },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, desc: "Platform metrics and insights" },
  ];

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <h1 className="text-2xl font-bold text-gray-900 font-display">Admin Panel</h1>
            <p className="mt-1 text-gray-500">Platform management and oversight</p>
          </div>
        </div>

        <div className="page-container py-6 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {adminStats.map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Management</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="card group flex items-center gap-4 p-4 transition-all hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-600">{link.label}</p>
                    <p className="text-xs text-gray-500 truncate">{link.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Properties */}
            <div className="card">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Recent Properties</h3>
                  <Link href="/admin/properties" className="text-sm text-brand-600">View all</Link>
                </div>
              </div>
              {recentProperties.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentProperties.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                        <p className="text-xs text-gray-500">by {p.user?.name} • {p.district}</p>
                      </div>
                      <span className={`badge text-xs ${
                        p.status === "ACTIVE" ? "badge-active" :
                        p.status === "PENDING_REVIEW" ? "badge-pending" : "bg-gray-100 text-gray-600"
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">No properties</div>
              )}
            </div>

            {/* Recent Reports */}
            <div className="card">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Recent Reports</h3>
                  <Link href="/admin/reports" className="text-sm text-brand-600">View all</Link>
                </div>
              </div>
              {recentReports.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentReports.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{r.reason}</p>
                        <p className="text-xs text-gray-500">
                          by {r.reporter?.name} • {r.property?.title || "User report"}
                        </p>
                      </div>
                      <span className={`badge text-xs ${
                        r.status === "PENDING" ? "badge-pending" :
                        r.status === "RESOLVED" ? "badge-verified" : "bg-gray-100 text-gray-600"
                      }`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">No reports</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
