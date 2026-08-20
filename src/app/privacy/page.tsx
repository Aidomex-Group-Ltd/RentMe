import type { Metadata } from "next";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How RentMe collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="border-b border-gray-100 bg-white">
          <div className="page-container py-8">
            <h1 className="text-3xl font-bold text-gray-900 font-display">Privacy Policy</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: August 20, 2026</p>
          </div>
        </div>

        <div className="page-container max-w-3xl py-10">
          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">1. Introduction</h2>
              <p>
                RentMe (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates a rental housing marketplace in Uganda.
                This Privacy Policy explains how we collect, use, store, and share personal information when you
                use our website and related services.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">2. Information We Collect</h2>
              <p>We may collect:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Account details such as name, email address, phone number, and password</li>
                <li>Profile and role information (tenant, landlord, or agent)</li>
                <li>Property listings, photos, location details, and rental terms you submit</li>
                <li>Messages, viewing requests, and application activity on the platform</li>
                <li>Device and usage data such as IP address, browser type, and pages visited</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Create and manage your account</li>
                <li>Connect tenants with landlords and agents</li>
                <li>Enable messaging, viewings, and applications</li>
                <li>Improve platform safety, prevent fraud, and enforce our policies</li>
                <li>Send service-related notifications and, where permitted, product updates</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">4. Sharing of Information</h2>
              <p>
                We do not sell your personal information. We may share limited information with other users as
                needed for rentals (for example, a landlord may see a tenant&apos;s name and contact details for a
                viewing request), with service providers who help us operate RentMe, or when required by law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">5. Data Security</h2>
              <p>
                We use reasonable technical and organizational measures to protect your information. No online
                service is completely secure, so please use a strong password and keep your login details private.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">6. Your Choices</h2>
              <p>
                You may update account information in your profile settings, request deletion of your account, or
                contact us about access and correction requests. Some information may be retained where required
                for legal, security, or operational reasons.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">7. Contact Us</h2>
              <p>
                For privacy questions, email{" "}
                <a href="mailto:hello@rentme.ug" className="font-medium text-brand-600 hover:underline">
                  hello@rentme.ug
                </a>{" "}
                or call +256 700 000 000.
              </p>
              <p>
                See also our{" "}
                <Link href="/terms" className="font-medium text-brand-600 hover:underline">
                  Terms of Service
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
