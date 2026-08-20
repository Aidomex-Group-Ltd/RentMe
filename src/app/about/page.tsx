import type { Metadata } from "next";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";
import { Shield, Users, Home, MapPin, Heart, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about RentMe — Uganda's trusted rental housing marketplace connecting tenants with landlords.",
};

const values = [
  {
    icon: Shield,
    title: "Trust & Safety",
    description:
      "Every listing is reviewed before going live. We verify landlords and protect tenants from scams.",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "Built for Uganda, by people who understand the local rental market and its unique challenges.",
  },
  {
    icon: Home,
    title: "Quality Listings",
    description:
      "Detailed property information, verified photos, and transparent pricing help you make informed decisions.",
  },
  {
    icon: Heart,
    title: "Direct Connections",
    description:
      "No middlemen. Message landlords directly, schedule viewings, and find your next home.",
  },
];

export default function AboutPage() {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76] py-16 sm:py-20">
        <div className="page-container text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl font-display">
            About RentMe
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Uganda&apos;s trusted rental marketplace. We&apos;re on a mission to make
            finding a home simple, safe, and transparent.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="section">
        <div className="page-container max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 font-display">Our Story</h2>
          <div className="prose prose-gray mt-4 space-y-4 text-gray-600">
            <p>
              RentMe was born out of a simple frustration: finding a rental home in Uganda
              was unnecessarily difficult. Scattered listings, unreliable agents, fake
              photos, and hidden fees made the process stressful and time-consuming.
            </p>
            <p>
              We built RentMe to change that. Our platform brings together verified
              properties from across Uganda — from single rooms in Kampala to luxury
              villas in Kololo — all in one place with transparent pricing and direct
              landlord contact.
            </p>
            <p>
              Today, RentMe serves thousands of tenants and landlords across Kampala,
              Wakiso, Mukono, Entebbe, Jinja, and beyond. Whether you&apos;re a student
              looking for an affordable room or a family searching for a forever home,
              RentMe helps you find the right match.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section bg-[#f4f6fa]">
        <div className="page-container">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 font-display">
            What We Stand For
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e3f0ed] text-[#2a7f6e]">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{v.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#1a4d42]">
        <div className="page-container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white font-display sm:text-3xl">
            Ready to find your next home?
          </h2>
          <p className="mb-8 text-white/80">
            Browse thousands of verified properties across Uganda.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#1a4d42] shadow-sm transition-all hover:bg-gray-50"
          >
            Browse Properties
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </MainLayout>
  );
}
