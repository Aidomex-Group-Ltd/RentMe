import type { Metadata } from "next";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Rent Mesh pricing — list your property for free or upgrade for premium visibility.",
};

const plans = [
  {
    name: "Free",
    price: "UGX 0",
    period: "forever",
    description: "Get started with a basic listing on Rent Mesh.",
    features: [
      "1 active property listing",
      "Up to 5 photos per listing",
      "Basic property details",
      "Direct tenant messaging",
      "Standard search placement",
    ],
    cta: "List for Free",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "UGX 50,000",
    period: "/month",
    description: "Get more visibility and attract quality tenants faster.",
    features: [
      "Up to 10 active listings",
      "Up to 20 photos per listing",
      "Featured placement in search results",
      "Priority in homepage carousel",
      "Landlord verification badge",
      "Advanced analytics dashboard",
      "Priority support",
    ],
    cta: "Go Premium",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Agent",
    price: "UGX 150,000",
    period: "/month",
    description: "For property managers and agencies managing multiple properties.",
    features: [
      "Unlimited property listings",
      "Up to 20 photos per listing",
      "Featured placement in search results",
      "Homepage carousel inclusion",
      "Agent verification badge",
      "Full analytics dashboard",
      "Team member access",
      "Dedicated account manager",
      "API access",
    ],
    cta: "Become an Agent",
    href: "/register",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76] py-16 sm:py-20">
        <div className="page-container text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl font-display">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            List your first property for free. Upgrade when you&apos;re ready for more
            visibility.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="page-container">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card relative overflow-hidden p-6 sm:p-8 ${
                  plan.highlighted
                    ? "border-2 border-[#1f6d5e] shadow-lg"
                    : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute right-4 top-4 rounded-full bg-[#1f6d5e] px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 font-display">
                  {plan.name}
                </h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1f6d5e]" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`mt-8 block text-center ${
                    plan.highlighted ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 inline h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-[#f4f6fa]">
        <div className="page-container max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 font-display">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Is listing really free?",
                a: "Yes. Your first listing is completely free with no hidden charges. You can upgrade to Premium or Agent plans for additional features.",
              },
              {
                q: "Can I upgrade later?",
                a: "Absolutely. You can start with a free listing and upgrade at any time. Your existing listings will be preserved.",
              },
              {
                q: "How do payments work?",
                a: "We accept Mobile Money (MTN, Airtel) and bank transfers. Payments are processed securely through our payment partners.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Premium and Agent subscriptions can be cancelled at any time. Your listings will revert to free-tier visibility.",
              },
            ].map((faq) => (
              <div key={faq.q} className="card p-6">
                <h3 className="font-semibold text-gray-900">{faq.q}</h3>
                <p className="mt-2 text-sm text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
