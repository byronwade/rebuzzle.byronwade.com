import type { MetadataRoute } from "next";
import type { BlogPost } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getBaseUrl } from "@/lib/seo/utils";

/**
 * Dynamic Sitemap Generation
 *
 * Generates sitemap.xml from database content including:
 * - Homepage
 * - Blog listing
 * - All published blog posts
 * - Static pages
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  // Puzzle type category pages
  const puzzleTypePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/puzzles/rebus`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/puzzles/logic-grid`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/puzzles/cryptic-crossword`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/puzzles/number-sequence`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/puzzles/pattern-recognition`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/puzzles/caesar-cipher`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/puzzles/trivia`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // Static pages with fixed priorities
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rebuzzle-vs-wordle`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/feed.xml`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Fetch blog posts from database
  let blogPosts: MetadataRoute.Sitemap = [];

  try {
    const blogPostsCollection = getCollection<BlogPost>("blogPosts");

    // Get all published blog posts
    const posts = await blogPostsCollection
      .find({
        publishedAt: { $lte: new Date() },
      })
      .sort({ publishedAt: -1 })
      .toArray();

    blogPosts = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt || post.publishedAt || post.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    // If database query fails, continue without blog posts
    console.error("Error fetching blog posts for sitemap:", error);
  }

  // Combine all pages
  return [...staticPages, ...puzzleTypePages, ...blogPosts];
}
