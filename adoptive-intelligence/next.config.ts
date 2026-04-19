import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'petharbor.com',
      },
      {
        protocol: 'https',
        hostname: 'dl5zpyw5k3jeb.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
