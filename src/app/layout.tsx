import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RentMe — Find Your Next Home in Uganda",
    template: "%s | RentMe",
  },
  description:
    "RentMe is Uganda's trusted rental housing marketplace. Find houses, apartments, and rooms for rent in Kampala, Wakiso, Mukono, and across Uganda.",
  keywords: [
    "rent house Uganda",
    "apartment Kampala",
    "rental property Uganda",
    "houses for rent",
    "UGX rent",
    "Uganda real estate",
    "Kampala apartments",
    "Wakiso rentals",
  ],
  authors: [{ name: "RentMe" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RentMe",
  },
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: "https://rentme.ug",
    siteName: "RentMe",
    title: "RentMe — Find Your Next Home in Uganda",
    description:
      "Uganda's trusted rental housing marketplace. Find houses, apartments, and rooms for rent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RentMe — Find Your Next Home in Uganda",
    description: "Uganda's trusted rental housing marketplace.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#172554",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
