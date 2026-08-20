"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Home,
  Search,
  Heart,
  MessageSquare,
  Calendar,
  FileText,
  Bell,
  ArrowRight,
  Clock,
  CheckCircle,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import PropertyCard from "@/components/property/property-card";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

export default function TenantDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedProperties, setSavedProperties] = useState<any[]>([]);
  const [viewings, setViewings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
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
      const [viewingsRes, appsRes, convsRes] = await Promise.all([
        fetch("/api/viewings?role=tenant"),
        fetch("/api/applications?role=tenant"),
        fetch("/api/conversations"),
      ]);
      const [viewingsData, appsData, convsData] = await Promise.all([
        viewingsRes.json(),
        appsRes.json(),
        convsRes.json(),
      ]);
      setViewings(viewingsData.viewings || []);
      setApplications(appsData.applications || []);
      setConversations(convsData.conversations || []);
    } catch (error) {
      console.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  My Dashboard
                </h1>
                <p className="mt-1 text-gray-500">
                  Welcome back, {session?.user?.name}
                </p>
              </div>
              <Link href="/search" className="btn-primary">
                <Search className="mr-2 h-4 w-4" />
                Find a House
              </Link>
            </div>
          </div>
        </div>

        <div className="page-container py-6 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{savedProperties.length || 0}</p>
                  <p className="text-sm text-gray-500">Saved</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{viewings.length}</p>
                  <p className="text-sm text-gray-500">Viewings</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
                  <p className="text-sm text-gray-500">Applications</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
                  <p className="text-sm text-gray-500">Conversations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Applications */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Applications</h2>
              <Link href="/applications" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            {applications.length > 0 ? (
              <div className="card divide-y divide-gray-100">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      {app.status === "APPROVED" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : app.status === "REJECTED" ? (
                        <span className="text-red-500">✕</span>
                      ) : (
                        <Clock className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/properties/${app.property?.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600 line-clamp-1">
                        {app.property?.title}
                      </Link>
                      <p className="text-xs text-gray-500">{app.property?.district}</p>
                    </div>
                    <span className={`badge ${
                      app.status === "APPROVED" ? "badge-verified" :
                      app.status === "REJECTED" ? "bg-red-100 text-red-800" : "badge-pending"
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">No applications yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When you apply for a property, it will appear here.
                </p>
                <Link href="/search" className="btn-primary mt-4 inline-flex text-sm">
                  Browse Properties
                </Link>
              </div>
            )}
          </section>

          {/* Recent Viewings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Viewing Requests</h2>
              <Link href="/viewings" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            {viewings.length > 0 ? (
              <div className="card divide-y divide-gray-100">
                {viewings.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Calendar className="h-5 w-5 text-brand-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/properties/${v.property?.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600 line-clamp-1">
                        {v.property?.title}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {new Date(v.date).toLocaleDateString()} at {v.time}
                      </p>
                    </div>
                    <span className={`badge ${
                      v.status === "CONFIRMED" ? "badge-verified" :
                      v.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      v.status === "CANCELLED" ? "bg-red-100 text-red-800" : "badge-pending"
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <Calendar className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">No viewing requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When you request to view a property, it will appear here.
                </p>
              </div>
            )}
          </section>

          {/* Recent Conversations */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <Link href="/messages" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            {conversations.length > 0 ? (
              <div className="card divide-y divide-gray-100">
                {conversations.slice(0, 5).map((conv: any) => {
                  const other = conv.participants?.find(
                    (p: any) => p.userId !== session?.user?.id
                  )?.user;
                  return (
                    <Link
                      key={conv.id}
                      href={`/messages/${conv.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-semibold">
                        {other?.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{other?.name}</p>
                          <p className="text-xs text-gray-400">
                            {conv.messages?.[0] ? timeAgo(conv.messages[0].createdAt) : ""}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {conv.property?.title}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {conv.messages?.[0]?.content || "No messages yet"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="card p-8 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                <h3 className="mt-3 font-semibold text-gray-900">No conversations yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When you contact a landlord or agent, your conversations will appear here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
