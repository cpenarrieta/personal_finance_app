import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true, // Enable Next.js 16+ caching
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'plaid-merchant-logos.plaid.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Disable optimization for local images to avoid 400 errors
    unoptimized: true,
  },
};

export default nextConfig;
