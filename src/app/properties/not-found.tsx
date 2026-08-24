import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";

export default function PropertiesIndexNotFound() {
  return (
    <MainLayout>
      <div className="min-h-[80vh] bg-gray-50">
        <div className="page-container py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
              <span className="text-4xl">🔍</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 font-display">
              Property Not Found
            </h1>

            <p className="mt-3 text-gray-500">
              The property you&apos;re looking for doesn&apos;t exist, has been
              removed, or the link is incorrect.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                <Search className="h-4 w-4" />
                Browse Properties
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
