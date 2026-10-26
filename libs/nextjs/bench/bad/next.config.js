/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'cdn.example.com'],
  },
  experimental: {
    ppr: true,
    serverComponentsExternalPackages: ['sharp'],
  },
  publicRuntimeConfig: {
    apiUrl: process.env.API_URL,
  },
}

module.exports = nextConfig
