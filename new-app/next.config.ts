import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',  // Optimized for production
  poweredByHeader: false,  // Security enhancement
  compress: true,  // Enable compression
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,  // Temporarily disable ESLint during build
  },
  typescript: {
    ignoreBuildErrors: true,  // Temporarily ignore TS errors during build
  },
  images: {
    unoptimized: false,  // Enable image optimization
  },
  // Reduce bundle size
  webpack: (config, { isServer }) => {
    // Optimize client-side bundles
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 100000,
        }
      }
    }
    return config
  }
};

export default nextConfig;
