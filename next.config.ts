import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App Hosting は Next のサーバービルドを使う。output: "export" は従来の Hosting（out/）向け。
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
