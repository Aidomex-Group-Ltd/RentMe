import {
  Search,
  CalendarCheck,
  FileText,
  Key,
  Building,
  Users,
  BarChart3,
  Shield,
} from "lucide-react";

const RENTER_STEPS = [
  {
    icon: Search,
    title: "Search",
    description: "Browse verified listings by location, price, and type.",
  },
  {
    icon: CalendarCheck,
    title: "Visit",
    description: "Schedule viewings directly through the platform.",
  },
  {
    icon: FileText,
    title: "Apply",
    description: "Submit your application with a preferred move-in date.",
  },
  {
    icon: Key,
    title: "Move in",
    description: "Sign your lease and start your new chapter.",
  },
];

const OWNER_STEPS = [
  {
    icon: Building,
    title: "List",
    description: "Create your property listing with photos and details.",
  },
  {
    icon: Shield,
    title: "Verify",
    description: "Get verified to build trust with potential tenants.",
  },
  {
    icon: Users,
    title: "Connect",
    description: "Review applications and schedule viewings.",
  },
  {
    icon: BarChart3,
    title: "Manage",
    description: "Track payments, maintenance, and tenant communications.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="page-container">
        {/* Section header */}
        <div className="mb-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
            Simple process
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            How Rent Mesh works
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Whether you are looking for a home or listing a property.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-12 lg:grid-cols-2">
          {/* For Renters */}
          <div>
            <h3 className="mb-8 text-center text-xl font-bold text-slate-900 lg:text-left">
              For renters
            </h3>
            <div className="relative">
              {/* Vertical line connector */}
              <div className="absolute left-6 top-0 bottom-0 hidden w-px bg-slate-200 lg:block" />

              <div className="space-y-6">
                {RENTER_STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className="group flex items-start gap-5"
                  >
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition-all duration-200 group-hover:bg-brand-400 group-hover:shadow-brand-400/30 group-hover:scale-105">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-slate-300">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-brand-500">
                          Step {i + 1}
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-bold text-slate-900">
                        {step.title}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* For Owners */}
          <div>
            <h3 className="mb-8 text-center text-xl font-bold text-slate-900 lg:text-left">
              For property owners
            </h3>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 hidden w-px bg-slate-200 lg:block" />

              <div className="space-y-6">
                {OWNER_STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className="group flex items-start gap-5"
                  >
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-lg shadow-slate-800/20 transition-all duration-200 group-hover:bg-slate-700 group-hover:scale-105">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-slate-300">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">
                          Step {i + 1}
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-bold text-slate-900">
                        {step.title}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
