import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // SAMEORIGIN: allow same-site framing; still blocks random third-party embeds of this app.
  // DENY was overly aggressive and confused debugging of embedded players.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      // Required: without frame-src, default-src blocks third-party iframes (e.g. YouTube shorts embeds).
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Workaround for Next.js 15.5.x bug: generateBuildId is called without null-check.
  // Returning null tells Next.js to use its nanoid fallback.
  generateBuildId: async () => null,
  outputFileTracingRoot: path.join(process.cwd()),

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
