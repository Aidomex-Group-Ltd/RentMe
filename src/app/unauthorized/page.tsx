import Link from "next/link";
import { ShieldAlert, Home, LogIn } from "lucide-react";

export const metadata = {
  title: "Unauthorized",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-bold text-gray-900 font-display">
          Administrator access required
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          You do not have permission to open the RentMe Admin Console. Sign in
          with an administrator account, or return to the main site.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/login?callbackUrl=/admin" className="btn-primary">
            <LogIn className="mr-2 h-4 w-4" aria-hidden />
            Sign in as admin
          </Link>
          <Link href="/" className="btn-secondary">
            <Home className="mr-2 h-4 w-4" aria-hidden />
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
