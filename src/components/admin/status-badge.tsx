import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-green-50 text-green-800 ring-green-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  danger: "bg-red-50 text-red-800 ring-red-600/20",
  neutral: "bg-gray-100 text-gray-700 ring-gray-500/20",
  info: "bg-blue-50 text-blue-800 ring-blue-600/20",
};

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  VERIFIED: "success",
  APPROVED: "success",
  RESOLVED: "success",
  RENTED: "info",
  PENDING: "warning",
  UNDER_REVIEW: "warning",
  PENDING_REVIEW: "warning",
  PENDING_VERIFICATION: "warning",
  DRAFT: "neutral",
  ARCHIVED: "neutral",
  DISMISSED: "neutral",
  UNVERIFIED: "neutral",
  SUSPENDED: "danger",
  REJECTED: "danger",
  BANNED: "danger",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone = STATUS_TONE[status] || "neutral";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE_CLASS[tone],
        className
      )}
      title={label}
    >
      <span className="sr-only">Status: </span>
      {label}
    </span>
  );
}
