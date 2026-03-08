import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.ts is available by default in Next.js 15+
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pps.whatsapp.net',
      },
    ],
  },
};

export default nextConfig;
