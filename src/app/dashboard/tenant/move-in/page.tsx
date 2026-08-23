"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  ArrowRight,
  FileText,
  DollarSign,
  Shield,
  MessageSquare,
  Bell,
  AlertTriangle,
  Key,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

type Tenancy = {
  id: string;
  status: string;
  moveInDate: string | null;
  moveOutDate: string | null;
  noticeGivenAt: string | null;
  property: {
    id: string;
    title: string;
    rent: number;
    district: string | null;
    city: string | null;
    bedrooms: number;
    bathrooms: number;
    address: string | null;
  };
  unit: { id: string; unitNumber: string } | null;
  leases: {
    id: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    depositAmount: number | null;
    status: string;
  }[];
};

type MoveInRecord = {
  id: string;
  scheduledDate: string | null;
  tenantConfirmed: boolean;
  confirmedAt: string | null;
  completedAt: string | null;
  checklistData: any;
  photos: string[];
  meterReadings: string | null;
  conditionNotes: string | null;
  inspector: { id: string; name: string } | null;
};

export default function TenantMoveInPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [selectedTenancyId, setSelectedTenancyId] = useState("");
  const [moveInRecord, setMoveInRecord] = useState<MoveInRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Checklist form
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [meterReadings, setMeterReadings] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [submittingChecklist, setSubmittingChecklist] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchTenancies();
  }, [authStatus]);

  async function fetchTenancies() {
    setLoading(true);
    try {
      const res = await fetch("/api/tenancies?limit=20");
      if (res.ok) {
        const data = await res.json();
        const list = data.tenancies || [];
        setTenancies(list);
        // Auto-select first pending/active tenancy
        const pending = list.find((t: Tenancy) =>
          ["PENDING", "ACTIVE"].includes(t.status)
        );
        if (pending) setSelectedTenancyId(pending.id);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  const fetchMoveInRecord = useCallback(async (tenancyId: string) => {
    if (!tenancyId) {
      setMoveInRecord(null);
      return;
    }
    setLoadingRecord(true);
    try {
      const res = await fetch(`/api/move-in?tenancyId=${tenancyId}`);
      if (res.ok) {
        const data = await res.json();
        setMoveInRecord(data.record || null);
      }
    } catch {
      /* noop */
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenancyId) fetchMoveInRecord(selectedTenancyId);
  }, [selectedTenancyId, fetchMoveInRecord]);

  // Confirm move-in
  async function handleConfirmMoveIn() {
    if (!selectedTenancyId) return;

    setConfirming(true);
    try {
      const res = await fetch("/api/move-in", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: selectedTenancyId,
          action: "confirm",
        }),
      });

      if (res.ok) {
        toast.success("Move-in confirmed! Your landlord will complete the process.");
        fetchMoveInRecord(selectedTenancyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to confirm move-in");
      }
    } catch {
      toast.error("Failed to confirm move-in");
    } finally {
      setConfirming(false);
    }
  }

  // Submit checklist
  async function handleSubmitChecklist() {
    if (!selectedTenancyId) return;

    setSubmittingChecklist(true);
    try {
      const res = await fetch("/api/move-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: selectedTenancyId,
          meterReadings: meterReadings || null,
          conditionNotes: conditionNotes || null,
        }),
      });

      if (res.ok) {
        toast.success("Move-in details saved");
        setShowChecklistForm(false);
        fetchMoveInRecord(selectedTenancyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save details");
      }
    } catch {
      toast.error("Failed to save details");
    } finally {
      setSubmittingChecklist(false);
    }
  }

  const selectedTenancy = tenancies.find((t) => t.id === selectedTenancyId);
  const currentLease = selectedTenancy?.leases?.find(
    (l) => l.status === "ACTIVE" || l.status === "PENDING_SIGNATURE"
  );

  // Which step?
  const getStep = () => {
    if (!selectedTenancy) return 0;
    if (selectedTenancy.status === "PENDING") {
      if (!moveInRecord) return 1; // No record yet — landlord creates it
      if (!moveInRecord.tenantConfirmed) return 2; // Can confirm
      if (!moveInRecord.completedAt) return 3; // Awaiting landlord completion
      return 4; // Done
    }
    if (selectedTenancy.status === "ACTIVE") return 5; // Already active
    return 0;
  };

  const step = getStep();

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Move In
                </h1>
                <p className="mt-1 text-gray-500">
                  Confirm your move-in details and schedule inspection
                </p>
              </div>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <>
              {/* Tenancy Selector */}
              {tenancies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select Tenancy
                  </label>
                  <select
                    value={selectedTenancyId}
                    onChange={(e) => setSelectedTenancyId(e.target.value)}
                    className="input mt-1 max-w-md"
                  >
                    {tenancies.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.property.title}
                        {t.unit ? " (Unit " + t.unit.unitNumber + ")" : ""} — {t.status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Progress Steps */}
              {selectedTenancy && step > 0 && step <= 4 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="mb-4 font-semibold text-gray-900">
                    Move-In Progress
                  </h2>
                  <div className="flex items-center gap-0">
                    {[
                      { num: 1, label: "Scheduled" },
                      { num: 2, label: "Confirm" },
                      { num: 3, label: "Inspection" },
                      { num: 4, label: "Complete" },
                    ].map((s, idx) => {
                      const isCompleted = step > s.num;
                      const isCurrent = step === s.num;
                      return (
                        <div key={s.num} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                                isCompleted
                                  ? "bg-green-500 text-white"
                                  : isCurrent
                                  ? "bg-brand-500 text-white"
                                  : "bg-gray-200 text-gray-500"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                s.num
                              )}
                            </div>
                            <span
                              className={`mt-1 text-center text-xs ${
                                isCurrent
                                  ? "font-medium text-brand-600"
                                  : isCompleted
                                  ? "text-green-600"
                                  : "text-gray-400"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                          {idx < 3 && (
                            <div
                              className={`mx-1 mb-5 h-0.5 flex-1 ${
                                isCompleted ? "bg-green-500" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Property & Lease Info */}
              {selectedTenancy && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-gray-900">
                          {selectedTenancy.property.title}
                        </h2>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            selectedTenancy.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {selectedTenancy.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedTenancy.unit
                          ? `Unit ${selectedTenancy.unit.unitNumber} · `
                          : ""}
                        {selectedTenancy.property.district}
                        {selectedTenancy.property.city
                          ? `, ${selectedTenancy.property.city}`
                          : ""}
                      </p>
                      {selectedTenancy.property.address && (
                        <p className="mt-0.5 text-sm text-gray-400">
                          {selectedTenancy.property.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {currentLease && (
                      <>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Start Date</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {new Date(currentLease.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">End Date</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {new Date(currentLease.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Monthly Rent</p>
                          <p className="mt-1 text-sm font-bold text-gray-900">
                            {formatUGX(currentLease.rentAmount)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Deposit</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {currentLease.depositAmount
                              ? formatUGX(currentLease.depositAmount)
                              : "N/A"}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Bedrooms</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {selectedTenancy.property.bedrooms}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Bathrooms</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {selectedTenancy.property.bathrooms}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 1: AWAITING SCHEDULE */}
              {/* ═══════════════════════════════════════════ */}
              {step === 1 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Awaiting Move-In Schedule
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Your landlord will schedule a move-in date and inspection.
                    You will be notified once the schedule is set.
                  </p>
                  <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          What happens next?
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-yellow-700">
                          <li>1. Your landlord schedules a move-in date</li>
                          <li>2. You confirm the move-in details</li>
                          <li>3. Move-in inspection is conducted</li>
                          <li>4. Your tenancy becomes active</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 2: CONFIRM MOVE-IN */}
              {/* ═══════════════════════════════════════════ */}
              {step === 2 && moveInRecord && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Key className="h-5 w-5 text-blue-500" />
                    Confirm Move-In
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the move-in details and confirm. Your landlord will
                    then complete the move-in process.
                  </p>

                  {/* Scheduled Date */}
                  {moveInRecord.scheduledDate && (
                    <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <p className="text-sm font-medium text-blue-800">
                          Scheduled Move-In Date
                        </p>
                      </div>
                      <p className="mt-1 text-lg font-bold text-blue-900">
                        {new Date(moveInRecord.scheduledDate).toLocaleDateString(
                          undefined,
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  )}

                  {/* Inspector */}
                  {moveInRecord.inspector && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        Move-In Coordinator
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {moveInRecord.inspector.name}
                      </p>
                    </div>
                  )}

                  {/* Checklist */}
                  {moveInRecord.checklistData && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700">
                        Inspection Checklist
                      </h3>
                      <div className="mt-2 space-y-2">
                        {Object.entries(moveInRecord.checklistData).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                            >
                              <span className="text-sm text-gray-700">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span
                                className={`text-xs font-medium ${
                                  value === true || value === "OK"
                                    ? "text-green-600"
                                    : value === false
                                    ? "text-red-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {value === true
                                  ? "✓ OK"
                                  : value === false
                                  ? "✕ Issue"
                                  : String(value)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meter Readings */}
                  {moveInRecord.meterReadings && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Meter Readings</p>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                        {moveInRecord.meterReadings}
                      </p>
                    </div>
                  )}

                  {/* Condition Notes */}
                  {moveInRecord.conditionNotes && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Condition Notes</p>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                        {moveInRecord.conditionNotes}
                      </p>
                    </div>
                  )}

                  {/* Add Details Button */}
                  <div className="mt-4">
                    <button
                      onClick={() => setShowChecklistForm(true)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      + Add meter readings or condition notes
                    </button>
                  </div>

                  {/* Confirm Button */}
                  <div className="mt-6">
                    <button
                      onClick={handleConfirmMoveIn}
                      disabled={confirming}
                      className="btn-primary"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm Move-In Details
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 3: AWAITING LANDLORD COMPLETION */}
              {/* ═══════════════════════════════════════════ */}
              {step === 3 && moveInRecord && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Awaiting Move-In Completion
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    You have confirmed the move-in details. Your landlord is
                    completing the move-in process.
                  </p>

                  {moveInRecord.scheduledDate && (
                    <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          Confirmed by you on{" "}
                          {moveInRecord.confirmedAt
                            ? new Date(moveInRecord.confirmedAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-green-700">
                        Move-in date:{" "}
                        {new Date(moveInRecord.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm text-blue-800">
                      Your landlord will conduct the move-in inspection and
                      activate your tenancy. You will be notified once complete.
                    </p>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 5: ALREADY ACTIVE */}
              {/* ═══════════════════════════════════════════ */}
              {step === 5 && (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Move-In Complete
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your tenancy is active. Welcome to your new home!
                  </p>
                  {selectedTenancy?.moveInDate && (
                    <p className="mt-2 text-sm text-gray-400">
                      Move-in date:{" "}
                      {new Date(selectedTenancy.moveInDate).toLocaleDateString()}
                    </p>
                  )}
                  <div className="mt-6 flex justify-center gap-3">
                    <Link
                      href="/dashboard/tenant/tenancy"
                      className="btn-primary text-sm"
                    >
                      View My Home
                    </Link>
                    <Link
                      href="/dashboard/tenant/lease"
                      className="btn-secondary text-sm"
                    >
                      View Lease
                    </Link>
                  </div>
                </div>
              )}

              {/* Quick Links */}
              {step > 0 && step <= 4 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Link
                    href="/dashboard/tenant/lease"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Lease
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/tenant/payments"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                  >
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Payments
                    </span>
                  </Link>
                  <Link
                    href="/dashboard/tenant/documents"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                  >
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Documents
                    </span>
                  </Link>
                  <Link
                    href="/messages"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
                  >
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Messages
                    </span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Checklist Modal */}
      {showChecklistForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Move-In Details
              </h2>
              <button
                onClick={() => setShowChecklistForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Record meter readings and property condition before move-in.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meter Readings
                </label>
                <textarea
                  value={meterReadings}
                  onChange={(e) => setMeterReadings(e.target.value)}
                  className="input mt-1"
                  rows={3}
                  placeholder="e.g. Electricity: 12345&#10;Water: 67890&#10;Gas: 11111"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Record utility meter readings at move-in for accurate billing.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Property Condition Notes
                </label>
                <textarea
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  className="input mt-1"
                  rows={4}
                  placeholder="Note any existing damage, wear, or issues with the property..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Document the property condition to protect your deposit.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowChecklistForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitChecklist}
                disabled={submittingChecklist}
                className="btn-primary"
              >
                {submittingChecklist ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Details"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
