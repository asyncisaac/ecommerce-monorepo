import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  distDir: ".next-dist",
  reactCompiler: true,
  experimental: {
    lockDistDir: false,
  },
  turbopack: {
    // Define a explicit root to avoid monorepo lockfile inference warning
    root: __dirname,
  },
};

export default nextConfig;
