/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
}

export default nextConfig
