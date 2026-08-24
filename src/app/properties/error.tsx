"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

export default function PropertiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Properties error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="mt-6 text-xl font-bold text-gray-900">
          Property Unavailable
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t load the property details. It may have been removed or
          is temporarily unavailable.
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-400">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Search className="h-4 w-4" />
            Search Properties
          </Link>
        </div>
      </div>
    </div>
  );
}
