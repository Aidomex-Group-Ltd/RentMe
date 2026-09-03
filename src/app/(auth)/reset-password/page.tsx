"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Missing reset token. Request a new link from Forgot password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error?.message || data.error || "Reset failed");
        return;
      }

      toast.success(data.message || "Password updated");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mt-8 rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-800">
        <p className="font-semibold">Invalid reset link</p>
        <p className="mt-2">
          This page needs a valid token.{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Request a new password reset
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label className="label">New password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="input pr-10"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="label">Confirm password</label>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          className="input"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-col items-center justify-center bg-brand-700 p-12 lg:flex lg:w-1/2">
        <div className="max-w-md text-center">
          <Link href="/" className="mb-8 inline-flex items-center gap-2">
            <img src="/icons/rentmesh-192.png" alt="Erikot Properties" className="h-12 w-12 rounded-xl object-contain" width={48} height={48} />
            <span className="font-display text-2xl font-bold text-white">Erikot Properties</span>
          </Link>
          <h2 className="font-display text-3xl font-bold text-white">Choose a new password</h2>
          <p className="mt-4 text-lg text-white/70">
            Use a strong password you have not used on Erikot Properties before.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src="/icons/rentmesh-192.png" alt="Erikot Properties" className="h-10 w-10 rounded-xl object-contain" width={40} height={40} />
              <span className="font-display text-xl font-bold text-brand-700">Erikot Properties</span>
            </Link>
          </div>

          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>

          <h1 className="font-display text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="mt-2 text-gray-500">Enter and confirm your new password below.</p>

          <Suspense fallback={<p className="mt-8 text-sm text-gray-500">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
