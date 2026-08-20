"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Home, Search } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import PropertyCard from "@/components/property/property-card";

export default function SavedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchSaved();
    }
  }, [status]);

  async function fetchSaved() {
    try {
      const res = await fetch("/api/properties?limit=50");
      const data = await res.json();
      // Filter to show saved properties (in real app, would have a dedicated API)
      setProperties(data.properties || []);
    } catch (error) {
      console.error("Failed to load saved properties");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <h1 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Saved Properties
            </h1>
          </div>
        </div>

        <div className="page-container py-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="skeleton aspect-[4/3] w-full" />
                  <div className="p-4 space-y-3">
                    <div className="skeleton h-5 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} isSaved />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Heart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900">No saved properties</h3>
              <p className="mt-1 text-gray-500">
                Your future home starts here. Save properties you love to view them later.
              </p>
              <Link href="/search" className="btn-primary mt-4 inline-flex text-sm">
                <Search className="mr-2 h-4 w-4" />
                Find Properties
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
