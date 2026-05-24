import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@xenova/transformers'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aadcdn.msauthimages.net',
      },
      {
        protocol: 'https',
        hostname: 'www.swinburne.edu.my',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
