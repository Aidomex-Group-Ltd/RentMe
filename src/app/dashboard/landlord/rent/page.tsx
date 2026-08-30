import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Wallet,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatUGX } from "@/lib/utils";
import { LandlordPageLayout } from "@/components/landlord/landlord-sidebar";

export const metadata = { title: "Rent & Collections | Rent Mesh" };

/**
 * Rent & Collections — landlord overview of charges across every tenancy
 * on their properties (mock section: 💳 Rent & Collections).
 */
export default async function RentCollectionsPage() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/landlord/rent");
  if (!["LANDLORD", "AGENT", "ADMIN"].includes(session.user.role)) {
    redirect("/dashboard/tenant");
  }

  let tenancies: any[] = [];
  try {
    tenancies = await prisma.tenancy.findMany({
      where: { property: { userId: session.user.id } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        property: { select: { title: true, district: true } },
        unit: { select: { unitNumber: true } },
        tenant: { select: { name: true } },
        rentCharges: {
          orderBy: { dueDate: "desc" },
          take: 6,
          select: { id: true, amount: true, dueDate: true, status: true },
        },
      },
    });
  } catch {
    tenancies = [];
  }

  // ── Aggregates ──────────────────────────────────────────────
  const activeCharges = tenancies.flatMap((t: any) =>
    t.rentCharges.filter((c: any) => c.status !== "WAIVED")
  );
  const monthlyExpected = activeCharges
    .filter((c) => c.status === "PENDING" || c.status === "PARTIAL" || c.status === "OVERDUE")
    .reduce((sum, c) => sum + c.amount, 0);
  const collected = activeCharges
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + c.amount, 0);
  const overdue = activeCharges.filter((c) => c.status === "OVERDUE");
  const collectionRate =
    collected + monthlyExpected > 0
      ? Math.round((collected / (collected + monthlyExpected)) * 100)
      : 100;

  const statusBadge: Record<string, string> = {
    PAID: "bg-green-50 text-green-700 border-green-200",
    PENDING: "bg-blue-50 text-blue-700 border-blue-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
    OVERDUE: "bg-red-50 text-red-700 border-red-200",
    WAIVED: "bg-gray-50 text-gray-500 border-gray-200",
  };

  return (
    <LandlordPageLayout
      title="Rent & Collections"
      description="Rent charges and payment status across your tenancies"
    >
      {/* Overview metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Outstanding</p>
            <Wallet className="h-4 w-4 text-brand-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatUGX(monthlyExpected)}
          </p>
          <p className="text-xs text-gray-400">due across open charges</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Collected</p>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatUGX(collected)}
          </p>
          <p className="text-xs text-gray-400">paid to date</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Collection Rate</p>
            <CreditCard className="h-4 w-4 text-brand-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{collectionRate}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
            <div
              className="h-1.5 rounded-full bg-brand-500"
              style={{ width: `${Math.min(100, collectionRate)}%` }}
            />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Overdue Charges</p>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{overdue.length}</p>
          <p className="text-xs text-gray-400">need follow-up</p>
        </div>
      </div>

      {/* Charges table */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Recent rent charges</h2>
        </div>
        {tenancies.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-900">No tenancies yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Approve an application to start tracking rent here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Tenant / Unit</th>
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Charge</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenancies.flatMap((t) =>
                  t.rentCharges.length === 0
                    ? [
                        <tr key={`${t.id}-empty`} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{t.tenant.name}</p>
                            <p className="text-xs text-gray-400">
                              {t.unit ? `Unit ${t.unit.unitNumber}` : "—"}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {t.property.title}
                          </td>
                          <td className="px-5 py-3 text-gray-400" colSpan={3}>
                            No charges generated yet ({t.status.toLowerCase()})
                          </td>
                        </tr>,
                      ]
                    : t.rentCharges.map((c: any) => {
                        const daysLate = Math.floor(
                          (Date.now() - new Date(c.dueDate).getTime()) / 86_400_000
                        );
                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3">
                              <p className="font-medium text-gray-900">
                                {t.tenant.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {t.unit ? `Unit ${t.unit.unitNumber}` : "—"}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {t.property.title}
                            </td>
                            <td className="px-5 py-3 font-medium text-gray-900">
                              {formatUGX(c.amount)}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {new Date(c.dueDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge[c.status] || statusBadge.PENDING}`}
                              >
                                {c.status === "OVERDUE" ? (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    Overdue {daysLate > 0 ? `${daysLate}d` : ""}
                                  </>
                                ) : (
                                  c.status.toLowerCase()
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LandlordPageLayout>
  );
}
