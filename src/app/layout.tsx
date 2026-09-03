import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import SupportChatbot from "@/components/support/support-chatbot";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// Self-hosted Inter + Plus Jakarta Sans (same families as before) so production
// builds do not depend on fonts.gstatic.com at build time.
const inter = localFont({
  src: [
    { path: "../fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = localFont({
  src: [
    {
      path: "../fonts/plus-jakarta-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/plus-jakarta-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — Your Sure Property Solution`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "property Uganda",
    "houses for sale Uganda",
    "land for sale Uganda",
    "apartments for rent Uganda",
    "cars for hire Uganda",
    "commercial property Uganda",
    "UGX property",
    "Uganda real estate",
    "Kampala properties",
    "Entebbe listings",
    "Jinja land",
    "Mbarara farms",
    "Gulu property",
  ],
  authors: [{ name: BRAND.name }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/rentmesh-16.png", type: "image/png", sizes: "16x16" },
      { url: "/icons/rentmesh-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/rentmesh-48.png", type: "image/png", sizes: "48x48" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    ],
    other: [
      { url: "/icons/rentmesh-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/rentmesh-512.png", type: "image/png", sizes: "512x512" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.name,
  },
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: BRAND.websiteUrl,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: [
      {
        url: "/icons/rentmesh-512.png",
        width: 512,
        height: 512,
        alt: `${BRAND.name} — Uganda's Property and Dealership Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: ["/icons/rentmesh-512.png"],
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
  themeColor: "#022b59",
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
        <SupportChatbot />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
