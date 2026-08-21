import Link from "next/link";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-6xl font-bold text-brand-500 font-display">404</p>

        <h1 className="mt-4 text-xl font-bold text-gray-900 font-display">
          Page not found
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-primary">
            <Home className="mr-2 h-4 w-4" />
            Homepage
          </Link>
          <Link href="/search" className="btn-secondary">
            <Search className="mr-2 h-4 w-4" />
            Search Properties
          </Link>
        </div>
      </div>
    </div>
  );
}
