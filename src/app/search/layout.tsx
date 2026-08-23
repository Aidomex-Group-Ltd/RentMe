import type { Metadata } from "next";

/**
 * Public search experience — crawlable, shareable, bookmarkable.
 * Filters live in the URL (/search?location=…&bedrooms=…&maxRent=…) so
 * guests can save and restore searches without an account.
 */
export const metadata: Metadata = {
  title: "Search Houses for Rent in Uganda | RentMe",
  description:
    "Browse verified houses, apartments, and rooms for rent across Uganda. Filter by district, price, bedrooms, and amenities — no account needed to search.",
  keywords: [
    "rent Uganda",
    "houses for rent Kampala",
    "apartments Uganda",
    "property search Uganda",
    "RentMe",
  ],
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Find Houses for Rent in Uganda | RentMe",
    description:
      "Search verified rental homes across all Ugandan districts. Filter by location, rent, bedrooms and amenities — free, no signup required.",
    url: "/search",
    siteName: "RentMe",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
