"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Eye,
  Heart,
  MessageSquare,
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

export default function LandlordDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [viewings, setViewings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  async function fetchData() {
    try {
      const [propsRes, viewingsRes, appsRes] = await Promise.all([
        // Own listings across all statuses (new ones start as PENDING_REVIEW)
        fetch("/api/properties?mine=1&limit=50"),
        fetch("/api/viewings?role=landlord"),
        fetch("/api/applications?role=landlord"),
      ]);
      const [propsData, viewingsData, appsData] = await Promise.all([
        propsRes.json(),
        viewingsRes.json(),
        appsRes.json(),
      ]);
      setProperties(propsData.properties || []);
      setViewings(viewingsData.viewings || []);
      setApplications(appsData.applications || []);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      label: "Active Listings",
      value: properties.filter((p) => p.status === "ACTIVE").length,
      icon: Home,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Total Views",
      value: properties.reduce((sum, p) => sum + (p.viewCount || 0), 0),
      icon: Eye,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Total Saves",
      value: properties.reduce((sum, p) => sum + (p.saveCount || 0), 0),
      icon: Heart,
      color: "text-red-600 bg-red-50",
    },
    {
      label: "Pending Viewings",
      value: viewings.filter((v) => v.status === "REQUESTED").length,
      icon: Calendar,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Landlord Dashboard
                </h1>
                <p className="mt-1 text-gray-500">
                  Welcome back, {session?.user?.name}
                </p>
              </div>
              <Link href="/dashboard/landlord/create" className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                List Property
              </Link>
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Listings */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">My Listings</h2>
                  <Link href="/search" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                    View all
                  </Link>
                </div>
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="skeleton h-20 w-24 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 w-3/4" />
                          <div className="skeleton h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : properties.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {properties.slice(0, 5).map((property) => (
                      <div key={property.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {property.images?.[0] ? (
                            <img src={property.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl">🏠</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/properties/${property.slug}`}
                            className="text-sm font-semibold text-gray-900 hover:text-brand-600 line-clamp-1"
                          >
                            {property.title}
                          </Link>
                          <p className="text-xs text-gray-500">{property.district}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                            <span>{formatUGX(property.rent)}/mo</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {property.viewCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {property.saveCount || 0}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`badge ${
                            property.status === "ACTIVE"
                              ? "badge-active"
                              : property.status === "PENDING_REVIEW"
                              ? "badge-pending"
                              : property.status === "RENTED"
                              ? "badge-rented"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {property.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Home className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900">No listings yet</h3>
                    <p className="mt-1 text-gray-500">Start by listing your first property.</p>
                    <Link href="/dashboard/landlord/create" className="btn-primary mt-4 inline-flex">
                      <Plus className="mr-2 h-4 w-4" />
                      List Property
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pending Viewings */}
              <div className="card">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">Viewing Requests</h2>
                </div>
                {viewings.filter((v) => v.status === "REQUESTED").length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {viewings
                      .filter((v) => v.status === "REQUESTED")
                      .slice(0, 5)
                      .map((v) => (
                        <div key={v.id} className="px-6 py-3">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {v.property?.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {v.tenant?.name} • {new Date(v.date).toLocaleDateString()} at {v.time}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <Calendar className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No pending viewings</p>
                  </div>
                )}
              </div>

              {/* Recent Applications */}
              <div className="card">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="font-semibold text-gray-900">Applications</h2>
                </div>
                {applications.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {applications.slice(0, 5).map((app) => (
                      <div key={app.id} className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {app.tenant?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          for {app.property?.title}
                        </p>
                        <span className="badge-pending mt-1 text-xs">{app.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No applications yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
