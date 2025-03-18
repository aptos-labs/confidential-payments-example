import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Outputs a Single-Page Application (SPA).
  distDir: './dist', // Changes the build output directory to `./dist/`.
  eslint: {
    ignoreDuringBuilds: true,
  },
}

const withNextIntl = createNextIntlPlugin('./src/localization/request.ts')

export default withNextIntl(nextConfig)
