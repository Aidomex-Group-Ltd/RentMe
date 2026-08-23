"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DollarSign, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { formatUGX, timeAgo } from "@/lib/utils";

export default function TenantPaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<any[]>([]);
  const [selectedTenancy, setSelectedTenancy] = useState<string>("");
  const [charges, setCharges] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCharges, setLoadingCharges] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") fetchTenancies();
  }, [status]);

  async function fetchTenancies() {
    try {
      const res = await fetch("/api/tenancies?limit=10");
      if (res.ok) {
        const data = await res.json();
        const list = data.tenancies || [];
        setTenancies(list);
        const active = list.find((t: any) =>
          ["ACTIVE", "NOTICE_GIVEN"].includes(t.status)
        );
        if (active) {
          setSelectedTenancy(active.id);
        }
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedTenancy) fetchCharges(selectedTenancy);
  }, [selectedTenancy]);

  async function fetchCharges(tenancyId: string) {
    setLoadingCharges(true);
    try {
      const res = await fetch(`/api/rent?tenancyId=${tenancyId}`);
      if (res.ok) {
        const data = await res.json();
        setCharges(data.charges || []);
        setSummary(data.summary || null);
      }
    } catch {
      /* noop */
    } finally {
      setLoadingCharges(false);
    }
  }

  const chargeStatusColor = (s: string) => {
    switch (s) {
      case "PAID":
        return "bg-green-100 text-green-800";
      case "PARTIAL":
        return "bg-yellow-100 text-yellow-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "WAIVED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const paymentStatusColor = (s: string) => {
    switch (s) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <h1 className="text-2xl font-bold text-gray-900 font-display">Rent & Payments</h1>
            <p className="mt-1 text-gray-500">View your rent charges and payment history</p>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-8">

        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : tenancies.length === 0 ? (
          <div className="mt-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">No active tenancy</p>
            <p className="mt-1 text-sm text-gray-400">
              Payment information will appear here once you have an active tenancy.
            </p>
          </div>
        ) : (
          <>
            {/* Tenancy Selector */}
            {tenancies.length > 1 && (
              <select
                value={selectedTenancy}
                onChange={(e) => setSelectedTenancy(e.target.value)}
                className="input mt-4 w-full sm:w-auto"
              >
                {tenancies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.property?.title} {t.unit ? `(Unit ${t.unit.unitNumber})` : ""} — {t.status}
                  </option>
                ))}
              </select>
            )}

            {/* Summary Cards */}
            {summary && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">Total Due</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {formatUGX(summary.totalDue)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="mt-1 text-lg font-bold text-green-600">
                    {formatUGX(summary.totalPaid)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="mt-1 text-lg font-bold text-red-600">
                    {formatUGX(summary.outstanding)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">Overdue</p>
                  <p className="mt-1 text-lg font-bold text-orange-600">
                    {summary.overdueCount}
                  </p>
                </div>
              </div>
            )}

            {/* Charges List */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900">Rent Charges</h3>
              {loadingCharges ? (
                <div className="mt-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : charges.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No rent charges yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {charges.map((charge) => (
                    <div
                      key={charge.id}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {charge.description || `Rent — Due ${new Date(charge.dueDate).toLocaleDateString()}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            Due: {new Date(charge.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatUGX(charge.amount)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${chargeStatusColor(
                              charge.status
                            )}`}
                          >
                            {charge.status}
                          </span>
                        </div>
                      </div>

                      {charge.paidAmount > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          Paid: {formatUGX(charge.paidAmount)}
                          {charge.amount > charge.paidAmount &&
                            ` — Remaining: ${formatUGX(charge.amount - charge.paidAmount)}`}
                        </div>
                      )}

                      {/* Payment history */}
                      {charge.payments?.length > 0 && (
                        <div className="mt-3 border-t border-gray-100 pt-3">
                          <p className="text-xs font-medium text-gray-500">Payments</p>
                          {charge.payments.map((p: any) => (
                            <div
                              key={p.id}
                              className="mt-1 flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusColor(
                                    p.status
                                  )}`}
                                >
                                  {p.status}
                                </span>
                                <span className="text-gray-600">
                                  {p.paymentMethod?.replace(/_/g, " ") || "N/A"}
                                </span>
                                {p.reference && (
                                  <span className="text-gray-400">#{p.reference}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-medium">{formatUGX(p.amount)}</span>
                                <span className="ml-2 text-xs text-gray-400">
                                  {timeAgo(p.createdAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
