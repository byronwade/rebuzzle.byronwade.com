#!/usr/bin/env tsx

/**
 * MongoDB Index Fix Script
 *
 * This script fixes incorrect indexes and adds missing ones:
 * - Drops incorrect indexes (isActive, earnedAt)
 * - Creates correct indexes (active, unlockedAt)
 * - Adds missing indexes from create-indexes.ts
 *
 * Usage: tsx scripts/fix-indexes.ts
 */

import { getCollection, getConnection } from "../src/db/mongodb";

interface IndexFix {
  collection: string;
  drop?: Array<{ name: string }>;
  create: Array<{
    keys: Record<string, 1 | -1>;
    options?: {
      name?: string;
      unique?: boolean;
      sparse?: boolean;
      background?: boolean;
    };
  }>;
}

const indexFixes: IndexFix[] = [
  {
    collection: "puzzles",
    drop: [{ name: "isActive_1" }],
    create: [
      { keys: { active: 1 }, options: { name: "puzzles_active", background: true } },
      {
        keys: { publishedAt: 1, active: 1 },
        options: { name: "puzzles_publishedAt_active", background: true },
      },
      { keys: { createdAt: -1 }, options: { name: "puzzles_createdAt_desc", background: true } },
      { keys: { puzzleType: 1 }, options: { name: "puzzles_puzzleType", background: true } },
    ],
  },
  {
    collection: "userAchievements",
    drop: [{ name: "earnedAt_-1" }],
    create: [
      {
        keys: { userId: 1, achievementId: 1 },
        options: { unique: true, name: "userAchievements_userId_achievementId_unique", background: true },
      },
      { keys: { unlockedAt: -1 }, options: { name: "userAchievements_unlockedAt_desc", background: true } },
    ],
  },
  {
    collection: "users",
    create: [
      { keys: { id: 1 }, options: { unique: true, name: "users_id_unique", background: true } },
      { keys: { lastLogin: -1 }, options: { name: "users_lastLogin_desc", background: true } },
      { keys: { createdAt: -1 }, options: { name: "users_createdAt_desc", background: true } },
    ],
  },
  {
    collection: "userStats",
    create: [
      {
        keys: { lastPlayDate: -1, points: -1, streak: -1 },
        options: { name: "userStats_lastPlayDate_points_streak_desc", background: true },
      },
    ],
  },
  {
    collection: "puzzleAttempts",
    create: [
      {
        keys: { userId: 1, puzzleId: 1 },
        options: { name: "puzzleAttempts_userId_puzzleId", background: true },
      },
      {
        keys: { attemptedAt: -1 },
        options: { name: "puzzleAttempts_attemptedAt_desc", background: true },
      },
      {
        keys: { userId: 1, attemptedAt: -1 },
        options: { name: "puzzleAttempts_userId_attemptedAt", background: true },
      },
    ],
  },
  {
    collection: "blogPosts",
    create: [
      { keys: { createdAt: -1 }, options: { name: "blogPosts_createdAt_desc", background: true } },
    ],
  },
];

async function fixIndexes() {
  console.log("🔧 Starting MongoDB index fixes...\n");

  const client = getConnection();
  try {
    // Ensure connection is established
    if (!client.topology?.isConnected()) {
      await client.connect();
    }

    let totalDropped = 0;
    let totalCreated = 0;
    let totalErrors = 0;

    for (const fix of indexFixes) {
      const collection = getCollection(fix.collection);
      console.log(`📦 Processing collection: ${fix.collection}`);

      // Drop incorrect indexes
      if (fix.drop && fix.drop.length > 0) {
        for (const indexToDrop of fix.drop) {
          try {
            const existingIndexes = await collection.indexes();
            const indexExists = existingIndexes.some((idx) => idx.name === indexToDrop.name);

            if (indexExists) {
              await collection.dropIndex(indexToDrop.name);
              console.log(`  ✗ Dropped incorrect index: ${indexToDrop.name}`);
              totalDropped++;
            } else {
              console.log(`  ⊘ Index not found (may already be dropped): ${indexToDrop.name}`);
            }
          } catch (error) {
            console.error(`  ⚠ Failed to drop index ${indexToDrop.name}:`, error);
            totalErrors++;
          }
        }
      }

      // Create correct indexes
      for (const index of fix.create) {
        try {
          const indexName = index.options?.name || Object.keys(index.keys).join("_");
          const existingIndexes = await collection.indexes();
          const indexExists = existingIndexes.some((idx) => idx.name === indexName);

          if (indexExists) {
            console.log(`  ✓ Index already exists: ${indexName}`);
          } else {
            await collection.createIndex(index.keys, {
              ...index.options,
              background: true,
            });
            console.log(`  ✓ Created index: ${indexName}`);
            totalCreated++;
          }
        } catch (error) {
          console.error(`  ✗ Failed to create index:`, error);
          totalErrors++;
        }
      }
    }

    console.log("\n✅ Index fixes complete!");
    console.log(`   Dropped: ${totalDropped}`);
    console.log(`   Created: ${totalCreated}`);
    if (totalErrors > 0) {
      console.log(`   Errors: ${totalErrors}`);
    }
  } catch (error) {
    console.error("❌ Failed to fix indexes:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixIndexes()
    .then(() => {
      console.log("\n✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { fixIndexes };

