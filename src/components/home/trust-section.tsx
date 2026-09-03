import {
  ShieldCheck,
  Lock,
  Eye,
  Flag,
  Users,
  CheckCircle,
} from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Verified listings",
    description: "Every property is reviewed before going live. Verified badges indicate landlord identity has been confirmed.",
  },
  {
    icon: Lock,
    title: "Secure messaging",
    description: "All communication stays on-platform for your protection and to maintain a clear record.",
  },
  {
    icon: Eye,
    title: "Scam detection",
    description: "Our team actively monitors for suspicious listings and removes fraudulent content.",
  },
  {
    icon: Flag,
    title: "Community reporting",
    description: "See something suspicious? Report it instantly. Reports are reviewed within 24 hours.",
  },
  {
    icon: Users,
    title: "Trusted community",
    description: "Over 5,000 active clients and hundreds of verified owners across Uganda.",
  },
  {
    icon: CheckCircle,
    title: "Free to browse",
    description: "No account needed to search. Browse properties, compare prices, and shortlist freely.",
  },
];

export default function TrustSection() {
  return (
    <section className="bg-slate-900 py-16 sm:py-20">
      <div className="page-container">
        {/* Section header */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80">
            <ShieldCheck className="h-3.5 w-3.5" />
            Trust & safety
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Rent with confidence
          </h2>
          <p className="mt-3 text-lg text-slate-400">
            Your safety is our priority. Here is how we protect you.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-200 hover:bg-white/10 hover:border-white/20"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
