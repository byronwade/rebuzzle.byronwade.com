"use server";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import type { BlogPostPuzzleOrigin, BlogPostSEOMetadata, BlogPostSections } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { isAdmin } from "@/lib/admin-auth";
import { loadRepositoryBlogPosts } from "@/lib/blog/repository-posts";
import { AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME } from "@/lib/cookies";
import { getAppUrl } from "@/lib/env";
import { verifyToken } from "@/lib/jwt";

// Blog post response type (matches the structure returned from database)
export interface BlogPostResponse {
  slug: string;
  date: string;
  title: string;
  puzzle: string;
  puzzleType?: string;
  answer: string;
  explanation: string;
  content: string;
  excerpt: string;
  publishedAt?: Date;
  metadata?: {
    topic?: string;
    keyword?: string;
    category?: string;
    seoMetadata?: {
      keywords: string[];
      description: string;
      ogTitle: string;
      ogDescription: string;
    };
  };
  // NEW: Enhanced blog post fields
  sections?: BlogPostSections;
  seoMetadata?: BlogPostSEOMetadata;
  puzzleOrigin?: BlogPostPuzzleOrigin;
}

// Enhanced blog post with puzzle statistics
export interface BlogPostWithStats extends BlogPostResponse {
  puzzleStats?: {
    solveRate: number;
    avgSolveTime: number;
    totalAttempts: number;
    hintsUsedAvg: number;
    difficultyComparison: string;
  };
}

// Pagination options
export interface BlogPaginationOptions {
  page: number;
  limit: number;
  puzzleType?: string;
  year?: number;
  month?: number;
  sortBy?: "date" | "popularity";
}

