"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error?.message || data.error || "Request failed");
        return;
      }

      setSent(true);
      toast.success(data.message || "Check your email for reset instructions.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-col items-center justify-center bg-brand-700 p-12 lg:flex lg:w-1/2">
        <div className="max-w-md text-center">
          <Link href="/" className="mb-8 inline-flex items-center gap-2">
            <img src="/icons/rentmesh-192.png" alt="Erikot Properties" className="h-12 w-12 rounded-xl object-contain" width={48} height={48} />
            <span className="font-display text-2xl font-bold text-white">Erikot Properties</span>
          </Link>
          <h2 className="font-display text-3xl font-bold text-white">
            Reset your password
          </h2>
          <p className="mt-4 text-lg text-white/70">
            We&apos;ll email you a secure link to choose a new password.
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

          <h1 className="font-display text-2xl font-bold text-gray-900">Forgot password</h1>
          <p className="mt-2 text-gray-500">
            Enter the email on your account and we&apos;ll send reset instructions if it exists.
          </p>

          {sent ? (
            <div className="mt-8 rounded-xl border border-brand-100 bg-brand-50 p-5 text-sm text-gray-700">
              <p className="font-semibold text-brand-800">Check your inbox</p>
              <p className="mt-2">
                If an account exists for <span className="font-medium">{email}</span>, we sent a
                reset link. It expires in one hour.
              </p>
              <p className="mt-3 text-gray-500">
                No email? Check spam, or{" "}
                <button
                  type="button"
                  className="font-semibold text-brand-600 hover:text-brand-700"
                  onClick={() => setSent(false)}
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  required
                  autoComplete="email"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
