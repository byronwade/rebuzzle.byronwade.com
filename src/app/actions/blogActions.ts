"use server";

import { revalidateTag, unstable_cache } from "next/cache";
import { getCollection } from "@/db/mongodb";

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
}

// Cache blog posts list
export const fetchBlogPosts = unstable_cache(
  async (): Promise<BlogPostResponse[]> => {
    try {
      // eslint-disable-next-line no-console
      console.log("Fetching blog posts from database...");

      // Try to fetch from database first
      const blogPostsCollection = getCollection("blogPosts");
      const puzzlesCollection = getCollection("puzzles");

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
                $ifNull: [
                  { $ifNull: ["$puzzleData.puzzle", "$puzzleData.rebusPuzzle"] },
                  "N/A",
                ],
              },
              puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
              answer: { $ifNull: ["$puzzleData.answer", "Unknown"] },
              explanation: {
                $ifNull: [
                  "$puzzleData.explanation",
                  "No explanation available",
                ],
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
            console.warn(
              `Filtering out invalid blog post with slug: ${post.slug}`
            );
            return false;
          }
          // Filter out posts with markdown headers as titles
          if (post.title && post.title.startsWith("#")) {
            // eslint-disable-next-line no-console
            console.warn(
              `Filtering out blog post with invalid title: ${post.title}`
            );
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
                $ifNull: [
                  { $ifNull: ["$puzzleData.puzzle", "$puzzleData.rebusPuzzle"] },
                  "N/A",
                ],
              },
              puzzleType: { $ifNull: ["$puzzleData.puzzleType", "rebus"] },
              answer: { $ifNull: ["$puzzleData.answer", "Unknown"] },
              explanation: {
                $ifNull: [
                  "$puzzleData.explanation",
                  "No explanation available",
                ],
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
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/blog/send-notification`,
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
