/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  experimental: {
    // optimizePackageImports: ['@/app/globals.css'],
    optimizeCss: true,
  },
  images: { unoptimized: true },
  headers: async () => {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }

    return config
  },
};

module.exports = nextConfig;
