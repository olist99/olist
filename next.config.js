/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.habbo.com' },
      { protocol: 'https', hostname: 'images.habbo.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost', '127.0.0.1', 'localhost:3000', '127.0.0.1:3000', 'habbo.plus', 'www.habbo.plus'],
    },
  },
};
 
module.exports = nextConfig;