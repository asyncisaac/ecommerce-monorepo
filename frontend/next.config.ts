import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    // Define a explicit root to avoid monorepo lockfile inference warning
    root: __dirname,
  },
};

export default nextConfig;
