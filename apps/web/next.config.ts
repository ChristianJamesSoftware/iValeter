import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: require("path").join(__dirname, "../../"),
  transpilePackages: ["@ivaleter/api", "@ivaleter/db", "@ivaleter/config"],
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
