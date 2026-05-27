/** @type {import('next').NextConfig} */
const path = require("path");

// Origins allowed to frame the /embed/* routes. Space-separated list driven by
// EMBED_ALLOWED_ANCESTORS (e.g. "'self' https://tenant.sharepoint.com").
// Defaults to 'self' only — the embed feature is opt-in per deployment.
const embedFrameAncestors = (
  process.env.EMBED_ALLOWED_ANCESTORS || "'self'"
).trim();

const nextConfig = {
  output: "standalone",
  distDir: "build",
  serverExternalPackages: [
    "@azure/storage-blob",
    "@azure/monitor-opentelemetry",
    "@opentelemetry/api",
    "@opentelemetry/instrumentation",
    "@opentelemetry/sdk-trace-base",
  ],
  images: {
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 100],
    localPatterns: [{ pathname: "/**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    turbopackUseSystemTlsCerts: true,
    // Disable the Next.js client-side router cache for dynamic routes.
    // Default is 30s, which makes /chat/[id] show stale "no assistant" state
    // for half a minute after the background generation persisted a message.
    staleTimes: {
      // Default is 30s; set 0 so /chat/[id] navigations always refetch the
      // RSC payload and pick up assistant rows persisted in the background.
      dynamic: 0,
      static: 30,
    },
  },
  async headers() {
    return [
      {
        // Embed routes may be framed by the allow-listed ancestors. We rely on
        // CSP frame-ancestors (which supports an allow-list) and deliberately
        // do NOT set X-Frame-Options here — it has no allow-list semantics and
        // CSP supersedes it in modern browsers.
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${embedFrameAncestors};`,
          },
        ],
      },
      {
        // Everything else: the app must not be framable. Negative lookahead
        // excludes /embed so the rule above is the only framing policy there.
        source: "/((?!embed).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
