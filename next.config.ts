import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["212.64.201.208"],
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://212.64.201.208:3000",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
