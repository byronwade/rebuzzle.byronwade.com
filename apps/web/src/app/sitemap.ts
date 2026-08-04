import type { MetadataRoute } from "next";
import { fetchAllBlogPosts } from "@/app/actions/blogActions";
import { getBaseUrl } from "@/lib/seo/utils";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";
import { listSitemapCommunityPuzzles, listSitemapCreators } from "@/lib/ugc/submissions";

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
      url: `${baseUrl}/studio`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
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

  // Fetch merged repository and legacy database blog posts.
  let blogPosts: MetadataRoute.Sitemap = [];

  try {
    const posts = await fetchAllBlogPosts();

    blogPosts = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.publishedAt || new Date(post.date),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (error) {
    // If database query fails, continue without blog posts
    console.error("Error fetching blog posts for sitemap:", error);
  }

  let creatorPages: MetadataRoute.Sitemap = [];
  let communityPuzzlePages: MetadataRoute.Sitemap = [];
  try {
    const [creators, community] = await Promise.all([
      listSitemapCreators(200),
      listSitemapCommunityPuzzles(500),
    ]);
    creatorPages = creators.map((creator) => ({
      url: `${baseUrl}${profilePathForUsername(creator.username)}`,
      lastModified: creator.updatedAt || now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    communityPuzzlePages = community.map((puzzle) => ({
      url: `${baseUrl}${communityPuzzlePath(puzzle.slug)}`,
      lastModified: puzzle.updatedAt || now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  } catch (error) {
    console.error("Error fetching UGC pages for sitemap:", error);
  }

  // Combine all pages
  return [...staticPages, ...puzzleTypePages, ...blogPosts, ...creatorPages, ...communityPuzzlePages];
}
