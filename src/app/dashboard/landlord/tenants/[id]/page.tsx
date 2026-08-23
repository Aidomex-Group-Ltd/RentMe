"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Home,
  DollarSign,
  Wrench,
  FileText,
  Bell,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Send,
  Plus,
  RefreshCw,
  LogOut,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

type TenancyDetails = {
  id: string;
  status: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  noticeGivenAt: string | null;
  noticeDeadline: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    rent: number;
    deposit: number | null;
    district: string | null;
    city: string | null;
    address: string | null;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
  };
  unit: { id: string; unitNumber: string; unitType: string | null; rent: number | null } | null;
  tenant: { id: string; name: string; avatar: string | null; email: string | null; phone: string | null };
  leases: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    depositAmount: number | null;
    paymentFrequency: string;
    gracePeriodDays: number;
    noticePeriodDays: number;
    signedAt: string | null;
    createdAt: string;
  }[];
  rentCharges: {
    id: string;
    amount: number;
    currency: string;
    dueDate: string;
    description: string | null;
    status: string;
    paidAmount: number;
    lateFee: number;
    createdAt: string;
  }[];
  maintenanceRequests: {
    id: string;
    title: string;
    description: string;
    category: string | null;
    priority: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  }[];
  documents: {
    id: string;
    name: string;
    category: string | null;
    url: string;
    fileSize: number | null;
    mimeType: string | null;
    createdAt: string;
  }[];
  notices: {
    id: string;
    type: string;
    subject: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }[];
  moveIn: {
    id: string;
    scheduledDate: string | null;
    actualDate: string | null;
    tenantConfirmed: boolean;
    confirmedAt: string | null;
    completedAt: string | null;
  } | null;
  moveOut: {
    id: string;
    noticeGivenAt: string | null;
    expectedMoveOut: string | null;
    actualMoveOut: string | null;
    tenantConfirmed: boolean;
    completedAt: string | null;
    outstandingRent: number;
    damageCharges: number;
    depositRefund: number;
    depositDeductions: number;
  } | null;
  renewals: {
    id: string;
    status: string;
    proposedRent: number;
    proposedTerms: string | null;
    offeredAt: string;
    respondedAt: string | null;
  }[];
};

type RentSummary = {
  totalDue: number;
  totalPaid: number;
  totalLateFee: number;
  outstanding: number;
  overdueCount: number;
};

type MaintenanceSummary = {
  total: number;
  open: number;
  resolved: number;
};

type Tab = "overview" | "payments" | "maintenance" | "documents" | "notices" | "activity";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  NOTICE_GIVEN: "bg-orange-100 text-orange-800",
  MOVE_OUT_SCHEDULED: "bg-red-100 text-red-800",
  ENDED: "bg-gray-100 text-gray-600",
  TERMINATED: "bg-red-100 text-red-600",
};

const MAINTENANCE_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  ACKNOWLEDGED: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-800",
};

const LEASE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_SIGNATURE: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRING: "bg-orange-100 text-orange-800",
  RENEWAL_PENDING: "bg-blue-100 text-blue-800",
  EXPIRED: "bg-red-100 text-red-800",
  TERMINATED: "bg-red-100 text-red-600",
};

