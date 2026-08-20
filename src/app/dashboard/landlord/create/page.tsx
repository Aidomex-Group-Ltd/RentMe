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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const updateForm = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    // Clear field error when user edits the field
    const key = Object.keys(updates)[0];
    if (key && fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const FieldError = ({ field }: { field: string }) => {
    if (!fieldErrors[field]) return null;
    return (
      <p className="mt-1 text-xs text-red-600" data-field-error>
        {fieldErrors[field]}
      </p>
    );
  };

  const handlePhotosSelected = (files: FileList | null) => {
    if (!files?.length) return;
    const next = [...photoFiles, ...Array.from(files)].slice(0, 20);
    setPhotoFiles(next);
    setPhotoPreviews(next.map((file) => URL.createObjectURL(file)));
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

  async function uploadPhotos(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of photoFiles) {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", `properties/${session?.user?.id || "drafts"}`);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Photo upload failed");
      }
      urls.push(data.url as string);
    }
    return urls;
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.title || form.title.length < 5) {
      errors.title = "Title must be at least 5 characters.";
    } else if (form.title.length > 200) {
      errors.title = "Title must be 200 characters or fewer.";
    }

    if (!form.description || form.description.length < 20) {
      errors.description = "Description must be at least 20 characters.";
    } else if (form.description.length > 5000) {
      errors.description = "Description must be 5,000 characters or fewer.";
    }

    if (!form.propertyType) {
      errors.propertyType = "Please select a property type.";
    }

    if (!form.district) {
      errors.district = "Please select a district.";
    }

    if (!form.rent || form.rent < 1000) {
      errors.rent = "Rent must be at least UGX 1,000.";
    }

    if (form.bedrooms < 0 || form.bedrooms > 20) {
      errors.bedrooms = "Bedrooms must be between 0 and 20.";
    }

    if (form.bathrooms < 0 || form.bathrooms > 20) {
      errors.bathrooms = "Bathrooms must be between 0 and 20.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors below before submitting.");
      // Scroll to first error
      const firstErrorField = document.querySelector("[data-field-error]");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      let imageUrls: string[] = [];
      if (photoFiles.length > 0) {
        toast.message("Uploading photos to Cloudflare R2…");
        imageUrls = await uploadPhotos();
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrls }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Property listing submitted for review!");
        router.push("/dashboard/landlord");
        router.refresh();
      } else if (res.status === 403) {
        toast.error(
          data.error?.message || "You don't have permission to create listings. Please register as a landlord or agent.",
          { duration: 10000 }
        );
      } else if (res.status === 400 && data.error?.fields) {
        // Map backend field errors to local state
        const backendErrors: Record<string, string> = {};
        for (const [field, message] of Object.entries(data.error.fields)) {
          backendErrors[field] = message as string;
        }
        setFieldErrors(backendErrors);
        toast.error("Please fix the validation errors below.");
      } else {
        toast.error(data.error?.message || "Failed to create listing");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
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
                        : fieldErrors.propertyType
                          ? "border-red-300 hover:border-red-400"
                          : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <FieldError field="propertyType" />
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
                  className={`input ${fieldErrors.district ? "input-error" : ""}`}
                >
                  <option value="">Select district</option>
                  {UGANDA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <FieldError field="district" />
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
                  className={`input ${fieldErrors.rent ? "input-error" : ""}`}
                  placeholder="500000"
                  min="0"
                />
                <FieldError field="rent" />
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
                  className={`input ${fieldErrors.title ? "input-error" : ""}`}
                  placeholder="2 Bedroom House in Ntinda"
                  maxLength={200}
                />
                <FieldError field="title" />
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  className={`input ${fieldErrors.description ? "input-error" : ""}`}
                  rows={5}
                  placeholder="Describe your property in detail..."
                  maxLength={5000}
                />
                <FieldError field="description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bedrooms</label>
                  <input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => updateForm({ bedrooms: parseInt(e.target.value) || 0 })}
                    className={`input ${fieldErrors.bedrooms ? "input-error" : ""}`}
                    min="0"
                  />
                  <FieldError field="bedrooms" />
                </div>
                <div>
                  <label className="label">Bathrooms</label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => updateForm({ bathrooms: parseInt(e.target.value) || 0 })}
                    className={`input ${fieldErrors.bathrooms ? "input-error" : ""}`}
                    min="0"
                  />
                  <FieldError field="bathrooms" />
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
                Photos are stored on Cloudflare R2. You can add up to 20 images (JPEG, PNG, WebP).
              </p>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-10 text-center hover:border-brand-400 hover:bg-brand-50/40">
                <Upload className="h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm font-medium text-gray-700">Click to upload photos</p>
                <p className="mt-1 text-xs text-gray-500">Max 8MB per image</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotosSelected(e.target.files)}
                />
              </label>

              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photoPreviews.map((src, index) => (
                    <div key={src} className="relative overflow-hidden rounded-lg bg-gray-100">
                      <img src={src} alt="" className="h-28 w-full object-cover" />
                      {index === 0 && (
                        <span className="absolute left-2 top-2 rounded bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
