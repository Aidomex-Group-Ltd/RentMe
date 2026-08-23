"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Filter,
  File,
  FileImage,
  FileSpreadsheet,
} from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import TenantSidebar from "@/components/tenant/tenant-sidebar";
import { timeAgo } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  { value: "", label: "All Documents" },
  { value: "lease", label: "Leases" },
  { value: "receipt", label: "Receipts" },
  { value: "notice", label: "Notices" },
  { value: "id_document", label: "ID Documents" },
  { value: "inspection_report", label: "Inspection Reports" },
  { value: "other", label: "Other" },
];

type TenancyOption = {
  id: string;
  property: { title: string };
  unit: { unitNumber: string } | null;
};

type Document = {
  id: string;
  name: string;
  category: string | null;
  url: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  uploader: { id: string; name: string };
};

export default function TenantDocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenancies, setTenancies] = useState<TenancyOption[]>([]);
  const [selectedTenancy, setSelectedTenancy] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") fetchTenancies();
  }, [status]);

  useEffect(() => {
    if (selectedTenancy) fetchDocuments();
  }, [selectedTenancy, categoryFilter]);

  async function fetchTenancies() {
    try {
      const res = await fetch("/api/tenancies?limit=50");
      if (res.ok) {
        const data = await res.json();
        const list = data.tenancies || [];
        setTenancies(list);
        const active = list.find((t: any) =>
          ["ACTIVE", "NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"].includes(t.status)
        );
        if (active) setSelectedTenancy(active.id);
        else if (list.length > 0) setSelectedTenancy(list[0].id);
        else setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  async function fetchDocuments() {
    if (!selectedTenancy) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenancyId: selectedTenancy });
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/tenancy-documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }

  function getFileIcon(mimeType: string | null) {
    if (!mimeType) return FileText;
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return FileSpreadsheet;
    return FileText;
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const grouped = documents.reduce(
    (acc, doc) => {
      const cat = doc.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>
  );

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 md:pl-64">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-display">Documents</h1>
                <p className="mt-1 text-gray-500">Leases, receipts, and tenancy documents</p>
              </div>
            </div>

            {/* Navigation Sidebar */}
            <div className="mt-6">
              <TenantSidebar />
            </div>
          </div>
        </div>

        <div className="page-container max-w-4xl py-8">

        {/* Tenancy Selector */}
        {tenancies.length > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">Select Tenancy</label>
            <select
              value={selectedTenancy}
              onChange={(e) => setSelectedTenancy(e.target.value)}
              className="input mt-1"
            >
              {tenancies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.property.title}
                  {t.unit ? ` · Unit ${t.unit.unitNumber}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategoryFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                categoryFilter === opt.value
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Documents */}
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="mt-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">No documents</p>
            <p className="mt-1 text-sm text-gray-400">
              Documents shared by your landlord will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {Object.entries(grouped).map(([category, docs]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  {category}
                </h3>
                <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                  {docs.map((doc) => {
                    const Icon = getFileIcon(doc.mimeType);
                    return (
                      <div key={doc.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded by {doc.uploader.name} · {timeAgo(doc.createdAt)}
                            {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
                          </p>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
