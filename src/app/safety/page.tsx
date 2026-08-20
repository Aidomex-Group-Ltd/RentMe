import type { Metadata } from "next";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";
import {
  Shield,
  AlertTriangle,
  Eye,
  Lock,
  Phone,
  MapPin,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Safety Tips",
  description:
    "Stay safe when renting in Uganda. Tips for tenants and landlords on RentMe.",
};

const tenantTips = [
  {
    icon: Eye,
    title: "Visit in Person",
    description:
      "Always view a property in person before making any payment. Never send money for a property you haven't seen.",
  },
  {
    icon: Lock,
    title: "Verify the Landlord",
    description:
      "Look for the verified badge on listings. Verified landlords have been checked by the RentMe team.",
  },
  {
    icon: Phone,
    title: "Communicate on RentMe",
    description:
      "Keep conversations on the platform. This creates a record and helps our team assist if issues arise.",
  },
  {
    icon: AlertTriangle,
    title: "Never Pay Before Viewing",
    description:
      "Legitimate landlords will never ask for payment before you've seen the property and signed an agreement.",
  },
  {
    icon: MapPin,
    title: "Check the Location",
    description:
      "Verify the property is in the stated location. Use Google Maps or visit the area beforehand.",
  },
  {
    icon: Shield,
    title: "Get a Written Agreement",
    description:
      "Always get a written tenancy agreement. It protects both you and the landlord.",
  },
];

const landlordTips = [
  {
    icon: Eye,
    title: "Screen Tenants",
    description:
      "Request references and verify tenant identity before signing a lease.",
  },
  {
    icon: Lock,
    title: "Use Official Payments",
    description:
      "Accept payments through traceable methods. Keep records of all transactions.",
  },
  {
    icon: Phone,
    title: "Meet at the Property",
    description:
      "Always conduct viewings at the property itself, not at your home or office.",
  },
  {
    icon: Shield,
    title: "Protect Your Information",
    description:
      "Don't share personal financial details. Use RentMe's messaging for communication.",
  },
];

const warningSigns = [
  "Requests for upfront payment before viewing",
  "Pressure to make immediate decisions",
  "Price significantly below market rate",
  "Refusal to show the property in person",
  "Requests to wire money to a bank account",
  "Landlord is always \"out of the country\"",
  "Requests for unusual payment methods (gift cards, crypto)",
  "Listings with stock photos or stolen images",
];

export default function SafetyPage() {
  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76] py-16 sm:py-20">
        <div className="page-container text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl font-display">
            Safety Tips
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Your safety is our priority. Follow these tips to protect yourself
            when renting or listing properties.
          </p>
        </div>
      </section>

      {/* Tenant Safety */}
      <section className="section">
        <div className="page-container max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 font-display">
            For Tenants
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tenantTips.map((tip) => (
              <div key={tip.title} className="card p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#2a7f6e]">
                  <tip.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{tip.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Landlord Safety */}
      <section className="section bg-[#f4f6fa]">
        <div className="page-container max-w-4xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 font-display">
            For Landlords
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {landlordTips.map((tip) => (
              <div key={tip.title} className="card p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#2a7f6e]">
                  <tip.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{tip.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Warning Signs */}
      <section className="section">
        <div className="page-container max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 font-display">
            Warning Signs of Scams
          </h2>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {warningSigns.map((sign) => (
                <li key={sign} className="flex items-start gap-3 px-6 py-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <span className="text-gray-600">{sign}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            If you encounter any of these signs, please{" "}
            <Link href="/contact" className="text-brand-600 hover:underline">
              report the listing
            </Link>{" "}
            to our team immediately.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#1a4d42]">
        <div className="page-container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white font-display sm:text-3xl">
            Stay safe on RentMe
          </h2>
          <p className="mb-8 text-white/80">
            Report suspicious listings or users to keep our community safe.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#1a4d42] shadow-sm transition-all hover:bg-gray-50"
          >
            Contact Support
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
