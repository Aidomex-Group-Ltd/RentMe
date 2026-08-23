"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Heart,
  Share2,
  Flag,
  MapPin,
  BedDouble,
  Bath,
  Calendar,
  Eye,
  ShieldCheck,
  MessageSquare,
  Phone,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  CheckCircle,
  AlertCircle,
  Home,
  Zap,
  Droplets,
  Wifi,
  Car,
  Lock,
  Trees,
  Snowflake,
  Users,
  Star,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import ScamAlert from "@/components/property/scam-alert";
import InspectionTracker from "@/components/property/inspection-tracker";
import MessageLandlord from "@/components/messaging/message-landlord";
import { calculatePropertyFeesFromProperty, type FeeBreakdown } from "@/lib/fees";
import { formatUGX, timeAgo } from "@/lib/utils";
import {
  descriptionRequired,
  isReportReason,
  minDescriptionLength,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
} from "@/lib/flagging-rules";
import { toast } from "sonner";
import type { PublicSafetyAlert } from "@/lib/flagging-rules";

const amenityIcons: Record<string, any> = {
  hasParking: { icon: Car, label: "Parking" },
  hasSecurity: { icon: Lock, label: "Security" },
  hasWater: { icon: Droplets, label: "Water" },
  hasElectricity: { icon: Zap, label: "Electricity" },
  hasInternet: { icon: Wifi, label: "Internet" },
  hasGarden: { icon: Trees, label: "Garden" },
  hasAirConditioning: { icon: Snowflake, label: "Air Conditioning" },
  hasSecurityGuard: { icon: ShieldCheck, label: "Security Guard" },
  hasGenerator: { icon: Zap, label: "Generator" },
  isGatedCommunity: { icon: Lock, label: "Gated Community" },
  hasCompound: { icon: Home, label: "Compound" },
  hasBalcony: { icon: Maximize2, label: "Balcony" },
  isFurnished: { icon: Home, label: "Furnished" },
  isSelfContained: { icon: CheckCircle, label: "Self-Contained" },
  allowsPets: { icon: Users, label: "Pets Allowed" },
};

