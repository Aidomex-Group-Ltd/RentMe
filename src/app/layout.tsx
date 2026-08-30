import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import SupportChatbot from "@/components/support/support-chatbot";
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
    default: "Rent Mesh — Find Your Next Home in Uganda",
    template: "%s | Rent Mesh",
  },
  description:
    "Rent Mesh is Uganda's trusted rental housing marketplace. Find houses, apartments, and rooms for rent in Kampala, Wakiso, Mukono, and across Uganda.",
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
  authors: [{ name: "Rent Mesh" }],
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
    title: "Rent Mesh",
  },
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: "https://rentme.ug",
    siteName: "Rent Mesh",
    title: "Rent Mesh — Find Your Next Home in Uganda",
    description:
      "Uganda's trusted rental housing marketplace. Find houses, apartments, and rooms for rent.",
    images: [
      {
        url: "/icons/rentmesh-512.png",
        width: 512,
        height: 512,
        alt: "Rent Mesh — Uganda's Property Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rent Mesh — Find Your Next Home in Uganda",
    description: "Uganda's trusted rental housing marketplace.",
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
