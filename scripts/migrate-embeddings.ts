/**
 * Migration Script: Generate Embeddings for Existing Puzzles
 *
 * Backfills vector embeddings for existing puzzles in the database
 * Run with: tsx scripts/migrate-embeddings.ts
 */

import { config } from "dotenv";
import {
  generatePuzzleEmbedding,
  isEmbeddingAvailable,
} from "../src/ai/services/embeddings";
import type { Puzzle } from "../src/db/models";
import { getCollection } from "../src/db/mongodb";

// Load environment variables
config({ path: ".env.local" });

/**
 * Main migration function
 */
async function migrateEmbeddings(): Promise<void> {
  console.log("🔄 Starting embedding migration...");

  // Check if embeddings are available
  if (!isEmbeddingAvailable()) {
    console.error(
      "❌ Embedding generation is not available. Please check your API keys."
    );
    process.exit(1);
  }

  const collection = getCollection<Puzzle>("puzzles");

  // Find puzzles without embeddings
  const puzzlesWithoutEmbeddings = await collection
    .find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: { $size: 0 } },
      ],
      active: true, // Only process active puzzles
    })
    .toArray();

  console.log(
    `📊 Found ${puzzlesWithoutEmbeddings.length} puzzles without embeddings`
  );

  if (puzzlesWithoutEmbeddings.length === 0) {
    console.log("✅ All puzzles already have embeddings!");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  // Process puzzles in batches
  const batchSize = 5;
  for (let i = 0; i < puzzlesWithoutEmbeddings.length; i += batchSize) {
    const batch = puzzlesWithoutEmbeddings.slice(i, i + batchSize);

    console.log(
      `\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(puzzlesWithoutEmbeddings.length / batchSize)}`
    );

    await Promise.all(
      batch.map(async (puzzle) => {
        try {
          console.log(
            `  Generating embedding for puzzle: ${puzzle.id} - "${puzzle.answer}"`
          );

          const embedding = await generatePuzzleEmbedding({
            puzzle: puzzle.puzzle,
            answer: puzzle.answer,
            category: puzzle.category,
            puzzleType: puzzle.puzzleType,
            explanation: puzzle.explanation,
          });

          // Update puzzle with embedding
          await collection.updateOne(
            { id: puzzle.id },
            { $set: { embedding } }
          );

          console.log(`  ✅ Success: ${puzzle.id}`);
          successCount++;
        } catch (error) {
          console.error(
            `  ❌ Error processing puzzle ${puzzle.id}:`,
            error instanceof Error ? error.message : String(error)
          );
          errorCount++;
        }
      })
    );

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < puzzlesWithoutEmbeddings.length) {
      console.log("  ⏳ Waiting 2 seconds before next batch...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log("\n✅ Migration complete!");
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total: ${puzzlesWithoutEmbeddings.length}`);
}

// Run migration
migrateEmbeddings()
  .then(() => {
    console.log("\n🎉 Migration finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });

