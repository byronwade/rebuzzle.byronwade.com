/**
 * Update Blog Post Titles Script
 *
 * This script updates existing blog post titles in MongoDB to remove puzzle answers.
 * It checks each blog post title and if it contains the puzzle answer, generates
 * a new title without revealing the answer.
 */

import type { BlogPost } from "../src/db/models";
import { closeConnection, getCollection } from "../src/db/mongodb";
import { getPuzzleTypeName } from "../src/lib/puzzleUtils";

/**
 * Generate a new title without the answer
 */
function generateNewTitle(
  currentTitle: string,
  puzzleType: string,
  difficulty?: number
): string {
  const puzzleTypeName = getPuzzleTypeName(puzzleType);

  // Try to extract a meaningful title from the current one
  // Remove common patterns that might contain answers
  const newTitle = currentTitle
    .replace(/["']/g, "") // Remove quotes
    .replace(/Cracking the|Solving|How to Solve|The|Behind|Unlocking/gi, "")
    .replace(/Puzzle|Challenge|Explained|Breakdown|Guide/gi, "")
    .trim();

  // If we have a meaningful remainder, use it
  if (newTitle.length > 10 && newTitle.length < 50) {
    // Check if it's still too long or contains suspicious patterns
    const words = newTitle.split(/\s+/);
    if (words.length <= 8) {
      return newTitle;
    }
  }

  // Generate based on puzzle type and difficulty
  const difficultyPhrase =
    difficulty && difficulty >= 7
      ? "Tricky"
      : difficulty && difficulty >= 5
        ? "Challenging"
        : "Fun";

  // Try different title formats
  const titleFormats = [
    `${difficultyPhrase} ${puzzleTypeName} Puzzle`,
    `Today's ${puzzleTypeName} Challenge`,
    `Solving the ${puzzleTypeName}`,
    `A ${puzzleTypeName} Puzzle Breakdown`,
    `Behind the ${puzzleTypeName}`,
  ];

  // Use a deterministic approach based on current title hash
  const hash = currentTitle
    .split("")
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
  const index = Math.abs(hash) % titleFormats.length;

  return titleFormats[index];
}

/**
 * Check if title contains the answer
 */
function titleContainsAnswer(title: string, answer: string): boolean {
  const titleLower = title.toLowerCase();
  const answerLower = answer.toLowerCase();

  // Check if answer appears in title (as whole word or part of word)
  // Also check for common variations
  const answerWords = answerLower.split(/\s+/);

  for (const word of answerWords) {
    if (word.length > 3 && titleLower.includes(word)) {
      return true;
    }
  }

  // Check for the full answer
  if (titleLower.includes(answerLower)) {
    return true;
  }

  // Check for answer without spaces
  const answerNoSpaces = answerLower.replace(/\s+/g, "");
  if (answerNoSpaces.length > 3 && titleLower.includes(answerNoSpaces)) {
    return true;
  }

  return false;
}

/**
 * Main function to update blog post titles
 */
async function updateBlogPostTitles() {
  try {
    console.log("Starting blog post title update...\n");

    const blogPostsCollection = getCollection<BlogPost>("blogPosts");
    const puzzlesCollection = getCollection("puzzles");

    // Get all blog posts
    const blogPosts = await blogPostsCollection.find({}).toArray();
    console.log(`Found ${blogPosts.length} blog posts to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const post of blogPosts) {
      try {
        // Get associated puzzle
        let puzzleData: any = null;
        if (post.puzzleId) {
          puzzleData = await puzzlesCollection.findOne({ id: post.puzzleId });
        }

        if (!(puzzleData && puzzleData.answer)) {
          console.log(
            `⚠️  Skipping "${post.title}" - No puzzle data or answer found`
          );
          skippedCount++;
          continue;
        }

        const answer = puzzleData.answer;
        const puzzleType = puzzleData.puzzleType || "rebus";
        const difficulty = puzzleData.difficulty;

        // Check if title contains answer
        if (titleContainsAnswer(post.title, answer)) {
          // Generate new title
          const newTitle = generateNewTitle(post.title, puzzleType, difficulty);

          // Update the blog post
          await blogPostsCollection.updateOne(
            { id: post.id },
            {
              $set: {
                title: newTitle,
                updatedAt: new Date(),
              },
            }
          );

          console.log(`✅ Updated: "${post.title}" → "${newTitle}"`);
          updatedCount++;
        } else {
          console.log(`✓  OK: "${post.title}" (doesn't contain answer)`);
          skippedCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error processing "${post.title}":`,
          error instanceof Error ? error.message : error
        );
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("Update Summary:");
    console.log(`  ✅ Updated: ${updatedCount}`);
    console.log(`  ✓  Skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total: ${blogPosts.length}`);
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
  updateBlogPostTitles()
    .then(() => {
      console.log("\n✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

export { updateBlogPostTitles };
