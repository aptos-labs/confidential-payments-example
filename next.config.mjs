import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone',
  distDir: './dist',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['plus.unsplash.com'],
  },
}

const withNextIntl = createNextIntlPlugin('./src/localization/request.ts')

export default withNextIntl(nextConfig)
