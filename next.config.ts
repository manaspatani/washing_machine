import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      const target = backendUrl.replace(/\/$/, "");
      return [
        {
          source: "/api/:path*",
          destination: `${target}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
