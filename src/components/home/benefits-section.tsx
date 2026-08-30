import {
  Search,
  Shield,
  CreditCard,
  Wrench,
  MessageSquare,
  BarChart3,
  Building2,
  Users,
  CheckCircle,
  FileText,
  Bell,
  Clock,
} from "lucide-react";

const RENTER_BENEFITS = [
  {
    icon: Search,
    title: "Smart search",
    description: "Filter by location, price, type, and amenities.",
  },
  {
    icon: Shield,
    title: "Verified listings",
    description: "Every property is checked before going live.",
  },
  {
    icon: CreditCard,
    title: "Clear costs",
    description: "Full move-in cost breakdown before you apply.",
  },
  {
    icon: Wrench,
    title: "Maintenance requests",
    description: "Report issues directly to your landlord.",
  },
  {
    icon: MessageSquare,
    title: "Direct messaging",
    description: "Communicate with landlords through the platform.",
  },
  {
    icon: FileText,
    title: "Digital leases",
    description: "Access your lease agreement and documents.",
  },
];

const OWNER_BENEFITS = [
  {
    icon: Building2,
    title: "Property management",
    description: "Manage all your listings from one dashboard.",
  },
  {
    icon: Users,
    title: "Tenant screening",
    description: "Review applications and tenant profiles.",
  },
  {
    icon: BarChart3,
    title: "Financial reports",
    description: "Track rent collections and payments.",
  },
  {
    icon: Bell,
    title: "Instant notifications",
    description: "Get alerted on applications, payments, and issues.",
  },
  {
    icon: Clock,
    title: "Lease management",
    description: "Track renewals, expirations, and occupancy.",
  },
  {
    icon: CheckCircle,
    title: "Verification badge",
    description: "Build trust with verified landlord status.",
  },
];

export default function BenefitsSection() {
  return (
    <>
      {/* Renter Benefits */}
      <section className="bg-white py-16 sm:py-20">
        <div className="page-container">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <Search className="h-3.5 w-3.5" />
              For renters
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Find your perfect home
            </h2>
            <p className="mt-3 text-lg text-slate-500">
              Everything you need to discover, apply for, and move into your next home.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RENTER_BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-200 hover:bg-white hover:shadow-lg hover:border-slate-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {benefit.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owner Benefits */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="page-container">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white">
              <Building2 className="h-3.5 w-3.5" />
              For property owners
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Manage with confidence
            </h2>
            <p className="mt-3 text-lg text-slate-500">
              A complete toolkit for landlords and property managers.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OWNER_BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:shadow-lg hover:border-slate-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-800 group-hover:text-white">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  {benefit.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
