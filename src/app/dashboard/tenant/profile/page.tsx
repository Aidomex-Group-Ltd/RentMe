"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, Save, Loader2, User, Phone, Mail, MapPin, Briefcase, Shield, Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { toast } from "sonner";

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  profile: {
    gender: string | null;
    dateOfBirth: string | null;
    bio: string | null;
    occupation: string | null;
    moveInTimeframe: string | null;
  } | null;
};

export default function TenantProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [occupation, setOccupation] = useState("");
  const [moveInTimeframe, setMoveInTimeframe] = useState("");

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  } | null>(null);

  // Tenancy info
  const [activeTenancy, setActiveTenancy] = useState<any>(null);

  // Password strength checker
  function checkPasswordStrength(password: string) {
    if (!password) {
      setPasswordStrength(null);
      return;
    }
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) setPasswordStrength({ score, label: "Weak", color: "bg-red-500" });
    else if (score <= 2) setPasswordStrength({ score, label: "Fair", color: "bg-orange-500" });
    else if (score <= 3) setPasswordStrength({ score, label: "Good", color: "bg-yellow-500" });
    else setPasswordStrength({ score, label: "Strong", color: "bg-green-500" });
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  async function fetchProfile() {
    try {
      const [profileRes, tenancyRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/tenancies?limit=5"),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const user = profileData.user;
        if (user) {
          setName(user.name || "");
          setEmail(user.email || "");
          setPhone(user.phone || "");
          if (user.profile) {
            setBio(user.profile.bio || "");
            setGender(user.profile.gender || "");
            setDateOfBirth(user.profile.dateOfBirth ? user.profile.dateOfBirth.slice(0, 10) : "");
            setOccupation(user.profile.occupation || "");
            setMoveInTimeframe(user.profile.moveInTimeframe || "");
          }
        }
      }

      if (tenancyRes.ok) {
        const tenancyData = await tenancyRes.json();
        const active = tenancyData.tenancies?.find((t: any) =>
          ["ACTIVE", "PENDING", "NOTICE_GIVEN"].includes(t.status)
        );
        setActiveTenancy(active || null);
      }
    } catch {
      // Use session data as fallback
      if (session?.user) {
        setName(session.user.name || "");
        setEmail(session.user.email || "");
        setPhone(session.user.phone || "");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          gender: gender || undefined,
          dateOfBirth: dateOfBirth || undefined,
          occupation: occupation || undefined,
          moveInTimeframe: moveInTimeframe || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Password changed successfully");
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordStrength(null);
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="page-container mx-auto max-w-2xl px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <h1 className="text-2xl font-bold text-gray-900 font-display">My Profile</h1>
            <p className="mt-1 text-gray-500">Manage your personal information</p>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-2xl py-8">
          {/* Profile Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {/* Avatar Section */}
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    name[0] || "U"
                  )}
                </div>
                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow hover:bg-brand-600">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{name || "Tenant"}</h2>
                <span className="inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                  TENANT
                </span>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  <User className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input mt-1"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input mt-1"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Contact support to change email</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input mt-1"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Contact support to change phone</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="input mt-1"
                      >
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                        <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="input mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  <Briefcase className="h-4 w-4" />
                  Professional Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Occupation</label>
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="input mt-1"
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Move-in Timeframe</label>
                    <select
                      value={moveInTimeframe}
                      onChange={(e) => setMoveInTimeframe(e.target.value)}
                      className="input mt-1"
                    >
                      <option value="">Select timeframe</option>
                      <option value="IMMEDIATELY">Immediately</option>
                      <option value="WITHIN_1_MONTH">Within 1 month</option>
                      <option value="WITHIN_3_MONTHS">Within 3 months</option>
                      <option value="FLEXIBLE">Flexible</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* About */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  <Shield className="h-4 w-4" />
                  About You
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="input mt-1"
                    rows={4}
                    placeholder="Tell landlords a bit about yourself..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A brief introduction helps landlords get to know you better.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Tenancy Info */}
          {activeTenancy && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                <MapPin className="h-4 w-4" />
                Current Tenancy
              </h3>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{activeTenancy.property?.title}</p>
                    <p className="text-sm text-gray-500">
                      {activeTenancy.unit ? `Unit ${activeTenancy.unit.unitNumber} · ` : ""}
                      {activeTenancy.property?.district}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      activeTenancy.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {activeTenancy.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Account Security */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
              <Lock className="h-4 w-4" />
              Account Security
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Password</p>
                  <p className="text-xs text-gray-500">Keep your account secure with a strong password</p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500">Add an extra layer of security</p>
                </div>
                <button className="text-sm font-medium text-gray-400 cursor-not-allowed">
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Change Password
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordStrength(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                    className="input pr-10"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              i <= passwordStrength.score
                                ? passwordStrength.color
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength.score <= 1
                            ? "text-red-600"
                            : passwordStrength.score <= 2
                            ? "text-orange-600"
                            : passwordStrength.score <= 3
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 8 characters. Use a mix of letters, numbers, and symbols.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="relative mt-1">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  {confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {newPassword === confirmPassword ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordStrength(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    changingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    newPassword !== confirmPassword ||
                    newPassword.length < 8
                  }
                  className="btn-primary disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
