/**
 * Database Index Migration Script
 *
 * Creates performance indexes on frequently queried fields across all collections.
 * Run this script once to optimize database query performance.
 *
 * Usage: tsx scripts/create-indexes.ts
 */

import { getCollection, getConnection } from "../src/db/mongodb";

interface IndexDefinition {
  collection: string;
  indexes: Array<{
    keys: Record<string, 1 | -1>;
    options?: {
      name?: string;
      unique?: boolean;
      sparse?: boolean;
      background?: boolean;
    };
  }>;
}

const indexDefinitions: IndexDefinition[] = [
  {
    collection: "puzzles",
    indexes: [
      { keys: { id: 1 }, options: { unique: true, name: "puzzles_id_unique" } },
      {
        keys: { publishedAt: 1, active: 1 },
        options: { name: "puzzles_publishedAt_active" },
      },
      { keys: { publishedAt: -1 }, options: { name: "puzzles_publishedAt_desc" } },
      { keys: { active: 1 }, options: { name: "puzzles_active" } },
      { keys: { createdAt: -1 }, options: { name: "puzzles_createdAt_desc" } },
      { keys: { puzzleType: 1 }, options: { name: "puzzles_puzzleType" } },
    ],
  },
  {
    collection: "puzzleAttempts",
    indexes: [
      {
        keys: { userId: 1, puzzleId: 1 },
        options: { name: "puzzleAttempts_userId_puzzleId" },
      },
      {
        keys: { attemptedAt: -1 },
        options: { name: "puzzleAttempts_attemptedAt_desc" },
      },
      { keys: { userId: 1 }, options: { name: "puzzleAttempts_userId" } },
      { keys: { puzzleId: 1 }, options: { name: "puzzleAttempts_puzzleId" } },
      {
        keys: { userId: 1, attemptedAt: -1 },
        options: { name: "puzzleAttempts_userId_attemptedAt" },
      },
    ],
  },
  {
    collection: "userStats",
    indexes: [
      { keys: { userId: 1 }, options: { unique: true, name: "userStats_userId_unique" } },
      {
        keys: { points: -1, streak: -1 },
        options: { name: "userStats_points_streak_desc" },
      },
      { keys: { lastPlayDate: -1 }, options: { name: "userStats_lastPlayDate_desc" } },
      { keys: { points: -1 }, options: { name: "userStats_points_desc" } },
      { keys: { streak: -1 }, options: { name: "userStats_streak_desc" } },
      {
        keys: { lastPlayDate: -1, points: -1, streak: -1 },
        options: { name: "userStats_lastPlayDate_points_streak_desc" },
      },
    ],
  },
  {
    collection: "blogPosts",
    indexes: [
      { keys: { slug: 1 }, options: { unique: true, name: "blogPosts_slug_unique" } },
      { keys: { publishedAt: -1 }, options: { name: "blogPosts_publishedAt_desc" } },
      { keys: { createdAt: -1 }, options: { name: "blogPosts_createdAt_desc" } },
      { keys: { authorId: 1 }, options: { name: "blogPosts_authorId" } },
      {
        keys: { publishedAt: 1 },
        options: { name: "blogPosts_publishedAt_asc", sparse: true },
      },
    ],
  },
  {
    collection: "users",
    indexes: [
      { keys: { id: 1 }, options: { unique: true, name: "users_id_unique" } },
      { keys: { email: 1 }, options: { unique: true, name: "users_email_unique" } },
      { keys: { lastLogin: -1 }, options: { name: "users_lastLogin_desc" } },
      { keys: { createdAt: -1 }, options: { name: "users_createdAt_desc" } },
    ],
  },
  {
    collection: "analyticsEvents",
    indexes: [
      { keys: { timestamp: -1 }, options: { name: "analyticsEvents_timestamp_desc" } },
      {
        keys: { userId: 1, timestamp: -1 },
        options: { name: "analyticsEvents_userId_timestamp" },
      },
      { keys: { userId: 1 }, options: { name: "analyticsEvents_userId" } },
      { keys: { eventType: 1 }, options: { name: "analyticsEvents_eventType" } },
      {
        keys: { eventType: 1, timestamp: -1 },
        options: { name: "analyticsEvents_eventType_timestamp" },
      },
    ],
  },
  {
    collection: "gameSessions",
    indexes: [
      { keys: { id: 1 }, options: { unique: true, name: "gameSessions_id_unique" } },
      { keys: { userId: 1 }, options: { name: "gameSessions_userId" } },
      { keys: { startTime: -1 }, options: { name: "gameSessions_startTime_desc" } },
      {
        keys: { userId: 1, startTime: -1 },
        options: { name: "gameSessions_userId_startTime" },
      },
    ],
  },
  {
    collection: "userAchievements",
    indexes: [
      {
        keys: { userId: 1, achievementId: 1 },
        options: { unique: true, name: "userAchievements_userId_achievementId_unique" },
      },
      { keys: { userId: 1 }, options: { name: "userAchievements_userId" } },
      { keys: { achievementId: 1 }, options: { name: "userAchievements_achievementId" } },
      { keys: { unlockedAt: -1 }, options: { name: "userAchievements_unlockedAt_desc" } },
    ],
  },
  {
    collection: "pushSubscriptions",
    indexes: [
      {
        keys: { endpoint: 1 },
        options: { unique: true, name: "pushSubscriptions_endpoint_unique" },
      },
      { keys: { userId: 1 }, options: { name: "pushSubscriptions_userId" } },
      { keys: { createdAt: -1 }, options: { name: "pushSubscriptions_createdAt_desc" } },
    ],
  },
  {
    collection: "emailSubscriptions",
    indexes: [
      { keys: { email: 1 }, options: { unique: true, name: "emailSubscriptions_email_unique" } },
      { keys: { enabled: 1 }, options: { name: "emailSubscriptions_enabled" } },
    ],
  },
];

async function createIndexes() {
  console.log("🚀 Starting database index creation...\n");

  const client = getConnection();
  try {
    // Ensure connection is established
    if (!client.topology?.isConnected()) {
      await client.connect();
    }

    let totalIndexes = 0;
    let createdIndexes = 0;
    let existingIndexes = 0;
    let errors = 0;

    for (const definition of indexDefinitions) {
      const collection = getCollection(definition.collection);
      console.log(`📦 Processing collection: ${definition.collection}`);

      for (const index of definition.indexes) {
        totalIndexes++;
        const indexName = index.options?.name || Object.keys(index.keys).join("_");

        try {
          // Check if index already exists
          const currentIndexes = await collection.indexes();
          const indexExists = currentIndexes.some((idx) => idx.name === indexName);

          if (indexExists) {
            console.log(`  ✓ Index already exists: ${indexName}`);
            existingIndexes++;
            continue;
          }

          // Create index in background to avoid blocking
          await collection.createIndex(index.keys, {
            ...index.options,
            background: true,
          });

          console.log(`  ✓ Created index: ${indexName}`);
          createdIndexes++;
        } catch (error) {
          console.error(`  ✗ Failed to create index ${indexName}:`, error);
          errors++;
        }
      }
    }

    console.log("\n✅ Index creation complete!");
    console.log(`   Total indexes: ${totalIndexes}`);
    console.log(`   Created: ${createdIndexes}`);
    console.log(`   Already existed: ${existingIndexes}`);
    if (errors > 0) {
      console.log(`   Errors: ${errors}`);
    }
  } catch (error) {
    console.error("❌ Failed to create indexes:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes()
    .then(() => {
      console.log("\n✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { createIndexes };


