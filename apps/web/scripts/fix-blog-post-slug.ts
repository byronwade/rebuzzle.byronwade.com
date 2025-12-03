/**
 * Fix Blog Post Slug and Title Script
 *
 * This script finds blog posts with invalid slugs (starting with "-") or invalid titles
 * and fixes them to be valid.
 */

import type { BlogPost } from "../src/db/models";
import { closeConnection, getCollection } from "../src/db/mongodb";

/**
 * Generate a valid slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/^#+\s*/, "") // Remove markdown headers
    .replace(/^\d+\.\s*/, "") // Remove leading numbers like "1. "
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}

/**
 * Generate a valid title (remove markdown headers, clean up)
 */
function generateTitle(currentTitle: string): string {
  // Remove markdown headers
  let title = currentTitle.replace(/^#+\s*/, "").trim();
  
  // If title is empty or too short, generate a default
  if (!title || title.length < 3) {
    title = "Daily Puzzle Blog Post";
  }
  
  return title;
}

/**
 * Main function to fix blog post slugs and titles
 */
async function fixBlogPostSlug() {
  try {
    console.log("Starting blog post slug and title fix...\n");

    const blogPostsCollection = getCollection<BlogPost>("blogPosts");

    // Find blog posts with invalid slugs (starting with "-" or empty)
    const invalidSlugPosts = await blogPostsCollection
      .find({
        $or: [
          { slug: { $regex: "^-" } }, // Starts with "-"
          { slug: { $exists: false } },
          { slug: "" },
          { slug: { $lt: 3 } }, // Less than 3 characters
        ],
      })
      .toArray();

    // Find blog posts with invalid titles (starting with "#")
    const invalidTitlePosts = await blogPostsCollection
      .find({
        title: { $regex: "^#" },
      })
      .toArray();

    // Combine and deduplicate
    const allInvalidPosts = [
      ...invalidSlugPosts,
      ...invalidTitlePosts.filter(
        (p) => !invalidSlugPosts.some((ip) => ip.id === p.id)
      ),
    ];

    console.log(`Found ${allInvalidPosts.length} blog posts to fix\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const post of allInvalidPosts) {
      try {
        const updates: Partial<BlogPost> = {
          updatedAt: new Date(),
        };

        // Fix slug if invalid
        if (
          !post.slug ||
          post.slug.startsWith("-") ||
          post.slug.length < 3
        ) {
          const newSlug = generateSlug(post.title || "blog-post");
          updates.slug = newSlug;
          console.log(
            `  Fixing slug: "${post.slug || "(empty)"}" → "${newSlug}"`
          );
        }

        // Fix title if invalid
        if (post.title?.startsWith("#")) {
          const newTitle = generateTitle(post.title);
          updates.title = newTitle;
          console.log(`  Fixing title: "${post.title}" → "${newTitle}"`);
          
          // If slug was also invalid, regenerate it from the new title
          if (!updates.slug) {
            updates.slug = generateSlug(newTitle);
            console.log(`  Regenerating slug: "${updates.slug}"`);
          }
        }

        // Update the blog post
        await blogPostsCollection.updateOne(
          { id: post.id },
          { $set: updates }
        );

        console.log(`✅ Fixed blog post: ${post.id}`);
        updatedCount++;
      } catch (error) {
        console.error(
          `❌ Error processing blog post ${post.id}:`,
          error instanceof Error ? error.message : error
        );
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("Fix Summary:");
    console.log(`  ✅ Updated: ${updatedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total: ${allInvalidPosts.length}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Run the script
if (require.main === module) {
  fixBlogPostSlug()
    .then(() => {
      console.log("\n✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

export { fixBlogPostSlug };

