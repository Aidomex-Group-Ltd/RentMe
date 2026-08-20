"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="mt-6 text-xl font-bold text-gray-900 font-display">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          An unexpected error occurred. You can try again or go back to the
          homepage.
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-xs text-gray-400">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </button>
          <Link href="/" className="btn-secondary">
            <Home className="mr-2 h-4 w-4" />
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
