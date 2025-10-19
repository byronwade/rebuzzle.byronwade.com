/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable Partial Prerendering (PPR) - Next.js 16 uses cacheComponents
  cacheComponents: true,

  experimental: {
    staleTimes: {
      dynamic: 30,  // 30 seconds for dynamic data
      static: 180,  // 3 minutes for static data
    },
  },

  // Turbopack is default in Next.js 16
  turbopack: {},

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ]
  },
}

export default nextConfig
