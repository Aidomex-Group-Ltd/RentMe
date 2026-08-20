/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for minimal production Docker images
  output: "standalone",

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
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: only same-origin, no eval, no inline
              "script-src 'self'",
              // Styles: allow inline (Tailwind utility classes) + same-origin
              "style-src 'self' 'unsafe-inline'",
              // Images: self, Unsplash, Cloudflare R2, data: URIs (for small icons)
              "img-src 'self' https://images.unsplash.com https://plus.unsplash.com https://*.r2.dev https://*.r2.cloudflarestorage.com data:",
              // Fonts: self-hosted woff2 only
              "font-src 'self'",
              // API / XHR: same-origin only
              "connect-src 'self'",
              // Media: self + Unsplash video
              "media-src 'self' https://images.unsplash.com",
              // Frame: same-origin only (no embedding elsewhere)
              "frame-src 'self'",
              // Base tag
              "base-uri 'self'",
              // Form targets: same-origin
              "form-action 'self'",
              // Prevent iframe clickjacking (redundant with X-Frame-Options)
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
