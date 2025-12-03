"use server";

import { revalidateTag, unstable_cache } from "next/cache";
import type { BlogPostPuzzleOrigin, BlogPostSEOMetadata, BlogPostSections } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { getAppUrl } from "@/lib/env";

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

// Archive stats for timeline navigation
export interface MonthArchiveStats {
  month: number;
  postCount: number;
  puzzleTypes: Record<string, number>;
}

export interface YearArchiveStats {
  year: number;
  months: MonthArchiveStats[];
  totalPosts: number;
}

export interface ArchiveStats {
  years: YearArchiveStats[];
  totalPosts: number;
}

// Adjacent posts for prev/next navigation
export interface AdjacentPosts {
  prev: BlogPostResponse | null;
  next: BlogPostResponse | null;
}

// Cache blog posts list
export const fetchBlogPosts = unstable_cache(
  async (): Promise<BlogPostResponse[]> => {
    try {
      // eslint-disable-next-line no-console
      console.log("Fetching blog posts from database...");

      // Try to fetch from database first
      const blogPostsCollection = getCollection("blogPosts");
      const _puzzlesCollection = getCollection("puzzles");

      // Use aggregation pipeline with $lookup to join puzzles in a single query
      const postsWithPuzzles = await blogPostsCollection
        .aggregate([
          // Sort by published date
          { $sort: { publishedAt: -1 } },
          // Limit to 10 posts
          { $limit: 10 },
          // Join with puzzles collection
          {
            $lookup: {
              from: "puzzles",
              localField: "puzzleId",
              foreignField: "id",
              as: "puzzleData",
            },
          },
          // Unwind puzzle data (will be empty array if no puzzle found)
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
              puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
              answer: { $ifNull: ["$puzzleData.answer", "Unknown"] },
              explanation: {
                $ifNull: ["$puzzleData.explanation", "No explanation available"],
              },
              content: 1,
              excerpt: 1,
              difficulty: { $ifNull: ["$puzzleData.difficulty", "general"] },
            },
          },
        ])
        .toArray();

      if (postsWithPuzzles.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`Found ${postsWithPuzzles.length} blog posts in database`);

        // Transform to match expected format
        const transformedPosts = postsWithPuzzles.map((post: any) => ({
          slug: post.slug,
          date: post.date,
          title: post.title,
          puzzle: post.puzzle,
          puzzleType: post.puzzleType,
          answer: post.answer,
          explanation: post.explanation,
          content: post.content,
          excerpt: post.excerpt,
          metadata: {
            topic: post.difficulty,
            keyword: (post.answer || "").replace(/\s+/g, ""),
            category: post.difficulty,
          },
        }));

        // Filter out invalid posts (bad slugs, missing titles, etc.)
        const validPosts = transformedPosts.filter((post) => {
          // Filter out posts with invalid slugs (starting with "-" or empty)
          if (!post.slug || post.slug.startsWith("-") || post.slug.length < 3) {
            // eslint-disable-next-line no-console
            console.warn(`Filtering out invalid blog post with slug: ${post.slug}`);
            return false;
          }
          // Filter out posts with markdown headers as titles
          if (post.title?.startsWith("#")) {
            // eslint-disable-next-line no-console
            console.warn(`Filtering out blog post with invalid title: ${post.title}`);
            return false;
          }
          return true;
        });

        // eslint-disable-next-line no-console
        console.log(
          `Returning ${validPosts.length} valid blog posts (filtered ${transformedPosts.length - validPosts.length} invalid)`
        );

        return validPosts;
      }

      // No blog posts found in database
      // eslint-disable-next-line no-console
      console.log("No blog posts found in database");
      return [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Database fetch failed:", error);
      // Return empty array on error - no fallback to fake data
      return [];
    }
  },
  ["blog-posts-list"],
  {
    revalidate: false, // In development, don't cache
    tags: ["blog-posts", "blog-posts-list"],
  }
);

