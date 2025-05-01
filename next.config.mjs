import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone',
  productionBrowserSourceMaps: true,
  distDir: './dist',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['@lukachi/aptos-labs-ts-sdk'],
};

const withNextIntl = createNextIntlPlugin('./src/localization/request.ts');

export default withNextIntl(nextConfig);
