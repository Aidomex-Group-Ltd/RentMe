"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRight,
  Home,
  MapPin,
  DollarSign,
  BedDouble,
  Upload,
  CheckCircle,
  Loader2,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { PROPERTY_TYPES, UGANDA_DISTRICTS } from "@/lib/utils";
import { toast } from "sonner";

const steps = [
  { title: "Property Type", icon: Home },
  { title: "Location", icon: MapPin },
  { title: "Rent & Fees", icon: DollarSign },
  { title: "Details", icon: BedDouble },
  { title: "Amenities", icon: CheckCircle },
  { title: "Photos", icon: Upload },
  { title: "Review", icon: CheckCircle },
];

const amenityOptions = [
  { key: "isFurnished", label: "Furnished" },
  { key: "isSelfContained", label: "Self-Contained" },
  { key: "hasCompound", label: "Compound" },
  { key: "hasBalcony", label: "Balcony" },
  { key: "hasGarden", label: "Garden" },
  { key: "hasParking", label: "Parking" },
  { key: "hasSecurity", label: "Security" },
  { key: "hasWater", label: "Water Supply" },
  { key: "hasElectricity", label: "Electricity" },
  { key: "hasInternet", label: "Internet" },
  { key: "hasGenerator", label: "Generator" },
  { key: "hasAirConditioning", label: "Air Conditioning" },
  { key: "hasSecurityGuard", label: "Security Guard" },
  { key: "isGatedCommunity", label: "Gated Community" },
  { key: "allowsPets", label: "Pets Allowed" },
];

export default function CreatePropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyType: "",
    bedrooms: 0,
    bathrooms: 0,
    rent: 0,
    deposit: 0,
    agencyFee: 0,
    serviceCharge: 0,
    paymentFrequency: "MONTHLY",
    district: "",
    city: "",
    neighborhood: "",
    address: "",
    availableFrom: "",
    isFurnished: false,
    isSelfContained: false,
    hasCompound: false,
    hasBalcony: false,
    hasGarden: false,
    hasParking: false,
    hasSecurity: false,
    hasWater: true,
    hasElectricity: true,
    hasInternet: false,
    hasGenerator: false,
    hasAirConditioning: false,
    hasSecurityGuard: false,
    isGatedCommunity: false,
    allowsPets: false,
  });

  const updateForm = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Property listing submitted for review!");
        router.push("/dashboard/landlord");
      } else {
        toast.error(data.error || "Failed to create listing");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-display">List a Property</h1>
                <p className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-3">
            <div className="flex gap-1">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentStep ? "bg-brand-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              {React.createElement(steps[currentStep].icon, { className: "h-4 w-4" })}
              <span>{steps[currentStep].title}</span>
            </div>
          </div>
        </div>

        <div className="page-container max-w-2xl py-8">
          {/* Step 1: Property Type */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">What type of property?</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => updateForm({ propertyType: type.value })}
                    className={`rounded-xl border-2 p-4 text-left text-sm transition-all ${
                      form.propertyType === type.value
                        ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Where is the property?</h2>
              <div>
                <label className="label">District *</label>
                <select
                  value={form.district}
                  onChange={(e) => updateForm({ district: e.target.value })}
                  className="input"
                >
                  <option value="">Select district</option>
                  {UGANDA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">City / Municipality</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateForm({ city: e.target.value })}
                  className="input"
                  placeholder="e.g., Kampala"
                />
              </div>
              <div>
                <label className="label">Neighborhood / Area</label>
                <input
                  type="text"
                  value={form.neighborhood}
                  onChange={(e) => updateForm({ neighborhood: e.target.value })}
                  className="input"
                  placeholder="e.g., Ntinda, Kisaasi"
                />
              </div>
              <div>
                <label className="label">Address / Landmark</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  className="input"
                  placeholder="Near Ntinda Shopping Center"
                />
              </div>
            </div>
          )}

          {/* Step 3: Rent & Fees */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Rent & Fees</h2>
              <div>
                <label className="label">Monthly Rent (UGX) *</label>
                <input
                  type="number"
                  value={form.rent || ""}
                  onChange={(e) => updateForm({ rent: parseInt(e.target.value) || 0 })}
                  className="input"
                  placeholder="500000"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Security Deposit (UGX)</label>
                <input
                  type="number"
                  value={form.deposit || ""}
                  onChange={(e) => updateForm({ deposit: parseInt(e.target.value) || 0 })}
                  className="input"
                  placeholder="500000"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Agency Fee (UGX)</label>
                <input
                  type="number"
                  value={form.agencyFee || ""}
                  onChange={(e) => updateForm({ agencyFee: parseInt(e.target.value) || 0 })}
                  className="input"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Service Charge (UGX)</label>
                <input
                  type="number"
                  value={form.serviceCharge || ""}
                  onChange={(e) => updateForm({ serviceCharge: parseInt(e.target.value) || 0 })}
                  className="input"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Property Details</h2>
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  className="input"
                  placeholder="2 Bedroom House in Ntinda"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  className="input"
                  rows={5}
                  placeholder="Describe your property in detail..."
                  maxLength={5000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bedrooms</label>
                  <input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => updateForm({ bedrooms: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Bathrooms</label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => updateForm({ bathrooms: parseInt(e.target.value) || 0 })}
                    className="input"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="label">Available From</label>
                <input
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) => updateForm({ availableFrom: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          )}

          {/* Step 5: Amenities */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Amenities & Features</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {amenityOptions.map((amenity) => (
                  <label
                    key={amenity.key}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 text-sm transition-all cursor-pointer ${
                      (form as any)[amenity.key]
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(form as any)[amenity.key]}
                      onChange={(e) => updateForm({ [amenity.key]: e.target.checked } as any)}
                      className="rounded border-gray-300 text-brand-500"
                    />
                    {amenity.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Photos */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Property Photos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload photos after your listing is approved. You can add up to 20 photos.
              </p>
              <div className="mt-6 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm text-gray-500">
                  Photo upload will be available after listing approval.
                </p>
              </div>
            </div>
          )}

          {/* Step 7: Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Review Your Listing</h2>

              <div className="card p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Title</span>
                  <span className="text-sm font-medium text-gray-900">{form.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Type</span>
                  <span className="text-sm font-medium text-gray-900">
                    {PROPERTY_TYPES.find((t) => t.value === form.propertyType)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Location</span>
                  <span className="text-sm font-medium text-gray-900">
                    {form.neighborhood}, {form.district}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Rent</span>
                  <span className="text-sm font-bold text-brand-600">
                    UGX {form.rent.toLocaleString()}/month
                  </span>
                </div>
                {form.deposit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Deposit</span>
                    <span className="text-sm font-medium text-gray-900">
                      UGX {form.deposit.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Bedrooms / Bathrooms</span>
                  <span className="text-sm font-medium text-gray-900">
                    {form.bedrooms} / {form.bathrooms}
                  </span>
                </div>
              </div>

              {form.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Description</h3>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{form.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn-secondary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="btn-primary"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
