"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import AdminPageHeader from "@/components/admin/admin-page-header";
import StatusBadge from "@/components/admin/status-badge";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
}

interface ConfirmAction {
  user: AdminUser;
  status: "SUSPENDED" | "BANNED" | "ACTIVE";
}

const PAGE_SIZE = 20;

function actionCopy(action: ConfirmAction): {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "danger" | "warning" | "neutral";
  success: string;
} {
  const who = action.user.name || action.user.email || "this user";
  if (action.status === "SUSPENDED") {
    return {
      title: "Suspend user",
      description: `Suspend ${who}? They will lose access until restored. This can be reversed.`,
      confirmLabel: "Suspend",
      tone: "warning",
      success: "User suspended",
    };
  }
  if (action.status === "BANNED") {
    return {
      title: "Ban user",
      description: `Ban ${who}? They will be blocked from the platform. This can be reversed by restoring the account.`,
      confirmLabel: "Ban",
      tone: "danger",
      success: "User banned",
    };
  }
  return {
    title: "Restore user",
    description: `Restore ${who} to active status? They will regain platform access immediately.`,
    confirmLabel: "Restore",
    tone: "neutral",
    success: "User restored",
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setError("Unable to load users. Please try again.");
      toast.error("Unable to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyStatus() {
    if (!confirm) return;
    setActing(true);
    const copy = actionCopy(confirm);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: confirm.user.id, status: confirm.status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to update user"
        );
      }
      toast.success(copy.success);
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Users"
        description={`${total.toLocaleString()} accounts on the platform`}
        actions={
          <button type="button" onClick={load} className="btn-secondary text-sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                placeholder="Search name, email, or phone…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    setSearch(searchInput.trim());
                  }
                }}
                className="input pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="input w-auto"
                aria-label="Filter by role"
              >
                <option value="">All roles</option>
                <option value="TENANT">Tenant</option>
                <option value="LANDLORD">Landlord</option>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="input w-auto"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
                <option value="PENDING_VERIFICATION">Pending verification</option>
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {loading && users.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-gray-200 bg-white" />
            ))}
          </div>
        ) : error && users.length === 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={load} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No users match these filters</p>
            <p className="mt-1 text-sm text-gray-500">
              Try clearing search or role/status filters to see more accounts.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
              <table className="w-full">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email || user.phone || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700">{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserActions user={user} onAction={setConfirm} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked list */}
            <ul className="space-y-2 md:hidden">
              {users.map((user) => (
                <li key={user.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="truncate text-xs text-gray-500">{user.email || user.phone || "—"}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {user.role} · Joined {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={user.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <UserActions user={user} onAction={setConfirm} />
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary text-xs"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary text-xs"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          open
          title={actionCopy(confirm).title}
          description={actionCopy(confirm).description}
          confirmLabel={actionCopy(confirm).confirmLabel}
          tone={actionCopy(confirm).tone}
          loading={acting}
          onConfirm={applyStatus}
          onCancel={() => !acting && setConfirm(null)}
        />
      )}
    </div>
  );
}

function UserActions({
  user,
  onAction,
}: {
  user: AdminUser;
  onAction: (a: ConfirmAction) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {user.status === "ACTIVE" ? (
        <button
          type="button"
          onClick={() => onAction({ user, status: "SUSPENDED" })}
          className="text-xs font-medium text-amber-700 hover:underline"
        >
          Suspend
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAction({ user, status: "ACTIVE" })}
          className="text-xs font-medium text-green-700 hover:underline"
        >
          Restore
        </button>
      )}
      {user.status !== "BANNED" && (
        <button
          type="button"
          onClick={() => onAction({ user, status: "BANNED" })}
          className="text-xs font-medium text-red-600 hover:underline"
        >
          Ban
        </button>
      )}
    </div>
  );
}
