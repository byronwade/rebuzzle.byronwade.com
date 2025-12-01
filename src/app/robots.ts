import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo/utils";

/**
 * Dynamic Robots.txt Generation
 *
 * Generates robots.txt with:
 * - Allow all crawlers
 * - Reference to sitemap
 * - Disallow admin and API routes
 * - Allow public pages
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/settings",
          "/profile",
          "/game-over",
          "/puzzle-failed",
          "/ai-error",
          "/ai-quota-exceeded",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

