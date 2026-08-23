/** @type {import('next').NextConfig} */

// Dev needs 'unsafe-eval' for React Refresh/HMR and ws: for hot reload;
// production stays strict.
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  // Standalone output for minimal production Docker images
  output: "standalone",

  // Overridable so CI/verification builds can run alongside a live
  // `next dev` without the two processes corrupting each other's .next
  // (e.g., NEXT_DIST_DIR=.next-prod npm run build && next start).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Security headers (applied in production)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js requires inline bootstrap scripts in production;
              // dev additionally needs eval for React Refresh.
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://images.unsplash.com https://plus.unsplash.com https://*.r2.dev https://*.r2.cloudflarestorage.com blob: data:",
              "font-src 'self'",
              `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
              "media-src 'self' https://images.unsplash.com",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
