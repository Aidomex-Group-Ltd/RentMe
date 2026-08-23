"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Home,
  FileText,
  DollarSign,
  Loader2,
  ArrowRight,
  Shield,
  MessageSquare,
  Bell,
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
  noticeDeadline: string | null;
  property: {
    id: string;
    title: string;
    rent: number;
    district: string | null;
  };
  unit: { id: string; unitNumber: string } | null;
  leases: {
    id: string;
    endDate: string;
    rentAmount: number;
    depositAmount: number | null;
    noticePeriodDays: number;
    status: string;
  }[];
};

type MoveOutRecord = {
  id: string;
  noticeGivenAt: string | null;
  expectedMoveOut: string | null;
  actualMoveOut: string | null;
  tenantConfirmed: boolean;
  confirmedAt: string | null;
  completedAt: string | null;
  outstandingRent: number;
  damageCharges: number;
  depositDeductions: number | null;
  depositRefund: number | null;
  finalNotes: string | null;
  inspector: { id: string; name: string } | null;
};

export default function TenantMoveOutPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [selectedTenancyId, setSelectedTenancyId] = useState("");
  const [moveOutRecord, setMoveOutRecord] = useState<MoveOutRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Notice form
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeNotes, setNoticeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Move-out details form
  const [showMoveOutForm, setShowMoveOutForm] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState("");
  const [moveOutNotes, setMoveOutNotes] = useState("");
  const [submittingMoveOut, setSubmittingMoveOut] = useState(false);

  // Confirm
  const [confirming, setConfirming] = useState(false);

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
        // Auto-select first active tenancy
        const active = list.find((t: Tenancy) =>
          ["ACTIVE", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"].includes(t.status)
        );
        if (active) setSelectedTenancyId(active.id);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  const fetchMoveOutRecord = useCallback(async (tenancyId: string) => {
    if (!tenancyId) {
      setMoveOutRecord(null);
      return;
    }
    setLoadingRecord(true);
    try {
      const res = await fetch(`/api/move-out?tenancyId=${tenancyId}`);
      if (res.ok) {
        const data = await res.json();
        setMoveOutRecord(data.record || null);
      }
    } catch {
      /* noop */
    } finally {
      setLoadingRecord(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenancyId) fetchMoveOutRecord(selectedTenancyId);
  }, [selectedTenancyId, fetchMoveOutRecord]);

  // Give notice
  async function handleGiveNotice() {
    if (!selectedTenancyId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tenancies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: selectedTenancyId,
          status: "NOTICE_GIVEN",
        }),
      });

      if (res.ok) {
        toast.success("Notice given! Your landlord has been notified.");
        setShowNoticeForm(false);
        setNoticeNotes("");
        fetchTenancies();
        fetchMoveOutRecord(selectedTenancyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to give notice");
      }
    } catch {
      toast.error("Failed to give notice");
    } finally {
      setSubmitting(false);
    }
  }

  // Schedule move-out
  async function handleScheduleMoveOut() {
    if (!selectedTenancyId || !moveOutDate) return;

    setSubmittingMoveOut(true);
    try {
      // Create/update move-out record
      const res = await fetch("/api/move-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: selectedTenancyId,
          expectedMoveOut: moveOutDate,
          finalNotes: moveOutNotes || null,
        }),
      });

      if (res.ok) {
        // Also update tenancy status to MOVE_OUT_SCHEDULED
        await fetch("/api/tenancies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenancyId: selectedTenancyId,
            status: "MOVE_OUT_SCHEDULED",
            moveOutDate,
          }),
        });

        toast.success("Move-out scheduled");
        setShowMoveOutForm(false);
        setMoveOutDate("");
        setMoveOutNotes("");
        fetchTenancies();
        fetchMoveOutRecord(selectedTenancyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to schedule move-out");
      }
    } catch {
      toast.error("Failed to schedule move-out");
    } finally {
      setSubmittingMoveOut(false);
    }
  }

  // Confirm move-out details
  async function handleConfirmMoveOut() {
    if (!selectedTenancyId) return;

    setConfirming(true);
    try {
      const res = await fetch("/api/move-out", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: selectedTenancyId,
          action: "confirm",
        }),
      });

      if (res.ok) {
        toast.success("Move-out details confirmed. Awaiting landlord completion.");
        fetchMoveOutRecord(selectedTenancyId);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to confirm move-out");
      }
    } catch {
      toast.error("Failed to confirm move-out");
    } finally {
      setConfirming(false);
    }
  }

  const selectedTenancy = tenancies.find((t) => t.id === selectedTenancyId);
  const currentLease = selectedTenancy?.leases?.find(
    (l) => l.status === "ACTIVE" || l.status === "EXPIRING" || l.status === "RENEWAL_PENDING"
  );

  // Which step is the tenant on?
  const getStep = () => {
    if (!selectedTenancy) return 0;
    const s = selectedTenancy.status;
    if (s === "ACTIVE") return 1; // Can give notice
    if (s === "NOTICE_GIVEN") return 2; // Can schedule move-out
    if (s === "MOVE_OUT_SCHEDULED") return 3; // Can confirm details
    if (s === "ENDED" || s === "TERMINATED") return 5; // Done
    return 0;
  };

  const step = getStep();

  // Notice period check
  const noticePeriodDays = currentLease?.noticePeriodDays || 30;
  const noticeDeadline = selectedTenancy?.noticeDeadline
    ? new Date(selectedTenancy.noticeDeadline)
    : null;
  const daysUntilDeadline = noticeDeadline
    ? Math.max(
        0,
        Math.ceil(
          (noticeDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">
                  Move Out
                </h1>
                <p className="mt-1 text-gray-500">
                  Give notice, schedule your move-out, and confirm details
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
                        {t.unit ? ` (Unit ${t.unit.unitNumber})` : ""} — {t.status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Progress Steps */}
              {selectedTenancy && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="mb-4 font-semibold text-gray-900">
                    Move-Out Progress
                  </h2>
                  <div className="flex items-center gap-0">
                    {[
                      { num: 1, label: "Give Notice" },
                      { num: 2, label: "Schedule" },
                      { num: 3, label: "Confirm Details" },
                      { num: 4, label: "Complete" },
                    ].map((s, idx) => {
                      const isCompleted = step > s.num;
                      const isCurrent = step === s.num;
                      const isFuture = step < s.num;
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

              {/* Active Tenancy Info */}
              {selectedTenancy &&
                ["ACTIVE", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"].includes(
                  selectedTenancy.status
                ) && (
                  <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="font-semibold text-gray-900">
                          {selectedTenancy.property.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          {selectedTenancy.unit
                            ? `Unit ${selectedTenancy.unit.unitNumber} · `
                            : ""}
                          {selectedTenancy.property.district}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          selectedTenancy.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : selectedTenancy.status === "NOTICE_GIVEN"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {selectedTenancy.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Move-in Date</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {selectedTenancy.moveInDate
                            ? new Date(selectedTenancy.moveInDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      {currentLease && (
                        <>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Lease Ends</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {new Date(currentLease.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Notice Period</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {currentLease.noticePeriodDays} days
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
                    </div>

                    {/* Notice Given Info */}
                    {selectedTenancy.status === "NOTICE_GIVEN" && (
                      <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <p className="text-sm font-medium text-orange-800">
                            Notice Given
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-orange-700">
                          Notice given on{" "}
                          {selectedTenancy.noticeGivenAt
                            ? new Date(selectedTenancy.noticeGivenAt).toLocaleDateString()
                            : "N/A"}
                          {daysUntilDeadline !== null && (
                            <>
                              {" "}• Deadline:{" "}
                              {noticeDeadline?.toLocaleDateString()}{" "}
                              ({daysUntilDeadline} days remaining)
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Move-out Scheduled Info */}
                    {selectedTenancy.status === "MOVE_OUT_SCHEDULED" && moveOutRecord && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-medium text-blue-800">
                            Move-out Scheduled
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-blue-700">
                          Expected move-out:{" "}
                          {moveOutRecord.expectedMoveOut
                            ? new Date(moveOutRecord.expectedMoveOut).toLocaleDateString()
                            : "TBD"}
                          {moveOutRecord.tenantConfirmed && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Confirmed by you
                            </span>
                          )}
                          {moveOutRecord.completedAt && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 1: GIVE NOTICE */}
              {/* ═══════════════════════════════════════════ */}
              {step === 1 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Bell className="h-5 w-5 text-orange-500" />
                    Give Notice
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Notify your landlord that you intend to move out. You are
                    required to give at least {noticePeriodDays} days notice.
                  </p>

                  <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Important
                        </p>
                        <p className="mt-1 text-xs text-yellow-700">
                          Once you give notice, you are committed to moving out.
                          Your landlord will be notified and a move-out
                          inspection will be scheduled. Make sure you understand
                          your lease terms before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setShowNoticeForm(true)}
                      className="btn-primary"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Give Notice to Move Out
                    </button>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 2: SCHEDULE MOVE-OUT */}
              {/* ═══════════════════════════════════════════ */}
              {step === 2 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Schedule Move-Out
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Select your expected move-out date. This helps your landlord
                    prepare for the move-out inspection.
                  </p>

                  {!showMoveOutForm ? (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowMoveOutForm(true)}
                        className="btn-primary"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule Move-Out Date
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Expected Move-Out Date
                        </label>
                        <input
                          type="date"
                          value={moveOutDate}
                          onChange={(e) => setMoveOutDate(e.target.value)}
                          className="input mt-1"
                          min={new Date().toISOString().split("T")[0]}
                        />
                        {noticeDeadline && (
                          <p className="mt-1 text-xs text-gray-500">
                            Your notice deadline is{" "}
                            {noticeDeadline.toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Additional Notes{" "}
                          <span className="text-gray-400 font-normal">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          value={moveOutNotes}
                          onChange={(e) => setMoveOutNotes(e.target.value)}
                          className="input mt-1"
                          rows={3}
                          placeholder="Any special arrangements or notes for your move-out..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleScheduleMoveOut}
                          disabled={submittingMoveOut || !moveOutDate}
                          className="btn-primary disabled:opacity-50"
                        >
                          {submittingMoveOut ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Schedule Move-Out
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowMoveOutForm(false);
                            setMoveOutDate("");
                            setMoveOutNotes("");
                          }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 3: CONFIRM MOVE-OUT DETAILS */}
              {/* ═══════════════════════════════════════════ */}
              {step === 3 && moveOutRecord && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                  <h2 className="flex items-center gap-2 font-semibold text-gray-900">
                    <Shield className="h-5 w-5 text-green-500" />
                    Confirm Move-Out Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the move-out details below and confirm. Your landlord
                    will then complete the move-out process.
                  </p>

                  {/* Move-out Summary */}
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Expected Date</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {moveOutRecord.expectedMoveOut
                          ? new Date(moveOutRecord.expectedMoveOut).toLocaleDateString()
                          : "TBD"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Outstanding Rent</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatUGX(moveOutRecord.outstandingRent)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Damage Charges</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatUGX(moveOutRecord.damageCharges)}
                      </p>
                    </div>
                    {moveOutRecord.depositDeductions !== null && (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Total Deductions
                        </p>
                        <p className="mt-1 text-sm font-medium text-red-600">
                          {formatUGX(moveOutRecord.depositDeductions)}
                        </p>
                      </div>
                    )}
                    {moveOutRecord.depositRefund !== null && (
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs text-gray-500">
                          Deposit Refund
                        </p>
                        <p className="mt-1 text-sm font-bold text-green-700">
                          {formatUGX(moveOutRecord.depositRefund)}
                        </p>
                      </div>
                    )}
                    {moveOutRecord.inspector && (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Inspector</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {moveOutRecord.inspector.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {moveOutRecord.finalNotes && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                        {moveOutRecord.finalNotes}
                      </p>
                    </div>
                  )}

                  {/* Confirm Button */}
                  {!moveOutRecord.tenantConfirmed ? (
                    <div className="mt-6">
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              Please Review Carefully
                            </p>
                            <p className="mt-1 text-xs text-yellow-700">
                              By confirming, you agree that these move-out
                              details are accurate. This will trigger the
                              deposit settlement calculation.
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleConfirmMoveOut}
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
                            Confirm Move-Out Details
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          Confirmed
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-green-700">
                        You confirmed these details on{" "}
                        {moveOutRecord.confirmedAt
                          ? new Date(moveOutRecord.confirmedAt).toLocaleDateString()
                          : "N/A"}
                        . Your landlord will complete the move-out process.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 5: COMPLETED */}
              {/* ═══════════════════════════════════════════ */}
              {step === 5 && (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Move-Out Complete
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Your tenancy has ended. Thank you for being a tenant.
                  </p>
                  <Link
                    href="/search"
                    className="btn-primary mt-4 inline-flex text-sm"
                  >
                    Find a New Home
                  </Link>
                </div>
              )}

              {/* Quick Links */}
              {step > 0 && step < 5 && (
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

      {/* Give Notice Confirmation Modal */}
      {showNoticeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Give Notice
              </h2>
              <button
                onClick={() => setShowNoticeForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-800">
                  Are you sure?
                </p>
              </div>
              <p className="mt-1 text-xs text-orange-700">
                This will notify your landlord that you intend to move out. You
                are required to give at least {noticePeriodDays} days notice per
                your lease terms.
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Additional Notes{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={noticeNotes}
                onChange={(e) => setNoticeNotes(e.target.value)}
                className="input mt-1"
                rows={3}
                placeholder="Any message for your landlord..."
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowNoticeForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveNotice}
                disabled={submitting}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 inline h-4 w-4" />
                    Give Notice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

// Save icon alias (used inline)
function Save({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
