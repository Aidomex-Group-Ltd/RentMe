import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type SafetyLevel = "none" | "caution" | "warning" | "danger";

export interface ScamAlertProps {
  level: SafetyLevel;
  title: string;
  messages: string[];
  className?: string;
}

const LEVEL_STYLE: Record<Exclude<SafetyLevel, "none">, string> = {
  caution: "border-amber-200 bg-amber-50 text-amber-950",
  warning: "border-red-200 bg-red-50 text-red-950",
  danger: "border-red-300 bg-red-100 text-red-950",
};

export default function ScamAlert({ level, title, messages, className }: ScamAlertProps) {
  if (level === "none" || messages.length === 0) return null;

  const Icon = level === "caution" ? AlertTriangle : ShieldAlert;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border p-4",
        LEVEL_STYLE[level],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {messages.map((message) => (
              <li key={message}>• {message}</li>
            ))}
          </ul>
          <Link href="/safety" className="mt-3 inline-block text-sm font-medium underline underline-offset-2">
            Safety tips
          </Link>
        </div>
      </div>
    </div>
  );
}
