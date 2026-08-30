import {
  CreditCard,
  FileText,
  Wrench,
  MessageSquare,
  Calendar,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

const FEATURES = [
  {
    icon: CreditCard,
    title: "Rent payments",
    description: "Track payment status, due dates, and history.",
    color: "emerald",
  },
  {
    icon: FileText,
    title: "Lease documents",
    description: "Access your agreement, receipts, and notices.",
    color: "blue",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    description: "Report issues and track repair progress.",
    color: "amber",
  },
  {
    icon: MessageSquare,
    title: "Messages",
    description: "Direct communication with your landlord.",
    color: "purple",
  },
  {
    icon: Calendar,
    title: "Move-in tracker",
    description: "Know exactly where you are in the process.",
    color: "brand",
  },
  {
    icon: Shield,
    title: "Secure docs",
    description: "All your tenancy documents in one place.",
    color: "slate",
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
  brand: { bg: "bg-brand-50", text: "text-brand-600", iconBg: "bg-brand-100" },
  slate: { bg: "bg-slate-100", text: "text-slate-600", iconBg: "bg-slate-200" },
};

export default function TenantPreview() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Text */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
              <Shield className="h-3.5 w-3.5" />
              Tenant dashboard
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Your tenancy, organized
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Everything a tenant needs — payments, documents, maintenance, and
              messages — in a clean, mobile-friendly dashboard.
            </p>

            {/* Feature list */}
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => {
                const colors = COLOR_MAP[f.color];
                return (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.iconBg} ${colors.text}`}>
                      <f.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{f.title}</p>
                      <p className="text-xs text-slate-500">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dashboard preview mock */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-1 shadow-xl">
              <div className="overflow-hidden rounded-[20px] bg-white">
                {/* Mock header */}
                <div className="border-b border-slate-100 bg-white px-5 py-4">
                  <p className="text-sm font-bold text-slate-900">My Tenancy</p>
                  <p className="text-xs text-slate-500">Kololo Heights, Apt 3B</p>
                </div>

                {/* Status cards */}
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div className="rounded-xl bg-emerald-50 p-3.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">Paid</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-emerald-800">UGX 2.5M</p>
                    <p className="text-[11px] text-emerald-600">September rent</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3.5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-700">Due</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-amber-800">Oct 1</p>
                    <p className="text-[11px] text-amber-600">Next payment</p>
                  </div>
                </div>

                {/* Activity list */}
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent</p>
                  <div className="mt-2 space-y-2.5">
                    {[
                      { icon: Wrench, label: "Maintenance request resolved", time: "2 days ago", color: "text-emerald-500" },
                      { icon: MessageSquare, label: "New message from landlord", time: "3 days ago", color: "text-blue-500" },
                      { icon: FileText, label: "Lease renewal reminder", time: "5 days ago", color: "text-purple-500" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alert banner */}
                <div className="mx-4 mb-4 mt-2 flex items-center gap-2.5 rounded-lg bg-blue-50 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
                  <p className="text-xs text-blue-700">
                    Your lease expires in 45 days. Start renewal early.
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="absolute -inset-4 -z-10 rounded-[40px] bg-gradient-to-br from-brand-100/40 to-transparent blur-2xl" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
