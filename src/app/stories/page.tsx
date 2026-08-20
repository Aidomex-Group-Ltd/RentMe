import type { Metadata } from "next";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";
import { Star, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Success Stories",
  description:
    "Read how tenants and landlords have found success through RentMe Uganda.",
};

const stories = [
  {
    name: "Sarah Nakamya",
    role: "Tenant",
    location: "Ntinda, Kampala",
    quote:
      "I moved to Kampala for work and needed a place fast. RentMe had dozens of options in my budget. I found my apartment in 2 days and moved in within a week.",
    rating: 5,
  },
  {
    name: "David Okello",
    role: "Landlord",
    location: "Bugolobi, Kampala",
    quote:
      "I was struggling to find tenants for my two-bedroom flat. Within a week of listing on RentMe, I had 5 viewing requests and filled the property in 10 days.",
    rating: 5,
  },
  {
    name: "Grace Achieng",
    role: "Tenant",
    location: "Entebbe",
    quote:
      "Moving from Nairobi to Entebbe, I needed to find housing remotely. RentMe's photos and direct messaging made it possible to secure a place before I even arrived.",
    rating: 5,
  },
  {
    name: "James Ssemanda",
    role: "Landlord",
    location: "Muyenga, Kampala",
    quote:
      "As a landlord with 4 properties, RentMe's dashboard makes it easy to manage all my listings in one place. The tenant quality has been consistently good.",
    rating: 5,
  },
  {
    name: "Aisha Namutebi",
    role: "Tenant",
    location: "Kololo, Kampala",
    quote:
      "I was tired of dealing with agents who charged fees for nothing. RentMe connected me directly with the landlord. No middlemen, no surprises.",
    rating: 5,
  },
  {
    name: "Patrick Mugisha",
    role: "Agent",
    location: "Wakiso",
    quote:
      "Managing properties for multiple owners used to be chaos. RentMe gives me a centralized view of all listings and tenant communications.",
    rating: 5,
  },
];

export default function StoriesPage() {
  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-[#1a4d42] via-[#1f6d5e] to-[#2f8b76] py-16 sm:py-20">
        <div className="page-container text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl font-display">
            Success Stories
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Real stories from tenants, landlords, and agents who found success
            through RentMe.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="page-container">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <div key={story.name} className="card p-6">
                <div className="flex items-center gap-1">
                  {[...Array(story.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <blockquote className="mt-4 text-gray-600">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="font-semibold text-gray-900">{story.name}</p>
                  <p className="text-sm text-gray-500">
                    {story.role} · {story.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#1a4d42]">
        <div className="page-container text-center">
          <h2 className="mb-4 text-2xl font-bold text-white font-display sm:text-3xl">
            Join thousands of happy users
          </h2>
          <p className="mb-8 text-white/80">
            Whether you&apos;re looking for a home or listing a property, RentMe
            makes it simple.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#1a4d42] shadow-sm transition-all hover:bg-gray-50"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Browse Properties
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
