/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Reduce bundle size in production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunks
          firebase: {
            name: 'firebase',
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            priority: 20,
          },
          lucide: {
            name: 'lucide',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            priority: 15,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