const propertyTypeLabels: Record<string, string> = {
  single_room: "Single Room",
  "room_self_contained": "Room & Self-Contained",
  "studio": "Studio",
  "bedsitter": "Bedsitter",
  "1_bedroom": "1 Bedroom",
  "2_bedroom": "2 Bedroom",
  "3_bedroom": "3 Bedroom",
  "4_plus_bedroom": "4+ Bedroom",
  "apartment": "Apartment",
  "flat": "Flat",
  "house": "House",
  "villa": "Villa",
  "townhouse": "Townhouse",
  "duplex": "Duplex",
  "hostel": "Hostel",
};

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingTime, setViewingTime] = useState("");
  const [viewingPeople, setViewingPeople] = useState(1);
  const [viewingMessage, setViewingMessage] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reporting, setReporting] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/properties/${params.id}`);
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          return;
        }
        setProperty(data.property);
        setAlreadyReported(Boolean(data.property?.alreadyReported));
      } catch (error) {
        toast.error("Failed to load property");
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [params.id]);

  const handleSave = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    try {
      const res = await fetch(`/api/properties/${property.id}/save`, {
        method: "POST",
      });
      const data = await res.json();
      setSaved(data.saved);
      toast.success(data.saved ? "Property saved" : "Property removed from saved");
    } catch (error) {
      toast.error("Failed to save property");
    }
  };

  const handleViewingRequest = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!viewingDate || !viewingTime) {
      toast.error("Please select date and time");
      return;
    }
    try {
      const res = await fetch("/api/viewings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          date: viewingDate,
          time: viewingTime,
          numberOfPeople: viewingPeople,
          message: viewingMessage,
        }),
      });
      const data = await res.json();
      if (data.viewing) {
        toast.success("Viewing request sent!");
        setShowViewingModal(false);
      } else {
        toast.error(data.error || "Failed to send request");
      }
    } catch (error) {
      toast.error("Failed to send viewing request");
    }
  };

  const handleReport = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!isReportReason(reportReason)) {
      toast.error("Please select a reason");
      return;
    }
    const minLen = minDescriptionLength(reportReason);
    if (descriptionRequired(reportReason) && reportDescription.trim().length < minLen) {
      toast.error(`Please add at least ${minLen} characters describing what happened`);
      return;
    }
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          reason: reportReason,
          description: reportDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.report) {
        toast.error(data.error || "Failed to submit report");
        return;
      }
      toast.success("Report submitted. Thank you for helping keep RentMe safe.");
      setShowReportModal(false);
      setReportReason("");
      setReportDescription("");
      setAlreadyReported(true);
    } catch (error) {
      toast.error("Failed to submit report");
    } finally {
      setReporting(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    const text = `${property.title} - ${formatUGX(property.rent)}/month in ${property.district || "Uganda"}`;
    if (navigator.share) {
      navigator.share({ title: text, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="page-container py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="skeleton aspect-video w-full rounded-xl" />
              <div className="skeleton h-8 w-2/3" />
              <div className="skeleton h-4 w-1/3" />
            </div>
            <div className="space-y-4">
              <div className="skeleton h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!property) {
    return (
      <MainLayout>
        <div className="page-container py-20 text-center">
          <Home className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900">Property Not Found</h1>
          <p className="mt-2 text-gray-500">This property may have been removed or is no longer available.</p>
          <Link href="/search" className="btn-primary mt-6 inline-flex">
            Browse Properties
          </Link>
        </div>
      </MainLayout>
    );
  }

  const images = property.images || [];
  const videos = property.videos || [];
  const location = [property.neighborhood, property.district, property.city, "Uganda"].filter(Boolean).join(", ");
  // Calculate fees from property data
  const fees: FeeBreakdown = property.rent
    ? calculatePropertyFeesFromProperty(property)
    : null!;

  const safety: PublicSafetyAlert = property.safety || {
    level: "none",
    title: "",
    messages: [],
    hideDirectContact: false,
    blockInquiries: false,
  };
  const isOwner = Boolean(property.isOwner);
  const inquiriesBlocked = safety.blockInquiries && !isOwner;
  const hidePhone = safety.hideDirectContact && !isOwner;

  return (
    <MainLayout>
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-white">
        <div className="page-container py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span>/</span>
            <Link href="/search" className="hover:text-brand-600">Search</Link>
            <span>/</span>
            <span className="text-gray-900 truncate">{property.title}</span>
          </div>
        </div>
      </div>

      <div className="page-container py-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="relative overflow-hidden rounded-xl bg-gray-100">
              {images.length > 0 ? (
                <div className="relative aspect-video">
                  <img
                    src={images[currentImage]?.url}
                    alt={images[currentImage]?.alt || property.title}
                    className="h-full w-full object-cover"
                  />

                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImage(i => (i === 0 ? images.length - 1 : i - 1))}
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImage(i => (i === images.length - 1 ? 0 : i + 1))}
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {/* Image counter & fullscreen */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button
                      onClick={() => setGalleryOpen(true)}
                      className="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-black/70"
                    >
                      <Maximize2 className="h-4 w-4" />
                      {images.length} photos
                    </button>
                  </div>

                  {/* Dots */}
                  {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {images.map((_: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImage(i)}
                          className={`h-2 w-2 rounded-full transition-all ${
                            i === currentImage ? "w-6 bg-white" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
                  <span className="text-6xl">🏠</span>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {images.map((img: any, i: number) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentImage(i)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      i === currentImage ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Property Info */}
            <div className="mt-6">
              <ScamAlert
                level={safety.level}
                title={safety.title}
                messages={safety.messages}
                className="mb-6"
              />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {property.isVerified && (
                      <span className="badge-verified">
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Verified
                      </span>
                    )}
                    <span className="badge-active">
                      {propertyTypeLabels[property.propertyType] || property.propertyType}
                    </span>
                  </div>
                  <h1 className="mt-2 text-2xl font-bold text-gray-900 font-display sm:text-3xl">
                    {property.title}
                  </h1>
                  <div className="mt-2 flex items-center gap-1 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={handleSave} className="btn-secondary p-2.5">
                    <Heart className={`h-5 w-5 ${saved ? "fill-red-500 text-red-500" : ""}`} />
                  </button>
                  <button onClick={handleShare} className="btn-secondary p-2.5">
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (alreadyReported || isOwner) return;
                      if (!session) {
                        router.push("/login");
                        return;
                      }
                      setShowReportModal(true);
                    }}
                    className="btn-secondary p-2.5"
                    disabled={alreadyReported || isOwner}
                    aria-label={alreadyReported ? "Already reported" : "Flag this listing"}
                    title={
                      isOwner
                        ? "You cannot report your own listing"
                        : alreadyReported
                          ? "You already reported this listing"
                          : "Report this listing"
                    }
                  >
                    <Flag className={`h-5 w-5 ${alreadyReported ? "text-red-500" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Key details */}
              <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {property.bedrooms > 0 && (
                  <div className="text-center">
                    <BedDouble className="mx-auto h-5 w-5 text-gray-400" />
                    <p className="mt-1 text-sm font-medium text-gray-900">{property.bedrooms}</p>
                    <p className="text-xs text-gray-500">Beds</p>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="text-center">
                    <Bath className="mx-auto h-5 w-5 text-gray-400" />
                    <p className="mt-1 text-sm font-medium text-gray-900">{property.bathrooms}</p>
                    <p className="text-xs text-gray-500">Baths</p>
                  </div>
                )}
                <div className="text-center">
                  <Eye className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-900">{property.viewCount}</p>
                  <p className="text-xs text-gray-500">Views</p>
                </div>
                <div className="text-center">
                  <Heart className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-900">{property.saveCount || property._count?.savedBy || 0}</p>
                  <p className="text-xs text-gray-500">Saves</p>
                </div>
                <div className="text-center">
                  <Calendar className="mx-auto h-5 w-5 text-gray-400" />
                  <p className="mt-1 text-sm font-medium text-gray-900">{timeAgo(property.listedAt)}</p>
                  <p className="text-xs text-gray-500">Listed</p>
                </div>
              </div>

              {/* Videos */}
              {videos.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900">Videos</h2>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {videos.map((video: any) => (
                      <div key={video.id} className="overflow-hidden rounded-xl bg-gray-100">
                        <video
                          src={video.url}
                          controls
                          preload="metadata"
                          className="aspect-video w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fee Breakdown */}
              {fees && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900">Move-in Cost Breakdown</h2>
                  <div className="mt-3 rounded-xl border border-gray-200 p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Rent ({fees.minimumMonths} month{fees.minimumMonths > 1 ? "s" : ""})
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatUGX(fees.rentSubtotal)}
                        </span>
                      </div>
                      {fees.deposit > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Security Deposit</span>
                          <span className="font-medium text-gray-900">
                            {formatUGX(fees.deposit)}
                          </span>
                        </div>
                      )}
                      {fees.agencyFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Agency Fee</span>
                          <span className="font-medium text-gray-900">
                            {formatUGX(fees.agencyFee)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service Charge (5%)</span>
                        <span className="font-medium text-gray-900">
                          {formatUGX(fees.serviceCharge)}
                        </span>
                      </div>
                      <div className="my-2 border-t border-gray-200" />
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">Total Move-in Cost</span>
                        <span className="text-lg font-bold text-brand-600">
                          {formatUGX(fees.totalMoveInCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                <p className="mt-3 whitespace-pre-line text-gray-600 leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Amenities */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900">Amenities & Features</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(amenityIcons).map(([key, info]) => {
                    if (!property[key]) return null;
                    return (
                      <div key={key} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                        <info.icon className="h-4 w-4 text-brand-500" />
                        <span className="text-sm text-gray-700">{info.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviews */}
              {property.reviews?.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
                  <div className="mt-3 space-y-4">
                    {property.reviews.map((review: any) => (
                      <div key={review.id} className="card p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-semibold">
                            {review.user.name?.[0] || "U"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{review.user.name}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.title && (
                          <p className="mt-2 text-sm font-medium text-gray-900">{review.title}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-600">{review.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price card */}
              <div className="card p-6">
                <div className="mb-4">
                  <p className="text-3xl font-bold text-brand-600 font-display">
                    {formatUGX(property.rent)}
                  </p>
                  <p className="text-sm text-gray-500">
                    per {property.paymentFrequency?.toLowerCase() === "monthly" ? "month" : property.paymentFrequency?.toLowerCase()}
                  </p>
                </div>

                {property.deposit && (
                  <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Security Deposit</span>
                      <span className="font-medium text-gray-900">{formatUGX(property.deposit)}</span>
                    </div>
                  </div>
                )}

                {property.agencyFee && (
                  <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Agency Fee</span>
                      <span className="font-medium text-gray-900">{formatUGX(property.agencyFee)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowViewingModal(true)}
                  className="btn-primary w-full"
                  disabled={inquiriesBlocked}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Request Viewing
                </button>

                <button
                  onClick={() => setShowContactModal(true)}
                  className="btn-secondary mt-3 w-full"
                  disabled={inquiriesBlocked}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contact Landlord
                </button>

                {!hidePhone && property.user.phone && (
                  <a
                    href={`tel:${property.user.phone}`}
                    className="btn-secondary mt-3 w-full"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    {property.user.phone}
                  </a>
                )}
                {hidePhone && !inquiriesBlocked && (
                  <p className="mt-3 text-center text-xs text-gray-500">
                    Phone number is hidden on reported listings. Use RentMe messages instead.
                  </p>
                )}
              </div>

              {/* Landlord/Agent card */}
              <div className="card p-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  {property.user.agent ? "Listed by Agent" : "Listed by Landlord"}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-semibold">
                    {property.user.avatar ? (
                      <img src={property.user.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      property.user.name?.[0] || "U"
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{property.user.name}</p>
                    {property.user.landlord?.verificationStatus === "VERIFIED" ||
                    property.user.agent?.verificationStatus === "VERIFIED" ? (
                      <span className="badge-verified text-xs">
                        <ShieldCheck className="mr-0.5 h-3 w-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Unverified</span>
                    )}
                  </div>
                </div>
                {property.user.landlord?.responseRate && (
                  <p className="mt-3 text-sm text-gray-500">
                    Responds to {Math.round(property.user.landlord.responseRate * 100)}% of inquiries
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  {property.user.landlord?.activeListings || property.user.agent?.activeProperties || 0} active listings
                </p>
              </div>

              {/* Safety tips */}
              <div className="card border-yellow-200 bg-yellow-50 p-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="text-sm font-semibold">Safety Tips</h3>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                  <li>• Meet in a public place first</li>
                  <li>• Visit the property before paying</li>
                  <li>• Never pay before seeing the house</li>
                  <li>• Use RentMe messaging for records</li>
                  <li>• Report suspicious listings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Gallery Modal */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <button
            onClick={() => setGalleryOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentImage(i => (i === 0 ? images.length - 1 : i - 1))}
            className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <img
            src={images[currentImage]?.url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          <button
            onClick={() => setCurrentImage(i => (i === images.length - 1 ? 0 : i + 1))}
            className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 text-sm text-white">
            {currentImage + 1} / {images.length}
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Contact {property.user.name}</h2>
            <p className="mt-1 text-sm text-gray-500">
              About: {property.title}
            </p>
            {safety.level !== "none" && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                Never send money before viewing this property in person.
              </p>
            )}
            <MessageLandlord
              className="mt-4"
              propertyId={property.id}
              landlordId={property.user.id}
              landlordName={property.user.name}
              label="Send Message"
            />
            <div className="mt-3 flex">
              <button onClick={() => setShowContactModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Request Modal */}
      {showViewingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Request a Viewing</h2>
            <p className="mt-1 text-sm text-gray-500">About: {property.title}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Preferred Date</label>
                <input
                  type="date"
                  value={viewingDate}
                  onChange={(e) => setViewingDate(e.target.value)}
                  className="input"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="label">Preferred Time</label>
                <select value={viewingTime} onChange={(e) => setViewingTime(e.target.value)} className="input">
                  <option value="">Select time</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                </select>
              </div>
              <div>
                <label className="label">Number of People</label>
                <input
                  type="number"
                  value={viewingPeople}
                  onChange={(e) => setViewingPeople(parseInt(e.target.value) || 1)}
                  className="input"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="label">Message (optional)</label>
                <textarea
                  value={viewingMessage}
                  onChange={(e) => setViewingMessage(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Any special requests?"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowViewingModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleViewingRequest} className="btn-primary flex-1">
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Tracker */}
      {!isOwner && property.latitude && property.longitude && (
        <InspectionTracker
          propertyId={property.id}
          propertyTitle={property.title}
          propertyLatitude={property.latitude}
          propertyLongitude={property.longitude}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">Report This Listing</h2>
            <p className="mt-1 text-sm text-gray-500">
              Flags are reviewed by RentMe. Scam reports also warn other tenants.
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="input mt-4"
            >
              <option value="">Select a reason</option>
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {REPORT_REASON_LABELS[reason]}
                </option>
              ))}
            </select>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder={
                isReportReason(reportReason) && descriptionRequired(reportReason)
                  ? "Describe what happened (required for scam and safety reports)"
                  : "Additional details (optional)"
              }
              className="input mt-3"
              rows={3}
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowReportModal(false)} className="btn-secondary flex-1" disabled={reporting}>
                Cancel
              </button>
              <button onClick={handleReport} className="btn-danger flex-1" disabled={reporting}>
                {reporting ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
