import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      new URL('https://cdn.example.com/assets/**'),
    ],
    qualities: [75, 90],
  },
  turbopack: {
    resolveAlias: {
      underscore: 'lodash',
    },
  },
}

export default nextConfig
