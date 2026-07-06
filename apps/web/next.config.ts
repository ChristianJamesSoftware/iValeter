import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: require("path").join(__dirname, "../../"),
  transpilePackages: ["@ivaleter/api", "@ivaleter/db", "@ivaleter/config"],
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation + project — set via Railway env vars
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress noisy Sentry build output
  silent: true,

  // Don't upload source maps unless SENTRY_AUTH_TOKEN is set
  // (keeps builds fast; set the token in Railway when ready)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Disable source map upload if no auth token — won't break the build
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Tunnel Sentry requests through /api/monitoring to avoid ad-blockers
  tunnelRoute: "/api/monitoring",

  // Tree-shake Sentry debug code in production
  disableLogger: true,

  // Automatically instrument React Server Components
  autoInstrumentServerFunctions: true,
});