export default function TenantDetailsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const tenancyId = params.id as string;

  const [tenancy, setTenancy] = useState<TenancyDetails | null>(null);
  const [rentSummary, setRentSummary] = useState<RentSummary | null>(null);
  const [maintenanceSummary, setMaintenanceSummary] = useState<MaintenanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Quick action modals
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ subject: "", message: "", type: "GENERAL_ANNOUNCEMENT" });
  const [leaseForm, setLeaseForm] = useState({
    startDate: "", endDate: "", rentAmount: "", depositAmount: "",
    paymentFrequency: "MONTHLY", gracePeriodDays: "0", noticePeriodDays: "30",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchTenancyDetails();
    }
  }, [authStatus, tenancyId]);

  async function fetchTenancyDetails() {
    try {
      const res = await fetch(`/api/tenancies/${tenancyId}`);
      if (res.ok) {
        const data = await res.json();
        setTenancy(data.tenancy);
        setRentSummary(data.rentSummary);
        setMaintenanceSummary(data.maintenanceSummary);
      } else {
        router.push("/dashboard/landlord/tenants");
      }
    } catch {
      router.push("/dashboard/landlord/tenants");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNotice(e: React.FormEvent) {
    e.preventDefault();
    if (!noticeForm.subject || !noticeForm.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId,
          recipientId: tenancy!.tenant.id,
          type: noticeForm.type,
          subject: noticeForm.subject,
          message: noticeForm.message,
        }),
      });
      if (res.ok) {
        toast.success("Notice sent");
        setShowNoticeModal(false);
        setNoticeForm({ subject: "", message: "", type: "GENERAL_ANNOUNCEMENT" });
        fetchTenancyDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send notice");
      }
    } catch {
      toast.error("Failed to send notice");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateLease(e: React.FormEvent) {
    e.preventDefault();
    if (!leaseForm.startDate || !leaseForm.endDate || !leaseForm.rentAmount) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId,
          startDate: leaseForm.startDate,
          endDate: leaseForm.endDate,
          rentAmount: parseFloat(leaseForm.rentAmount),
          depositAmount: leaseForm.depositAmount ? parseFloat(leaseForm.depositAmount) : undefined,
          paymentFrequency: leaseForm.paymentFrequency,
          gracePeriodDays: parseInt(leaseForm.gracePeriodDays) || 0,
          noticePeriodDays: parseInt(leaseForm.noticePeriodDays) || 30,
        }),
      });
      if (res.ok) {
        toast.success("Lease created");
        setShowLeaseModal(false);
        setLeaseForm({
          startDate: "", endDate: "", rentAmount: "", depositAmount: "",
          paymentFrequency: "MONTHLY", gracePeriodDays: "0", noticePeriodDays: "30",
        });
        fetchTenancyDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create lease");
      }
    } catch {
      toast.error("Failed to create lease");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="page-container mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!tenancy) return null;

  const activeLease = tenancy.leases.find(
    (l) => l.status === "ACTIVE" || l.status === "EXPIRING" || l.status === "RENEWAL_PENDING"
  );

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview", icon: User },
    { id: "payments", label: "Payments", icon: DollarSign, count: rentSummary?.overdueCount },
    { id: "maintenance", label: "Maintenance", icon: Wrench, count: maintenanceSummary?.open },
    { id: "documents", label: "Documents", icon: FileText, count: tenancy.documents.length },
    { id: "notices", label: "Notices", icon: Bell },
    { id: "activity", label: "Activity", icon: Clock },
  ];

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <Link
              href="/dashboard/landlord/tenants"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tenants
            </Link>
          </div>
        </div>

        <div className="page-container py-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Sidebar */}
            <div className="w-full shrink-0 lg:w-72">
              {/* Tenant Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
                    {tenancy.tenant.avatar ? (
                      <img
                        src={tenancy.tenant.avatar}
                        alt=""
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      tenancy.tenant.name?.[0] || "?"
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-gray-900">{tenancy.tenant.name}</h2>
                  <p className="text-sm text-gray-500">{tenancy.tenant.email}</p>
                  {tenancy.tenant.phone && (
                    <p className="text-sm text-gray-500">{tenancy.tenant.phone}</p>
                  )}
                  <span
                    className={`mt-3 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[tenancy.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {tenancy.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Property Info */}
                <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{tenancy.property.title}</span>
                  </div>
                  {tenancy.unit && (
                    <div className="flex items-center gap-2 text-sm">
                      <Home className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">Unit {tenancy.unit.unitNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      {formatUGX(activeLease?.rentAmount || tenancy.property.rent)}/mo
                    </span>
                  </div>
                  {activeLease && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">
                        Lease ends {new Date(activeLease.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowNoticeModal(true)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Send className="h-4 w-4 text-purple-600" />
                    Send Notice
                  </button>
                  <button
                    onClick={() => setShowLeaseModal(true)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 text-green-600" />
                    Create Lease
                  </button>
                  <Link
                    href={`/properties/${tenancy.property.id}`}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Home className="h-4 w-4 text-blue-600" />
                    View Property
                  </Link>
                  <button
                    onClick={() => fetchTenancyDetails()}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                    Refresh Data
                  </button>
                </div>
              </div>

              {/* Rent Summary Card */}
              {rentSummary && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Rent Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Due</span>
                      <span className="font-medium text-gray-900">{formatUGX(rentSummary.totalDue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Paid</span>
                      <span className="font-medium text-green-700">{formatUGX(rentSummary.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Outstanding</span>
                      <span className="font-medium text-red-700">{formatUGX(rentSummary.outstanding)}</span>
                    </div>
                    {rentSummary.overdueCount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Overdue</span>
                        <span className="font-medium text-red-700">{rentSummary.overdueCount} charges</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Maintenance Summary */}
              {maintenanceSummary && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Maintenance
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total</span>
                      <span className="font-medium text-gray-900">{maintenanceSummary.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Open</span>
                      <span className="font-medium text-blue-700">{maintenanceSummary.open}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Resolved</span>
                      <span className="font-medium text-green-700">{maintenanceSummary.resolved}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Tabs - Mobile (horizontal scroll) */}
              <div className="mb-6 overflow-x-auto border-b border-gray-200 lg:border-b-0">
                <div className="flex gap-1 lg:flex-col lg:border-r lg:border-gray-200 lg:pr-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-brand-50 text-brand-600"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{tab.label}</span>
                      <span className="lg:hidden">{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Property & Unit Info */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">Property</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">{tenancy.property.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Unit</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {tenancy.unit ? `${tenancy.unit.unitNumber} (${tenancy.unit.unitType || "N/A"})` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {tenancy.property.district}
                          {tenancy.property.city ? `, ${tenancy.property.city}` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">{tenancy.property.propertyType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Bedrooms / Bathrooms</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {tenancy.property.bedrooms} bed / {tenancy.property.bathrooms} bath
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Move-in Date</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {tenancy.moveInDate ? new Date(tenancy.moveInDate).toLocaleDateString() : "TBD"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tenancy Since</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {new Date(tenancy.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {tenancy.moveOutDate && (
                        <div>
                          <p className="text-xs text-gray-500">Move-out Date</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {new Date(tenancy.moveOutDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lease Info */}
                  {activeLease && (
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Current Lease</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${LEASE_STATUS_COLORS[activeLease.status] || ""}`}
                        >
                          {activeLease.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div>
                          <p className="text-xs text-gray-500">Start Date</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {new Date(activeLease.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">End Date</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {new Date(activeLease.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Rent Amount</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">{formatUGX(activeLease.rentAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Deposit</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {activeLease.depositAmount ? formatUGX(activeLease.depositAmount) : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Payment Frequency</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">{activeLease.paymentFrequency}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Grace Period</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">{activeLease.gracePeriodDays} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Notice Period</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">{activeLease.noticePeriodDays} days</p>
                        </div>
                        {activeLease.signedAt && (
                          <div>
                            <p className="text-xs text-gray-500">Signed</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {new Date(activeLease.signedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notice Given Warning */}
                  {tenancy.status === "NOTICE_GIVEN" && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <p className="font-medium text-orange-800">Notice Given</p>
                      </div>
                      <p className="mt-1 text-sm text-orange-700">
                        Move-out deadline:{" "}
                        {tenancy.noticeDeadline
                          ? new Date(tenancy.noticeDeadline).toLocaleDateString()
                          : "TBD"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === "payments" && (
                <div className="space-y-4">
                  {tenancy.rentCharges.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-4 text-lg font-medium text-gray-500">No rent charges yet</p>
                      <p className="mt-1 text-sm text-gray-400">Rent charges will appear here once created.</p>
                    </div>
                  ) : (
                    tenancy.rentCharges.map((charge) => (
                      <div
                        key={charge.id}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {charge.description || `Rent - ${new Date(charge.dueDate).toLocaleDateString()}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              Due: {new Date(charge.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">{formatUGX(charge.amount)}</p>
                            {charge.paidAmount > 0 && (
                              <p className="text-sm text-green-600">Paid: {formatUGX(charge.paidAmount)}</p>
                            )}
                            {charge.amount - charge.paidAmount > 0 && (
                              <p className="text-sm text-red-600">
                                Outstanding: {formatUGX(charge.amount - charge.paidAmount)}
                              </p>
                            )}
                            {charge.lateFee > 0 && (
                              <p className="text-xs text-orange-600">Late fee: {formatUGX(charge.lateFee)}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              charge.status === "PAID"
                                ? "bg-green-100 text-green-800"
                                : charge.status === "OVERDUE"
                                ? "bg-red-100 text-red-800"
                                : charge.status === "PARTIAL"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {charge.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Maintenance Tab */}
              {activeTab === "maintenance" && (
                <div className="space-y-4">
                  {tenancy.maintenanceRequests.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                      <Wrench className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-4 text-lg font-medium text-gray-500">No maintenance requests</p>
                      <p className="mt-1 text-sm text-gray-400">Requests will appear here when submitted.</p>
                    </div>
                  ) : (
                    tenancy.maintenanceRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{req.title}</h4>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${MAINTENANCE_STATUS_COLORS[req.status] || ""}`}
                              >
                                {req.status.replace(/_/g, " ")}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  req.priority === "URGENT"
                                    ? "bg-red-100 text-red-800"
                                    : req.priority === "HIGH"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {req.priority}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{req.description}</p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                              {req.category && <span>{req.category}</span>}
                              <span>{timeAgo(req.createdAt)}</span>
                              {req.resolvedAt && (
                                <span className="text-green-600">
                                  Resolved {timeAgo(req.resolvedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === "documents" && (
                <div className="space-y-4">
                  {tenancy.documents.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-4 text-lg font-medium text-gray-500">No documents</p>
                      <p className="mt-1 text-sm text-gray-400">Documents will appear here once uploaded.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                      {tenancy.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-4 px-6 py-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {doc.category || "Uncategorized"} · {timeAgo(doc.createdAt)}
                              {doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(1)} KB` : ""}
                            </p>
                          </div>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-brand-600 hover:text-brand-700"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notices Tab */}
              {activeTab === "notices" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Notices</h3>
                    <button
                      onClick={() => setShowNoticeModal(true)}
                      className="btn-primary text-sm"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Notice
                    </button>
                  </div>
                  {tenancy.notices.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                      <Bell className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-4 text-lg font-medium text-gray-500">No notices</p>
                      <p className="mt-1 text-sm text-gray-400">Notices sent to this tenant will appear here.</p>
                    </div>
                  ) : (
                    tenancy.notices.map((notice) => (
                      <div
                        key={notice.id}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{notice.subject}</h4>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                {notice.type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 line-clamp-3">{notice.message}</p>
                            <p className="mt-2 text-xs text-gray-400">{timeAgo(notice.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Tenancy Timeline</h3>
                  <div className="mt-4 space-y-4">
                    <TimelineItem
                      icon={<Calendar className="h-4 w-4" />}
                      title="Tenancy Created"
                      date={tenancy.createdAt}
                      color="bg-blue-100 text-blue-600"
                    />
                    {tenancy.moveIn && (
                      <TimelineItem
                        icon={<Home className="h-4 w-4" />}
                        title="Move-in Scheduled"
                        date={tenancy.moveIn.scheduledDate}
                        color="bg-green-100 text-green-600"
                      />
                    )}
                    {tenancy.moveIn?.tenantConfirmed && (
                      <TimelineItem
                        icon={<CheckCircle className="h-4 w-4" />}
                        title="Tenant Confirmed Move-in"
                        date={tenancy.moveIn.confirmedAt || tenancy.moveIn.actualDate}
                        color="bg-green-100 text-green-600"
                      />
                    )}
                    {tenancy.moveIn?.completedAt && (
                      <TimelineItem
                        icon={<CheckCircle className="h-4 w-4" />}
                        title="Move-in Completed"
                        date={tenancy.moveIn.completedAt}
                        color="bg-green-100 text-green-600"
                      />
                    )}
                    {tenancy.leases.map((lease) => (
                      <TimelineItem
                        key={lease.id}
                        icon={<FileText className="h-4 w-4" />}
                        title={`Lease ${lease.status.replace(/_/g, " ").toLowerCase()} — ${formatUGX(lease.rentAmount)}`}
                        date={lease.signedAt || lease.createdAt}
                        color="bg-purple-100 text-purple-600"
                      />
                    ))}
                    {tenancy.renewals.map((renewal) => (
                      <TimelineItem
                        key={renewal.id}
                        icon={<Calendar className="h-4 w-4" />}
                        title={`Renewal ${renewal.status.replace(/_/g, " ").toLowerCase()} — ${formatUGX(renewal.proposedRent)}`}
                        date={renewal.offeredAt}
                        color="bg-indigo-100 text-indigo-600"
                      />
                    ))}
                    {tenancy.noticeGivenAt && (
                      <TimelineItem
                        icon={<AlertTriangle className="h-4 w-4" />}
                        title="Notice Given"
                        date={tenancy.noticeGivenAt}
                        color="bg-orange-100 text-orange-600"
                      />
                    )}
                    {tenancy.moveOut && (
                      <>
                        {tenancy.moveOut.expectedMoveOut && (
                          <TimelineItem
                            icon={<Clock className="h-4 w-4" />}
                            title="Move-out Scheduled"
                            date={tenancy.moveOut.expectedMoveOut}
                            color="bg-red-100 text-red-600"
                          />
                        )}
                        {tenancy.moveOut.completedAt && (
                          <TimelineItem
                            icon={<CheckCircle className="h-4 w-4" />}
                            title="Move-out Completed"
                            date={tenancy.moveOut.completedAt}
                            color="bg-gray-100 text-gray-600"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Notice Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Send Notice to {tenancy.tenant.name}</h2>
              <button onClick={() => setShowNoticeModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSendNotice} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={noticeForm.type}
                  onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value })}
                  className="input mt-1"
                >
                  <option value="GENERAL_ANNOUNCEMENT">General Announcement</option>
                  <option value="RENT_REMINDER">Rent Reminder</option>
                  <option value="MAINTENANCE_NOTICE">Maintenance Notice</option>
                  <option value="INSPECTION_NOTICE">Inspection Notice</option>
                  <option value="LEASE_RENEWAL">Lease Renewal</option>
                  <option value="MOVE_OUT_NOTICE">Move-out Notice</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  value={noticeForm.subject}
                  onChange={(e) => setNoticeForm({ ...noticeForm, subject: e.target.value })}
                  className="input mt-1"
                  placeholder="Notice subject..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={noticeForm.message}
                  onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                  className="input mt-1"
                  rows={4}
                  placeholder="Write your notice message..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNoticeModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? "Sending..." : "Send Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Lease Modal */}
      {showLeaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create Lease</h2>
              <button onClick={() => setShowLeaseModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateLease} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="date"
                    value={leaseForm.startDate}
                    onChange={(e) => setLeaseForm({ ...leaseForm, startDate: e.target.value })}
                    className="input mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date *</label>
                  <input
                    type="date"
                    value={leaseForm.endDate}
                    onChange={(e) => setLeaseForm({ ...leaseForm, endDate: e.target.value })}
                    className="input mt-1"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rent Amount (UGX) *</label>
                  <input
                    type="number"
                    value={leaseForm.rentAmount}
                    onChange={(e) => setLeaseForm({ ...leaseForm, rentAmount: e.target.value })}
                    className="input mt-1"
                    placeholder="e.g. 800000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deposit Amount (UGX)</label>
                  <input
                    type="number"
                    value={leaseForm.depositAmount}
                    onChange={(e) => setLeaseForm({ ...leaseForm, depositAmount: e.target.value })}
                    className="input mt-1"
                    placeholder="e.g. 1600000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Frequency</label>
                  <select
                    value={leaseForm.paymentFrequency}
                    onChange={(e) => setLeaseForm({ ...leaseForm, paymentFrequency: e.target.value })}
                    className="input mt-1"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUALLY">Annually</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Grace Period (days)</label>
                  <input
                    type="number"
                    value={leaseForm.gracePeriodDays}
                    onChange={(e) => setLeaseForm({ ...leaseForm, gracePeriodDays: e.target.value })}
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notice Period (days)</label>
                  <input
                    type="number"
                    value={leaseForm.noticePeriodDays}
                    onChange={(e) => setLeaseForm({ ...leaseForm, noticePeriodDays: e.target.value })}
                    className="input mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLeaseModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? "Creating..." : "Create Lease"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function TimelineItem({
  icon,
  title,
  date,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  date: string | null;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">
          {date ? new Date(date).toLocaleDateString() : "N/A"}
        </p>
      </div>
    </div>
  );
}
