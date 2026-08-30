"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, User, Building, Users } from "lucide-react";
import { toast } from "sonner";
import { cn, dashboardPathForRole, formatPhoneNumber, isValidUgandanPhone } from "@/lib/utils";

const roles = [
  {
    value: "TENANT",
    label: "Tenant",
    description: "I'm looking for a place to rent",
    icon: User,
  },
  {
    value: "LANDLORD",
    label: "Landlord",
    description: "I have properties to rent out",
    icon: Building,
  },
  {
    value: "AGENT",
    label: "Agent",
    description: "I manage properties for owners",
    icon: Users,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("TENANT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const normalizedPhone = formatPhoneNumber(phone);

    if (trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters");
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

    if (!isValidUgandanPhone(phone)) {
      toast.error("Enter a valid Ugandan phone number (e.g. 0700 000 000)");
      return;
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Enter a valid email address or leave it blank");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail || undefined,
          phone: normalizedPhone,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          data.error?.message ||
          (typeof data.error === "string" ? data.error : null) ||
          "Registration failed";

        if (res.status === 409) {
          toast.error(message, {
            action: {
              label: "Sign In",
              onClick: () => router.push("/login"),
            },
            duration: 8000,
          });
        } else {
          toast.error(message);
        }
        return;
      }

      const signInResult = await signIn("credentials", {
        ...(trimmedEmail ? { email: trimmedEmail.toLowerCase() } : {}),
        phone: normalizedPhone,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.success("Account created! Please sign in.");
        router.push("/login");
        return;
      }

      toast.success("Welcome to Rent Mesh!");
      router.push(dashboardPathForRole(role));
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden flex-col items-center justify-center bg-brand-700 p-12 lg:flex lg:w-1/2">
        <div className="max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <img src="/icons/rentmesh-192.png" alt="Rent Mesh" className="h-12 w-12 rounded-xl object-contain" width={48} height={48} />
            <span className="text-2xl font-bold text-white font-display">Rent Mesh</span>
          </Link>
          <h2 className="text-3xl font-bold text-white font-display">
            Join Uganda&apos;s #1 Rental Marketplace
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Create your account and start {role === "TENANT" ? "finding your dream home" : "listing properties"} today.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src="/icons/rentmesh-192.png" alt="Rent Mesh" className="h-10 w-10 rounded-xl object-contain" width={40} height={40} />
              <span className="text-xl font-bold text-brand-700 font-display">Rent Mesh</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 font-display">Create account</h1>
          <p className="mt-2 text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>

          {/* Step indicator */}
          <div className="mt-6 flex items-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                    step >= s ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-500"
                  )}
                >
                  {s}
                </div>
                {s < 2 && (
                  <div className={cn("h-0.5 w-12", step > s ? "bg-brand-500" : "bg-gray-200")} />
                )}
              </div>
            ))}
          </div>

          {step === 1 ? (
            /* Step 1: Role selection */
            <div className="mt-8 space-y-4">
              <p className="text-sm font-medium text-gray-700">I want to join as a:</p>
              {roles.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setRole(r.value);
                    setStep(2);
                  }}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                    role === r.value
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      role === r.value ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    <r.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{r.label}</p>
                    <p className="text-sm text-gray-500">{r.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Step 2: Registration form */
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-700">
                Joining as: <strong>{roles.find((r) => r.value === role)?.label}</strong>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="ml-2 font-semibold hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0700 000 000"
                  className="input"
                  required
                  autoComplete="tel"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ugandan mobile number. Used to sign in.
                </p>
              </div>

              <div>
                <label className="label">Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="input pr-10"
                    required
                    minLength={8}
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

              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>

              <p className="text-center text-xs text-gray-500">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-brand-600 hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
