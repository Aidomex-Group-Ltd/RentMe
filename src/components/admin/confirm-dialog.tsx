"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "neutral";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
      : tone === "warning"
        ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
        : "bg-brand-600 hover:bg-brand-700 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/40"
        aria-label="Close dialog"
        onClick={() => !loading && onCancel()}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              tone === "danger"
                ? "bg-red-50 text-red-600"
                : tone === "warning"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-brand-50 text-brand-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            <p id={descId} className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !loading && onCancel()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmClass}`}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
