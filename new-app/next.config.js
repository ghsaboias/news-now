/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Optimized for production
  poweredByHeader: false,  // Security enhancement
  compress: true,  // Enable compression

  // Performance Optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Image Optimization
  images: {
    domains: ['cdn.discordapp.com'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },

  // Cache Control Headers
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Webpack Optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations only
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        mergeDuplicateChunks: true,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 90000,
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              reuseExistingChunk: true,
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                if (!module.context) return 'vendors';
                const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
                const packageName = match ? match[1] : 'vendors';
                return `npm.${packageName.replace('@', '')}`;
              },
              chunks: 'all',
              priority: 1,
            },
          },
        },
      };

      if (!isServer) {
        config.resolve = config.resolve || {};
        config.resolve.fallback = {
          ...(config.resolve.fallback || {}),
          dns: false,
          fs: false,
          net: false,
          tls: false,
          'better-sqlite3': false,
        };
      }
    }
    return config;
  },

  eslint: {
    ignoreDuringBuilds: true, // We'll handle ESLint separately from the build
  },
};

module.exports = nextConfig;