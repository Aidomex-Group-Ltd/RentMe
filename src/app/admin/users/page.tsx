"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Shield, Ban, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    fetchUsers();
  }, [status, page, roleFilter, statusFilter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      toast.success(`User ${newStatus.toLowerCase()}`);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  return (
    <AdminLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-display">User Management</h1>
              <p className="text-sm text-gray-500">{total} users</p>
            </div>
          </div>
        </div>

        <div className="page-container py-6">
          {/* Filters */}
          <div className="card mb-6 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
                  className="input pl-10"
                />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-auto">
                <option value="">All Roles</option>
                <option value="TENANT">Tenant</option>
                <option value="LANDLORD">Landlord</option>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>
          </div>

          {/* Users table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email || user.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="badge bg-gray-100 text-gray-700">{user.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge ${
                            user.status === "ACTIVE" ? "badge-verified" :
                            user.status === "SUSPENDED" ? "badge-pending" :
                            "bg-red-100 text-red-800"
                          }`}>{user.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.status === "ACTIVE" ? (
                              <button
                                onClick={() => handleStatusChange(user.id, "SUSPENDED")}
                                className="text-xs text-amber-600 hover:underline"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(user.id, "ACTIVE")}
                                className="text-xs text-green-600 hover:underline"
                              >
                                Restore
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusChange(user.id, "BANNED")}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Ban
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">No users found</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
