import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  serverExternalPackages: ["firebase-admin"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
