import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Outputs a Single-Page Application (SPA).
  distDir: './dist', // Changes the build output directory to `./dist/`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['plus.unsplash.com'],
  },
}

const withNextIntl = createNextIntlPlugin('./src/localization/request.ts')

export default withNextIntl(nextConfig)
