import type { NextConfig } from "next";

const rawBase = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath = rawBase === "/" ? "" : rawBase.replace(/\/$/, "");

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  ...(basePath ? { basePath } : {}),
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/better-sqlite3/**/*"],
  },
};

export default nextConfig;
