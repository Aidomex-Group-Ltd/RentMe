import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 py-16 sm:py-20">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "url('/images/kampala-skyline.svg')", backgroundSize: "cover", backgroundPosition: "center bottom" }}
        aria-hidden
      />

      <div className="relative page-container text-center">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5" />
            Uganda&apos;s modern rental platform
          </div>

          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to find your place?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Join thousands of tenants and landlords who trust Rent Mesh for
            their rental needs.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/search"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-brand-700 shadow-lg transition-all duration-200 hover:bg-slate-50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Browse properties
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-[0.98]"
            >
              List your property
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-white/50">
            <span>No account needed to browse</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Free forever for tenants</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />
            <span className="hidden sm:inline">Verified properties</span>
          </div>
        </div>
      </div>
    </section>
  );
}
