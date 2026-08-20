import type { Metadata } from "next";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";
import {
  Home,
  Camera,
  DollarSign,
  MessageSquare,
  Shield,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Landlord Guide",
  description:
    "Learn how to list your property on RentMe and find quality tenants in Uganda.",
};

const steps = [
  {
    icon: Home,
    title: "List Your Property",
    description:
      "Create a free account as a landlord and fill out your property details — type, location, rent, and amenities. The more detail you provide, the more enquiries you'll receive.",
  },
  {
    icon: Camera,
    title: "Upload Quality Photos",
    description:
      "Properties with photos get 5x more views. Take clear, well-lit photos of each room, the exterior, and any unique features. Include at least 3 photos.",
  },
  {
    icon: DollarSign,
    title: "Set a Fair Price",
    description:
      "Research comparable listings in your area on RentMe. Overpriced properties sit empty longer. Consider including utilities in your rent for better value perception.",
  },
  {
    icon: MessageSquare,
    title: "Respond Quickly",
    description:
      "Landlords who respond within 2 hours are 3x more likely to fill their property. Enable notifications so you never miss a tenant enquiry.",
  },
  {
    icon: Shield,
    title: "Verify Your Listing",
    description:
      "Verified listings get a badge and higher placement in search results. Submit your verification documents to build tenant trust.",
  },
];

const tips = [
  "Keep your listing updated — mark properties as rented when filled",
  "Include your availability date so tenants know when they can move in",
  "Be transparent about any additional fees (service charge, agency fee)",
  "Respond to viewing requests promptly and professionally",
  "Keep photos current — don't use outdated images",
  "Specify whether the property is self-contained, furnished, or has parking",
];

export default function LandlordGuidePage() {
  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76] py-16 sm:py-20">
        <div className="page-container text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl font-display">
            Landlord Guide
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Everything you need to know about listing your property on RentMe and
            finding quality tenants.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="section">
        <div className="page-container max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 font-display">
            How to List Your Property
          </h2>
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1f6d5e] text-lg font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <step.icon className="h-5 w-5 text-[#1f6d5e]" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="section bg-[#f4f6fa]">
        <div className="page-container max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 font-display">
            Tips for a Successful Listing
          </h2>
          <div className="card p-6">
            <ul className="space-y-4">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#1f6d5e]" />
                  <span className="text-gray-600">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#1a4d42]">
        <div className="page-container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white font-display sm:text-3xl">
            Ready to list your property?
          </h2>
          <p className="mb-8 text-white/80">
            Create your first listing for free and start receiving enquiries today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#1a4d42] shadow-sm transition-all hover:bg-gray-50"
          >
            List Your Property
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
