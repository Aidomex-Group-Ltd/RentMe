import type { Metadata } from "next";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using the Erikot Properties rental marketplace.",
};

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="border-b border-gray-100 bg-white">
          <div className="page-container py-8">
            <h1 className="text-3xl font-bold text-gray-900 font-display">Terms of Service</h1>
            <p className="mt-2 text-sm text-gray-500">Last updated: August 20, 2026</p>
          </div>
        </div>

        <div className="page-container max-w-3xl py-10">
          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">1. Acceptance of Terms</h2>
              <p>
                By creating an account or using Erikot Properties, you agree to these Terms of Service. If you do not agree,
                do not use the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">2. About Erikot Properties</h2>
              <p>
                Erikot Properties is an online marketplace that helps tenants find rental housing and helps landlords and
                agents list properties in Uganda. We are not a party to rental agreements between users and do not
                guarantee that any listing, user, or transaction will meet your expectations.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">3. Accounts</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>You must provide accurate registration information</li>
                <li>You are responsible for activity under your account</li>
                <li>You must be legally able to enter binding agreements in Uganda</li>
                <li>We may suspend or terminate accounts that violate these terms</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">4. Listings and Conduct</h2>
              <p>Users agree not to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Post false, misleading, or fraudulent listings</li>
                <li>Harass, scam, or discriminate against other users</li>
                <li>Collect deposits or payments outside lawful and transparent arrangements</li>
                <li>Upload illegal content, malware, or content you do not have rights to share</li>
                <li>Attempt to disrupt or reverse engineer the service</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">5. Fees</h2>
              <p>
                Some landlord or agent features may require paid plans or fees. Pricing, if applicable, will be
                shown before purchase. Taxes and third-party payment charges may apply.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">6. Safety</h2>
              <p>
                Always verify properties and counterparties before paying money or signing agreements. Visit
                properties in person when possible, and report suspicious activity through the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">7. Disclaimer and Liability</h2>
              <p>
                Erikot Properties is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent
                permitted by law, we are not liable for disputes between users, property condition, rental outcomes,
                or losses arising from reliance on user-generated content.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">8. Changes</h2>
              <p>
                We may update these terms from time to time. Continued use of Erikot Properties after changes take effect
                means you accept the updated terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 font-display">9. Contact</h2>
              <p>
                Questions about these terms can be sent to{" "}
                <a href="mailto:hello@rentme.ug" className="font-medium text-brand-600 hover:underline">
                  hello@rentme.ug
                </a>
                .
              </p>
              <p>
                Review our{" "}
                <Link href="/privacy" className="font-medium text-brand-600 hover:underline">
                  Privacy Policy
                </Link>{" "}
                for how we handle personal data.
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