// Paginated response
export interface PaginatedBlogResponse {
  posts: BlogPostResponse[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

// Archive stats types live in @/lib/blog/archive-stats (not a server action).
export type {
  ArchiveStats,
  MonthArchiveStats,
  YearArchiveStats,
} from "@/lib/blog/archive-stats";

// Adjacent posts for prev/next navigation
export interface AdjacentPosts {
  prev: BlogPostResponse | null;
  next: BlogPostResponse | null;
}

function blogPostTime(post: BlogPostResponse): number {
  const value = post.publishedAt ?? post.date;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mergeBlogPosts(
  repositoryPosts: BlogPostResponse[],
  databasePosts: BlogPostResponse[]
): BlogPostResponse[] {
  const bySlug = new Map<string, BlogPostResponse>();
  for (const post of databasePosts) bySlug.set(post.slug, post);
  // Repository content wins after a PR is merged.
  for (const post of repositoryPosts) bySlug.set(post.slug, post);
  return [...bySlug.values()].sort((a, b) => blogPostTime(b) - blogPostTime(a));
}

// Cache blog posts list
export async function fetchBlogPosts(): Promise<BlogPostResponse[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts", "blog-posts-list");

  return (await fetchAllBlogPosts()).slice(0, 10);
}

// Cache individual blog posts
export async function fetchBlogPost(slug: string): Promise<BlogPostResponse | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts", "blog-post");

  if (!slug) {
    // eslint-disable-next-line no-console
    console.error("No slug provided to fetchBlogPost");
    return null;
  }

  const repositoryPost = loadRepositoryBlogPosts().find((post) => post.slug === slug);
  if (repositoryPost) return repositoryPost;

  try {
    // Try to fetch from database using aggregation with $lookup
    const blogPostsCollection = getCollection("blogPosts");

    const posts = await blogPostsCollection
      .aggregate([
        // Match by slug
        { $match: { slug } },
        // Join with puzzles collection
        {
          $lookup: {
            from: "puzzles",
            localField: "puzzleId",
            foreignField: "id",
            as: "puzzleData",
          },
        },
        // Unwind puzzle data
        {
          $unwind: {
            path: "$puzzleData",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Project the final structure
        {
          $project: {
            slug: 1,
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$publishedAt",
              },
            },
            title: 1,
            puzzle: {
              $ifNull: [{ $ifNull: ["$puzzleData.puzzle", "$puzzleData.rebusPuzzle"] }, "N/A"],
            },
            puzzleType: {
              $ifNull: [{ $ifNull: ["$puzzleType", "$puzzleData.puzzleType"] }, "rebus"],
            },
            answer: { $ifNull: ["$puzzleData.answer", "Unknown"] },
            explanation: {
              $ifNull: ["$puzzleData.explanation", "No explanation available"],
            },
            content: 1,
            excerpt: 1,
            sections: 1,
            seoMetadata: 1,
            puzzleOrigin: 1,
            difficulty: { $ifNull: ["$puzzleData.difficulty", "general"] },
          },
        },
      ])
      .toArray();

    if (posts.length > 0) {
      const post = posts[0]!;

      return {
        slug: post.slug,
        date: post.date,
        title: post.title,
        puzzle: post.puzzle,
        puzzleType: post.puzzleType,
        answer: post.answer,
        explanation: post.explanation,
        content: post.content,
        excerpt: post.excerpt,
        sections: post.sections,
        seoMetadata: post.seoMetadata,
        puzzleOrigin: post.puzzleOrigin,
        metadata: {
          topic: post.difficulty,
          keyword: (post.answer || "").replace(/\s+/g, ""),
          category: post.difficulty,
          seoMetadata: post.seoMetadata
            ? {
                keywords: [
                  post.seoMetadata.focusKeyword,
                  ...(post.seoMetadata.secondaryKeywords || []),
                ].filter(Boolean),
                description: post.seoMetadata.metaDescription,
                ogTitle: post.title,
                ogDescription: post.seoMetadata.metaDescription,
              }
            : undefined,
        },
      };
    }

    // Blog post not found in database
    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Database fetch failed for slug ${slug}:`, error);
    // Return null on error - no fallback to fake data
    return null;
  }
}

async function requireAdminUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const authToken =
      cookieStore.get(AUTH_COOKIE_NAME)?.value || cookieStore.get(LEGACY_AUTH_COOKIE_NAME)?.value;
    if (!authToken) return null;
    const payload = await verifyToken(authToken);
    const userId = payload?.userId;
    if (!userId) return null;
    return (await isAdmin(userId)) ? userId : null;
  } catch {
    return null;
  }
}

// Function for creating blog posts with database integration
export async function createBlogPost(postData: {
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  authorId: string;
  puzzleId: string;
  publishedAt: Date;
}): Promise<{
  success: boolean;
  message: string;
  error?: string;
  postId?: string;
}> {
  try {
    const adminUserId = await requireAdminUserId();
    if (!adminUserId) {
      return {
        success: false,
        message: "Admin access required",
        error: "Unauthorized",
      };
    }

    // Create blog post in database
    const blogPostsCollection = getCollection("blogPosts");

    // Generate a unique ID for the blog post
    const id = crypto.randomUUID();

    const newPost = await blogPostsCollection.insertOne({
      id,
      title: postData.title,
      content: postData.content,
      excerpt: postData.excerpt,
      slug: postData.slug,
      authorId: postData.authorId,
      puzzleId: postData.puzzleId,
      publishedAt: postData.publishedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!newPost.insertedId) {
      return {
        success: false,
        message: "Failed to create blog post",
        error: "Database insert failed",
      };
    }

    // Revalidate the cache so the new post appears immediately
    revalidateTag("blog-posts", "max");
    revalidateTag("blog-posts-list", "max");

    // Morning cron (/api/cron/send-blog-emails) is the primary blast.
    // Optional immediate send when CRON_SECRET is available (manual creates).
    try {
      if (postData.publishedAt <= new Date() && process.env.CRON_SECRET) {
        fetch(`${getAppUrl()}/api/blog/send-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({
            postId: id,
            sendToAllUsers: false,
          }),
        }).catch((error) => {
          console.error("[Blog] Failed to trigger email notifications:", error);
        });
      }
    } catch (error) {
      console.error("[Blog] Error triggering email notifications:", error);
    }

    return {
      success: true,
      message: "Blog post created successfully",
      postId: newPost.insertedId.toString(),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating blog post:", error);
    return {
      success: false,
      message: "Failed to create blog post",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// NEW: Paginated blog posts fetch (cached for Next.js 16 Cache Components)
// ============================================================================

async function fetchBlogPostsPaginatedInternal(
  options: BlogPaginationOptions
): Promise<PaginatedBlogResponse> {
  const { page = 1, limit = 12, puzzleType, year, month } = options;
  const skip = (page - 1) * limit;
  const allPosts = await fetchAllBlogPosts({ puzzleType, year, month });
  const totalCount = allPosts.length;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    posts: allPosts.slice(skip, skip + limit),
    totalCount,
    totalPages,
    currentPage: page,
    hasMore: page < totalPages,
  };
}

// Paginated fetches stay uncached (query-dependent); list/post use "use cache" above.
export { fetchBlogPostsPaginatedInternal as fetchBlogPostsPaginated };

// ============================================================================
// NEW: Search blog posts
// ============================================================================

export async function searchBlogPosts(
  query: string,
  options?: { puzzleType?: string; year?: number; limit?: number }
): Promise<BlogPostResponse[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const { puzzleType, year, limit = 20 } = options || {};
  const search = query.trim().toLowerCase();
  const posts = await fetchAllBlogPosts({ puzzleType, year });
  return posts
    .filter((post) =>
      [post.title, post.content, post.excerpt, post.slug].some((value) =>
        value?.toLowerCase().includes(search)
      )
    )
    .slice(0, limit);
}

// ============================================================================
// NEW: Fetch blog post with puzzle statistics
// ============================================================================

export async function fetchBlogPostWithStats(slug: string): Promise<BlogPostWithStats | null> {
  if (!slug) return null;

  const post = await fetchBlogPost(slug);
  if (!post) return null;

  try {
    // Get puzzle statistics from attempts collection
    const attemptsCollection = getCollection("puzzleAttempts");
    const puzzlesCollection = getCollection("puzzles");

    // Find the puzzle by matching the answer (since we have puzzleId in blog but need to match)
    const puzzle = await puzzlesCollection.findOne({
      $or: [{ answer: post.answer }, { puzzle: post.puzzle }],
    });

    if (!puzzle) {
      return { ...post, puzzleStats: undefined };
    }

    // Aggregate attempt statistics
    const stats = await attemptsCollection
      .aggregate([
        { $match: { puzzleId: puzzle.id } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            correctAttempts: { $sum: { $cond: ["$isCorrect", 1, 0] } },
            avgSolveTime: { $avg: "$timeSpentSeconds" },
            totalHintsUsed: { $sum: { $ifNull: ["$hintsUsed", 0] } },
            attemptCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    if (stats.length === 0) {
      return { ...post, puzzleStats: undefined };
    }

    const statData = stats[0]!;
    const solveRate =
      statData.totalAttempts > 0
        ? Math.round((statData.correctAttempts / statData.totalAttempts) * 100)
        : 0;

    // Determine difficulty comparison
    let difficultyComparison = "average";
    if (solveRate < 30) difficultyComparison = "very challenging";
    else if (solveRate < 50) difficultyComparison = "challenging";
    else if (solveRate > 80) difficultyComparison = "accessible";
    else if (solveRate > 90) difficultyComparison = "easy";

    return {
      ...post,
      puzzleStats: {
        solveRate,
        avgSolveTime: Math.round(statData.avgSolveTime || 0),
        totalAttempts: statData.totalAttempts,
        hintsUsedAvg:
          statData.attemptCount > 0
            ? Math.round((statData.totalHintsUsed / statData.attemptCount) * 10) / 10
            : 0,
        difficultyComparison,
      },
    };
  } catch (error) {
    console.error("Error fetching blog post with stats:", error);
    return { ...post, puzzleStats: undefined };
  }
}

// ============================================================================
// NEW: Fetch adjacent posts for prev/next navigation
// ============================================================================

export async function fetchAdjacentPosts(currentDate: Date | string): Promise<AdjacentPosts> {
  const currentKey = new Date(currentDate).toISOString().slice(0, 10);
  const posts = await fetchAllBlogPosts();
  const older = posts.filter((post) => post.date < currentKey);
  const newer = posts
    .filter((post) => post.date > currentKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { prev: older[0] ?? null, next: newer[0] ?? null };
}

// ============================================================================
// NEW: Fetch all posts (no limit) for archive pages
// ============================================================================

export async function fetchAllBlogPosts(options?: {
  year?: number;
  month?: number;
  puzzleType?: string;
}): Promise<BlogPostResponse[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog-posts", "blog-posts-all");

  const { year, month, puzzleType } = options || {};
  const repositoryPosts = loadRepositoryBlogPosts().filter((post) => {
    const date = new Date(post.publishedAt ?? post.date);
    if (year && date.getUTCFullYear() !== year) return false;
    if (month && date.getUTCMonth() + 1 !== month) return false;
    if (puzzleType && post.puzzleType !== puzzleType) return false;
    return true;
  });

  try {
    const blogPostsCollection = getCollection("blogPosts");

    const matchConditions: Record<string, unknown> = {};

    if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1);
      const endDate = month
        ? new Date(year, month, 0, 23, 59, 59)
        : new Date(year, 11, 31, 23, 59, 59);
      matchConditions.publishedAt = { $gte: startDate, $lte: endDate };
    }

    const pipeline: object[] = [
      { $match: matchConditions },
      { $sort: { publishedAt: -1 } },
      {
        $lookup: {
          from: "puzzles",
          localField: "puzzleId",
          foreignField: "id",
          as: "puzzleData",
        },
      },
      { $unwind: { path: "$puzzleData", preserveNullAndEmptyArrays: true } },
    ];

    if (puzzleType) {
      pipeline.push({ $match: { "puzzleData.puzzleType": puzzleType } });
    }

    pipeline.push({
      $project: {
        slug: 1,
        date: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" } },
        publishedAt: 1,
        title: 1,
        puzzle: {
          $ifNull: [{ $ifNull: ["$puzzleData.puzzle", "$puzzleData.rebusPuzzle"] }, "N/A"],
        },
        puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
        answer: { $ifNull: ["$puzzleData.answer", "Unknown"] },
        explanation: { $ifNull: ["$puzzleData.explanation", "No explanation available"] },
        content: 1,
        excerpt: 1,
        sections: 1,
        seoMetadata: 1,
        puzzleOrigin: 1,
      },
    });

    const posts = await blogPostsCollection.aggregate(pipeline).toArray();

    const databasePosts = posts.flatMap((post: any) => {
      const mapped = {
        slug: post.slug,
        date: post.date,
        publishedAt: post.publishedAt,
        title: post.title,
        puzzle: post.puzzle,
        puzzleType: post.puzzleType,
        answer: post.answer,
        explanation: post.explanation,
        content: post.content,
        excerpt: post.excerpt,
        sections: post.sections,
        seoMetadata: post.seoMetadata,
        puzzleOrigin: post.puzzleOrigin,
      };
      return mapped.slug && !mapped.slug.startsWith("-") && mapped.slug.length >= 3 ? [mapped] : [];
    });

    return mergeBlogPosts(repositoryPosts, databasePosts);
  } catch (error) {
    console.error("Error fetching all blog posts:", error);
    return repositoryPosts;
  }
}
