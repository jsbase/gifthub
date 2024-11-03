/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
  //   config.cache = {
  //     type: 'filesystem',
  //     compression: false
  //   }
  //   return config
  // }
};

module.exports = nextConfig;
