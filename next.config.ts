import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/admin/login": ["./@VALUES.json"],
  },
};

export default nextConfig;
