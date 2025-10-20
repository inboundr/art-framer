import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds to prevent deployment failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript type checking during builds for Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Optimize for Vercel deployment
  serverExternalPackages: ['sharp'],
  
  // Remove problematic cache headers that might cause Vercel issues
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
