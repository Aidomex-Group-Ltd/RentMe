"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, Save, Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session?.user) {
      setName(session.user.name || "");
      setPhone(session.user.phone || "");
      setEmail(session.user.email || "");
    }
  }, [session, status]);

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <h1 className="text-xl font-bold text-gray-900 font-display">My Profile</h1>
          </div>
        </div>

        <div className="page-container max-w-2xl py-8">
          <div className="card p-6">
            {/* Avatar */}
            <div className="mb-6 flex items-center gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
                  {name[0] || "U"}
                </div>
                <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow hover:bg-brand-600">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
                <span className="badge bg-brand-50 text-brand-600">{session?.user?.role}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input"
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500">Contact support to change your phone number</p>
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            <button className="btn-primary mt-6">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