// Cache individual blog posts
export const fetchBlogPost = unstable_cache(
  async (slug: string): Promise<BlogPostResponse | null> => {
    if (!slug) {
      // eslint-disable-next-line no-console
      console.error("No slug provided to fetchBlogPost");
      return null;
    }

    // eslint-disable-next-line no-console
    console.log(`Fetching blog post with slug: ${slug}`);

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
              puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
              answer: { $ifNull: ["$puzzleData.answer", "Unknown"] },
              explanation: {
                $ifNull: ["$puzzleData.explanation", "No explanation available"],
              },
              content: 1,
              excerpt: 1,
              difficulty: { $ifNull: ["$puzzleData.difficulty", "general"] },
            },
          },
        ])
        .toArray();

      if (posts.length > 0) {
        const post = posts[0]!;
        // eslint-disable-next-line no-console
        console.log(`Found blog post in database: ${post.title}`);

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
          metadata: {
            topic: post.difficulty,
            keyword: (post.answer || "").replace(/\s+/g, ""),
            category: post.difficulty,
          },
        };
      }

      // Blog post not found in database
      // eslint-disable-next-line no-console
      console.log(`No blog post found with slug: ${slug}`);
      return null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Database fetch failed for slug ${slug}:`, error);
      // Return null on error - no fallback to fake data
      return null;
    }
  },
  ["blog-post"],
  {
    revalidate: 3600,
    tags: ["blog-post"],
  }
);

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
    // eslint-disable-next-line no-console
    console.log("createBlogPost called with data:", postData);

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

    // eslint-disable-next-line no-console
    console.log("Blog post created successfully:", newPost.insertedId);

    // Revalidate the cache so the new post appears immediately
    revalidateTag("blog-posts", "max");
    revalidateTag("blog-posts-list", "max");

    // Send blog post notification emails (non-blocking)
    // This can be called separately via API if needed
    try {
      // Only send if published immediately
      if (postData.publishedAt <= new Date()) {
        // Trigger email send in background (don't await)
        fetch(
          `${getAppUrl()}/api/blog/send-notification`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              postId: id,
              sendToAllUsers: false, // Send only to subscribers
            }),
          }
        ).catch((error) => {
          console.error("[Blog] Failed to trigger email notifications:", error);
        });
      }
    } catch (error) {
      // Don't fail blog post creation if email send fails
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

  try {
    const blogPostsCollection = getCollection("blogPosts");

    // Build match conditions
    const matchConditions: Record<string, unknown> = {};

    if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1);
      const endDate = month
        ? new Date(year, month, 0, 23, 59, 59)
        : new Date(year, 11, 31, 23, 59, 59);
      matchConditions.publishedAt = { $gte: startDate, $lte: endDate };
    }

    // Get total count first
    const totalCount = await blogPostsCollection.countDocuments(matchConditions);

    // Build aggregation pipeline
    const pipeline: object[] = [
      { $match: matchConditions },
      { $sort: { publishedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "puzzles",
          localField: "puzzleId",
          foreignField: "id",
          as: "puzzleData",
        },
      },
      {
        $unwind: {
          path: "$puzzleData",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Add puzzle type filter after lookup if specified
    if (puzzleType) {
      pipeline.push({ $match: { "puzzleData.puzzleType": puzzleType } });
    }

    // Project final structure
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

    // Transform and filter posts
    const transformedPosts = posts
      .map((post: any) => ({
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
      }))
      .filter((post) => post.slug && !post.slug.startsWith("-") && post.slug.length >= 3);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      posts: transformedPosts,
      totalCount,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages,
    };
  } catch (error) {
    console.error("Error fetching paginated blog posts:", error);
    return {
      posts: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: page,
      hasMore: false,
    };
  }
}

// Direct export - data fetching within Suspense boundaries doesn't need unstable_cache wrapper
// The internal function already handles errors gracefully
export { fetchBlogPostsPaginatedInternal as fetchBlogPostsPaginated };

// ============================================================================
// NEW: Archive stats for timeline navigation
// ============================================================================

export const fetchBlogArchiveStats = unstable_cache(
  async (): Promise<ArchiveStats> => {
    try {
      const blogPostsCollection = getCollection("blogPosts");

      const stats = await blogPostsCollection
        .aggregate([
          {
            $lookup: {
              from: "puzzles",
              localField: "puzzleId",
              foreignField: "id",
              as: "puzzleData",
            },
          },
          {
            $unwind: {
              path: "$puzzleData",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$publishedAt" },
                month: { $month: "$publishedAt" },
              },
              count: { $sum: 1 },
              puzzleTypes: { $push: { $ifNull: ["$puzzleData.puzzleType", "rebus"] } },
            },
          },
          {
            $group: {
              _id: "$_id.year",
              months: {
                $push: {
                  month: "$_id.month",
                  postCount: "$count",
                  puzzleTypesArray: "$puzzleTypes",
                },
              },
              totalPosts: { $sum: "$count" },
            },
          },
          { $sort: { _id: -1 } },
        ])
        .toArray();

      // Transform to proper structure with puzzle type counts
      const years: YearArchiveStats[] = stats.map((yearData: any) => ({
        year: yearData._id,
        totalPosts: yearData.totalPosts,
        months: yearData.months
          .map((m: any) => {
            // Count puzzle types
            const typeCounts: Record<string, number> = {};
            for (const type of m.puzzleTypesArray || []) {
              typeCounts[type] = (typeCounts[type] || 0) + 1;
            }
            return {
              month: m.month,
              postCount: m.postCount,
              puzzleTypes: typeCounts,
            };
          })
          .sort((a: MonthArchiveStats, b: MonthArchiveStats) => b.month - a.month),
      }));

      const totalPosts = years.reduce((sum, y) => sum + y.totalPosts, 0);

      return { years, totalPosts };
    } catch (error) {
      console.error("Error fetching archive stats:", error);
      return { years: [], totalPosts: 0 };
    }
  },
  ["blog-archive-stats"],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ["blog-posts", "blog-archive"],
  }
);

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

  try {
    const blogPostsCollection = getCollection("blogPosts");

    // Build search conditions using regex for text search
    const searchRegex = new RegExp(query.trim(), "i");
    const matchConditions: Record<string, unknown> = {
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { excerpt: searchRegex },
        { slug: searchRegex },
      ],
    };

    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      matchConditions.publishedAt = { $gte: startDate, $lte: endDate };
    }

    const pipeline: object[] = [
      { $match: matchConditions },
      { $sort: { publishedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "puzzles",
          localField: "puzzleId",
          foreignField: "id",
          as: "puzzleData",
        },
      },
      {
        $unwind: {
          path: "$puzzleData",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (puzzleType) {
      pipeline.push({ $match: { "puzzleData.puzzleType": puzzleType } });
    }

    pipeline.push({
      $project: {
        slug: 1,
        date: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" } },
        title: 1,
        puzzle: {
          $ifNull: [{ $ifNull: ["$puzzleData.puzzle", "$puzzleData.rebusPuzzle"] }, "N/A"],
        },
        puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
        answer: { $ifNull: ["$puzzleData.answer", "Unknown"] },
        explanation: { $ifNull: ["$puzzleData.explanation", "No explanation available"] },
        content: 1,
        excerpt: 1,
      },
    });

    const posts = await blogPostsCollection.aggregate(pipeline).toArray();

    return posts
      .map((post: any) => ({
        slug: post.slug,
        date: post.date,
        title: post.title,
        puzzle: post.puzzle,
        puzzleType: post.puzzleType,
        answer: post.answer,
        explanation: post.explanation,
        content: post.content,
        excerpt: post.excerpt,
      }))
      .filter((post) => post.slug && !post.slug.startsWith("-"));
  } catch (error) {
    console.error("Error searching blog posts:", error);
    return [];
  }
}

// ============================================================================
// NEW: Fetch blog post with puzzle statistics
// ============================================================================

export async function fetchBlogPostWithStats(slug: string): Promise<BlogPostWithStats | null> {
  if (!slug) return null;

  try {
    // First get the blog post
    const post = await fetchBlogPost(slug);
    if (!post) return null;

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
    return null;
  }
}

// ============================================================================
// NEW: Fetch adjacent posts for prev/next navigation
// ============================================================================

export async function fetchAdjacentPosts(currentDate: Date | string): Promise<AdjacentPosts> {
  try {
    const blogPostsCollection = getCollection("blogPosts");
    const date = typeof currentDate === "string" ? new Date(currentDate) : currentDate;

    // Fetch previous post (older)
    const prevPosts = await blogPostsCollection
      .aggregate([
        { $match: { publishedAt: { $lt: date } } },
        { $sort: { publishedAt: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: "puzzles",
            localField: "puzzleId",
            foreignField: "id",
            as: "puzzleData",
          },
        },
        { $unwind: { path: "$puzzleData", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            slug: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" } },
            title: 1,
            puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
            excerpt: 1,
          },
        },
      ])
      .toArray();

    // Fetch next post (newer)
    const nextPosts = await blogPostsCollection
      .aggregate([
        { $match: { publishedAt: { $gt: date } } },
        { $sort: { publishedAt: 1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: "puzzles",
            localField: "puzzleId",
            foreignField: "id",
            as: "puzzleData",
          },
        },
        { $unwind: { path: "$puzzleData", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            slug: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$publishedAt" } },
            title: 1,
            puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
            excerpt: 1,
          },
        },
      ])
      .toArray();

    const transformPost = (post: any): BlogPostResponse | null => {
      if (!post) return null;
      return {
        slug: post.slug,
        date: post.date,
        title: post.title,
        puzzleType: post.puzzleType,
        excerpt: post.excerpt || "",
        puzzle: "",
        answer: "",
        explanation: "",
        content: "",
      };
    };

    return {
      prev: prevPosts[0] ? transformPost(prevPosts[0]) : null,
      next: nextPosts[0] ? transformPost(nextPosts[0]) : null,
    };
  } catch (error) {
    console.error("Error fetching adjacent posts:", error);
    return { prev: null, next: null };
  }
}

// ============================================================================
// NEW: Fetch all posts (no limit) for archive pages
// ============================================================================

export const fetchAllBlogPosts = unstable_cache(
  async (options?: {
    year?: number;
    month?: number;
    puzzleType?: string;
  }): Promise<BlogPostResponse[]> => {
    try {
      const blogPostsCollection = getCollection("blogPosts");
      const { year, month, puzzleType } = options || {};

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
        },
      });

      const posts = await blogPostsCollection.aggregate(pipeline).toArray();

      return posts
        .map((post: any) => ({
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
        }))
        .filter((post) => post.slug && !post.slug.startsWith("-") && post.slug.length >= 3);
    } catch (error) {
      console.error("Error fetching all blog posts:", error);
      return [];
    }
  },
  ["blog-posts-all"],
  {
    revalidate: 3600,
    tags: ["blog-posts", "blog-posts-all"],
  }
);
