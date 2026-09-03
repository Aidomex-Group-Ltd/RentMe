"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dashboardPathForRole, formatPhoneNumber } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const trimmed = identifier.trim();
      const isEmail = trimmed.includes("@");
      const result = await signIn("credentials", {
        [isEmail ? "email" : "phone"]: isEmail
          ? trimmed.toLowerCase()
          : formatPhoneNumber(trimmed),
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials. Please try again.");
        return;
      }

      toast.success("Welcome back!");

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const callbackUrl = searchParams.get("callbackUrl");
      const safeCallback =
        callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : null;
      const destination =
        safeCallback || dashboardPathForRole(session?.user?.role) || "/";
      router.push(destination);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const callbackUrl = searchParams.get("callbackUrl");
  const isAdminCallback =
    !!callbackUrl &&
    (callbackUrl === "/admin" || callbackUrl.startsWith("/admin/"));

  return (
    <>
      {isAdminCallback && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800"
        >
          <p className="font-semibold">Admin Console</p>
          <p className="mt-0.5 text-brand-700/80">
            Sign in with an administrator account to continue. This is not a missing
            page — access is restricted to the ADMIN role.
          </p>
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900 font-display">
        {isAdminCallback ? "Admin sign in" : "Sign in"}
      </h1>
      <p className="mt-2 text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Get started
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="label">Email or Phone</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or +256..."
            className="input"
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="input pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" className="rounded border-gray-300 text-brand-500" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-col items-center justify-center bg-brand-700 p-12 lg:flex lg:w-1/2">
        <div className="max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <img src="/icons/rentmesh-192.png" alt="Erikot Properties" className="h-12 w-12 rounded-xl object-contain" width={48} height={48} />
            <span className="text-2xl font-bold text-white font-display">Erikot Properties</span>
          </Link>
          <h2 className="text-3xl font-bold text-white font-display">
            Welcome back to Erikot Properties
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Discover property, land, vehicles, products and services across Uganda.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-white">5K+</p>
              <p className="text-sm text-white/60">Listings</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">12K+</p>
              <p className="text-sm text-white/60">Clients</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">50+</p>
              <p className="text-sm text-white/60">Cities</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src="/icons/rentmesh-192.png" alt="Erikot Properties" className="h-10 w-10 rounded-xl object-contain" width={40} height={40} />
              <span className="text-xl font-bold text-brand-700 font-display">Erikot Properties</span>
            </Link>
          </div>

          <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
