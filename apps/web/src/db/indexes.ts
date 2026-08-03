/**
 * Database Index Setup
 *
 * Creates indexes for optimal query performance.
 * Run this on application startup or as a migration script.
 *
 * Indexes are created with { background: true } to avoid blocking
 * database operations during creation.
 */

import type { Db, IndexSpecification } from "mongodb";
import { getDatabase } from "./mongodb";

interface IndexDefinition {
  collection: string;
  indexes: Array<{
    spec: IndexSpecification;
    options?: {
      unique?: boolean;
      sparse?: boolean;
      expireAfterSeconds?: number;
      name?: string;
      background?: boolean;
      partialFilterExpression?: Record<string, unknown>;
    };
  }>;
}

/**
 * All index definitions for the application
 */
const INDEX_DEFINITIONS: IndexDefinition[] = [
  // Users collection
  {
    collection: "users",
    indexes: [
      // Primary app lookup by public id (auth, stats, admin)
      { spec: { id: 1 }, options: { unique: true } },
      // Unique email lookup (authentication)
      { spec: { email: 1 }, options: { unique: true } },
      // Unique username lookup (profile display)
      { spec: { username: 1 }, options: { unique: true } },
      // Guest token lookup (anonymous users)
      { spec: { guestToken: 1 }, options: { sparse: true } },
      // IP hash lookup (guest identification)
      { spec: { ipHash: 1 }, options: { sparse: true } },
      // Device ID lookup (desktop/mobile apps)
      { spec: { deviceId: 1 }, options: { sparse: true } },
      // Admin user filtering
      { spec: { isAdmin: 1 }, options: { sparse: true } },
      // Guest user filtering
      { spec: { isGuest: 1 } },
      // Reset token lookup (password reset)
      { spec: { resetToken: 1 }, options: { sparse: true } },
    ],
  },

  // User stats collection
  {
    collection: "userStats",
    indexes: [
      // Primary lookup by user ID
      { spec: { userId: 1 }, options: { unique: true } },
      // Leaderboard queries (sorted by points, streak, level)
      { spec: { points: -1 } },
      { spec: { streak: -1 } },
      { spec: { level: -1 } },
      // Last play date for streak calculations
      { spec: { lastPlayDate: -1 } },
    ],
  },

  // Puzzles collection
  {
    collection: "puzzles",
    indexes: [
      // Today's puzzle lookup (most critical - used by all platforms)
      { spec: { publishedAt: -1, active: 1 } },
      // Puzzle by ID
      { spec: { id: 1 }, options: { unique: true } },
      // Puzzle by type
      { spec: { puzzleType: 1 } },
      // Difficulty filtering
      { spec: { difficulty: 1 } },
      // Category browsing
      { spec: { category: 1 }, options: { sparse: true } },
      // Creation date for admin views
      { spec: { createdAt: -1 } },
      // Combined index for filtered date queries
      { spec: { active: 1, publishedAt: -1, puzzleType: 1 } },
      // Bounded historical sampling for blind human calibration of generated boards
      {
        spec: { "metadata.aiGenerated": 1, puzzleType: 1, publishedAt: -1 },
        options: {
          name: "generated_rebus_playtest_backfill",
          partialFilterExpression: { "metadata.aiGenerated": true, visual: { $exists: true } },
        },
      },
      // Speeds UTC-day lookups used by findByDate
      { spec: { active: 1, publishedAt: 1 } },
      // Archive-wide answer lookups (app enforces uniqueness; sparse for legacy rows)
      {
        spec: { "metadata.answerKey": 1 },
        options: { sparse: true, name: "metadata_answerKey_sparse" },
      },
      // Race-safe uniqueness for all newly published rows. Legacy rows remain readable and
      // are still checked by the application until they can be audited/backfilled safely.
      {
        spec: { "metadata.answerKey": 1 },
        options: {
          unique: true,
          name: "answer_key_archive_v1_unique",
          partialFilterExpression: { "metadata.uniquenessContract": "archive-v1" },
        },
      },
      {
        spec: { "metadata.dailyPublicationKey": 1 },
        options: {
          unique: true,
          name: "daily_publication_archive_v1_unique",
          partialFilterExpression: { "metadata.uniquenessContract": "archive-v1" },
        },
      },
      // Fingerprint lookups for uniqueness tooling
      { spec: { "metadata.fingerprint": 1 }, options: { sparse: true } },
      // Structural novelty ledger: searchable archive composition dimensions
      {
        spec: { "metadata.noveltyEvidence.mechanismFamilyKey": 1, createdAt: -1 },
        options: { sparse: true, name: "novelty_mechanism_family_created" },
      },
      {
        spec: { "metadata.noveltyEvidence.mechanismKey": 1, createdAt: -1 },
        options: { sparse: true, name: "novelty_mechanism_created" },
      },
      {
        spec: { "metadata.noveltyEvidence.topologyKey": 1, createdAt: -1 },
        options: { sparse: true, name: "novelty_topology_created" },
      },
      {
        spec: { "metadata.noveltyEvidence.cueCombinationKey": 1, createdAt: -1 },
        options: { sparse: true, name: "novelty_cue_combination_created" },
      },
    ],
  },

  // Puzzle attempts collection
  {
    collection: "puzzleAttempts",
    indexes: [
      // User's attempts on a puzzle (prevent duplicate solutions)
      { spec: { userId: 1, puzzleId: 1 } },
      // User's attempt history
      { spec: { userId: 1, attemptedAt: -1 } },
      // Puzzle analytics (all attempts on a puzzle)
      { spec: { puzzleId: 1, attemptedAt: -1 } },
      // Correct answers analytics
      { spec: { puzzleId: 1, isCorrect: 1 } },
      // Time-based analytics
      { spec: { attemptedAt: -1 } },
      // Daily final-attempt lock: one completed/abandoned play per user per UTC day
      {
        spec: { userId: 1, puzzleDate: 1 },
        options: {
          unique: true,
          name: "userId_1_puzzleDate_1_final",
          partialFilterExpression: { isFinal: true },
        },
      },
      // Count today's guesses quickly
      { spec: { userId: 1, puzzleDate: 1, attemptedAt: 1 } },
    ],
  },

  // Game sessions collection
  {
    collection: "gameSessions",
    indexes: [
      // User's sessions
      { spec: { userId: 1, startTime: -1 } },
      // Active session lookup
      { spec: { puzzleId: 1, userId: 1 } },
      // Completed sessions for analytics
      { spec: { completed: 1, endTime: -1 } },
    ],
  },

  // Blog posts collection
  {
    collection: "blogPosts",
    indexes: [
      // SEO: slug lookup (most common - page loads)
      { spec: { slug: 1 }, options: { unique: true } },
      // ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // Puzzle reference
      { spec: { puzzleId: 1 }, options: { unique: true } },
      // Published date for listing/archive
      { spec: { publishedAt: -1 } },
      // Archive navigation
      { spec: { "archiveDate.year": 1, "archiveDate.month": 1, "archiveDate.day": 1 } },
      // Author posts
      { spec: { authorId: 1, publishedAt: -1 } },
      // Puzzle type filtering
      { spec: { puzzleType: 1, publishedAt: -1 } },
    ],
  },

  // AI blog proposals are idempotent per puzzle and point to their review PR.
  {
    collection: "blogPostProposals",
    indexes: [
      { spec: { puzzleId: 1 }, options: { unique: true } },
      { spec: { pullRequestNumber: 1 }, options: { sparse: true } },
      { spec: { createdAt: -1 } },
    ],
  },

  // Delivery state works for both repository-backed and legacy Mongo posts.
  {
    collection: "blogEmailDeliveries",
    indexes: [{ spec: { slug: 1 }, options: { unique: true } }, { spec: { sentAt: -1 } }],
  },

  // Achievements collection
  {
    collection: "achievements",
    indexes: [
      // ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // Category filtering
      { spec: { category: 1, order: 1 } },
      // Rarity filtering
      { spec: { rarity: 1 } },
      // Order for display
      { spec: { order: 1 } },
    ],
  },

  // User achievements collection
  {
    collection: "userAchievements",
    indexes: [
      // User's achievements
      { spec: { userId: 1, unlockedAt: -1 } },
      // Check if user has specific achievement
      { spec: { userId: 1, achievementId: 1 }, options: { unique: true } },
      // Achievement popularity
      { spec: { achievementId: 1 } },
      // Recent unlocks (for notifications/feed)
      { spec: { unlockedAt: -1 } },
    ],
  },

  // Email subscriptions collection
  {
    collection: "emailSubscriptions",
    indexes: [
      // Email lookup
      { spec: { email: 1 }, options: { unique: true } },
      // User's subscription
      { spec: { userId: 1 }, options: { sparse: true } },
      // Active subscriptions for cron job
      { spec: { enabled: 1, updatedAt: -1 } },
    ],
  },

  // In-app notifications collection
  {
    collection: "inAppNotifications",
    indexes: [
      // User's notifications (most common)
      { spec: { userId: 1, createdAt: -1 } },
      // Unread notifications
      { spec: { userId: 1, read: 1, createdAt: -1 } },
      // TTL for auto-cleanup (30 days)
      { spec: { createdAt: 1 }, options: { expireAfterSeconds: 30 * 24 * 60 * 60 } },
    ],
  },

  // Analytics events collection
  {
    collection: "analyticsEvents",
    indexes: [
      // Session events
      { spec: { sessionId: 1, timestamp: 1 } },
      // User events
      { spec: { userId: 1, timestamp: -1 }, options: { sparse: true } },
      // Event type analysis
      { spec: { eventType: 1, timestamp: -1 } },
      // Puzzle analytics
      { spec: { "metadata.puzzleId": 1 }, options: { sparse: true } },
      // Time-based analytics
      { spec: { timestamp: -1 } },
      // TTL for auto-cleanup (90 days)
      { spec: { timestamp: 1 }, options: { expireAfterSeconds: 90 * 24 * 60 * 60 } },
    ],
  },

  // User sessions collection
  {
    collection: "userSessions",
    indexes: [
      // Session lookup
      { spec: { id: 1 }, options: { unique: true } },
      // User sessions
      { spec: { userId: 1, startTime: -1 }, options: { sparse: true } },
      // Active sessions
      { spec: { startTime: -1 } },
      // TTL for auto-cleanup (30 days)
      { spec: { createdAt: 1 }, options: { expireAfterSeconds: 30 * 24 * 60 * 60 } },
    ],
  },

  // AI Decisions collection
  {
    collection: "aiDecisions",
    indexes: [
      // Primary ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // Operation grouping
      { spec: { operationId: 1, timestamp: 1 } },
      // Decision type analysis
      { spec: { decisionType: 1, timestamp: -1 } },
      // Provider/model analysis
      { spec: { provider: 1, model: 1, timestamp: -1 } },
      // Entity reference (puzzle, blog, etc.)
      { spec: { entityType: 1, entityId: 1 }, options: { sparse: true } },
      // User decisions
      { spec: { userId: 1, timestamp: -1 }, options: { sparse: true } },
      // Feedback pending
      { spec: { feedbackReceived: 1, decisionType: 1 } },
      // Time-based queries
      { spec: { timestamp: -1 } },
      // TTL for auto-cleanup (180 days)
      { spec: { createdAt: 1 }, options: { expireAfterSeconds: 180 * 24 * 60 * 60 } },
    ],
  },

  // AI Errors collection
  {
    collection: "aiErrors",
    indexes: [
      // Primary ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // Error analysis
      { spec: { errorCode: 1, timestamp: -1 } },
      { spec: { errorType: 1, severity: 1, timestamp: -1 } },
      // Provider errors
      { spec: { provider: 1, model: 1, timestamp: -1 } },
      // Unresolved errors
      { spec: { resolved: 1, timestamp: -1 } },
      // Related decision
      { spec: { decisionId: 1 }, options: { sparse: true } },
      // Tag-based filtering
      { spec: { tags: 1 } },
      // Time-based queries
      { spec: { timestamp: -1 } },
    ],
  },

  // AI Feedback collection
  {
    collection: "aiFeedback",
    indexes: [
      // Primary ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // User feedback
      { spec: { userId: 1, timestamp: -1 } },
      // Puzzle feedback
      { spec: { puzzleId: 1 }, options: { sparse: true } },
      // Decision feedback
      { spec: { decisionId: 1 }, options: { sparse: true } },
      // Feedback type analysis
      { spec: { feedbackType: 1, timestamp: -1 } },
      // Unprocessed feedback for learning
      { spec: { processedForLearning: 1, timestamp: -1 } },
      // Rating distribution
      { spec: { rating: 1 } },
    ],
  },

  // AI Configuration collection
  {
    collection: "aiConfigurations",
    indexes: [
      // Primary ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // Version lookup
      { spec: { version: 1 } },
      // Active config
      { spec: { status: 1, isDefault: 1 } },
      // A/B test lookup
      { spec: { "abTest.testId": 1 }, options: { sparse: true } },
    ],
  },

  // AI Learning Events collection
  {
    collection: "aiLearningEvents",
    indexes: [
      // Primary ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // Event type analysis
      { spec: { eventType: 1, timestamp: -1 } },
      // Status filtering
      { spec: { status: 1, timestamp: -1 } },
      // Applied config reference
      { spec: { appliedToConfigId: 1 }, options: { sparse: true } },
    ],
  },

  // Generation audit trail (Apex / Eve / fallback)
  {
    collection: "generationAudits",
    indexes: [
      { spec: { id: 1 }, options: { unique: true } },
      { spec: { createdAt: -1 } },
      { spec: { dateString: 1, createdAt: -1 } },
      { spec: { status: 1, createdAt: -1 } },
      { spec: { engine: 1, createdAt: -1 } },
      { spec: { answerKey: 1 }, options: { sparse: true } },
    ],
  },

  // Human calibration of immutable external benchmark fixtures
  {
    collection: "benchmarkReviewFixtures",
    indexes: [
      { spec: { id: 1 }, options: { unique: true } },
      {
        spec: { datasetId: 1, revision: 1, fixtureId: 1 },
        options: { unique: true, name: "dataset_revision_fixture_unique" },
      },
      { spec: { datasetId: 1, revision: 1, reviewStatus: 1, datasetRow: 1 } },
      { spec: { reviewerId: 1, reviewedAt: -1 }, options: { sparse: true } },
      { spec: { reasoningFeatures: 1, reviewStatus: 1 } },
    ],
  },

  // Blind human naming calibration for catalog pictograms at player sizes
  {
    collection: "iconRecognitionReviews",
    indexes: [
      { spec: { id: 1 }, options: { unique: true } },
      {
        spec: { contractVersion: 1, catalogVersion: 1, fixtureId: 1, reviewerId: 1 },
        options: { unique: true, name: "icon_fixture_reviewer_unique" },
      },
      { spec: { contractVersion: 1, catalogVersion: 1, fixtureId: 1, createdAt: -1 } },
      { spec: { reviewerId: 1, contractVersion: 1, catalogVersion: 1, createdAt: -1 } },
      { spec: { conceptId: 1, sizePx: 1, correct: 1 } },
      { spec: { matchedConceptId: 1, correct: 1 }, options: { sparse: true } },
    ],
  },

  // Human-governed generated pictogram registry
  {
    collection: "generatedPictogramCandidates",
    indexes: [
      { spec: { id: 1 }, options: { unique: true } },
      { spec: { assetSha256: 1 }, options: { unique: true } },
      { spec: { status: 1, createdAt: 1 } },
      { spec: { conceptKey: 1, styleId: 1, status: 1, updatedAt: -1 } },
      {
        spec: { conceptKey: 1, styleId: 1 },
        options: {
          unique: true,
          name: "one_approved_generated_asset_per_concept",
          partialFilterExpression: { status: "approved" },
        },
      },
    ],
  },
  {
    collection: "generatedPictogramReviews",
    indexes: [
      { spec: { id: 1 }, options: { unique: true } },
      {
        spec: { registryVersion: 1, candidateId: 1, sizePx: 1, reviewerId: 1 },
        options: { unique: true, name: "generated_asset_size_reviewer_unique" },
      },
      { spec: { candidateId: 1, sizePx: 1, createdAt: 1 } },
      { spec: { reviewerId: 1, registryVersion: 1, createdAt: 1 } },
    ],
  },

  // Blind human playtesting of actual AI-generated puzzle boards
  {
    collection: "puzzlePlaytestCandidates",
    indexes: [
      { spec: { id: 1 }, options: { unique: true } },
      { spec: { contractVersion: 1, puzzleId: 1 }, options: { unique: true } },
      { spec: { contractVersion: 1, status: 1, createdAt: 1 } },
      { spec: { contractVersion: 1, evidenceRole: 1, status: 1, createdAt: 1 } },
      { spec: { techniqueId: 1, difficultyScore: 1, status: 1 } },
    ],
  },
  {
    collection: "puzzlePlaytestReviews",
    indexes: [
      { spec: { id: 1 }, options: { unique: true } },
      {
        spec: { contractVersion: 1, candidateId: 1, reviewerId: 1 },
        options: { unique: true, name: "one_profile_per_candidate_reviewer" },
      },
      { spec: { contractVersion: 1, candidateId: 1, profileId: 1, createdAt: 1 } },
      { spec: { contractVersion: 1, reviewerId: 1, createdAt: 1 } },
      { spec: { failureReason: 1, correct: 1 }, options: { sparse: true } },
    ],
  },

  // Levels collection
  {
    collection: "levels",
    indexes: [
      // Primary ID lookup
      { spec: { id: 1 }, options: { unique: true } },
      // Level number lookup
      { spec: { levelNumber: 1 }, options: { unique: true } },
      // Points threshold lookup
      { spec: { pointsRequired: 1 } },
    ],
  },
];

/**
 * Create all indexes for a collection
 */
async function createCollectionIndexes(
  db: Db,
  definition: IndexDefinition
): Promise<{ collection: string; created: number; failures: string[] }> {
  const collection = db.collection(definition.collection);
  const failures: string[] = [];
  let created = 0;

  // react-doctor-sequential: intentional — order/rate-limit required
  for (const indexDef of definition.indexes) {
    try {
      await collection.createIndex(indexDef.spec, {
        ...indexDef.options,
        background: true, // Don't block operations
      });
      created++;
    } catch (error) {
      // Index might already exist with different options
      const failureText = error instanceof Error ? error.message : String(error);

      // Ignore "index already exists" errors
      if (!failureText.includes("already exists")) {
        failures.push(`${JSON.stringify(indexDef.spec)}: ${failureText}`);
      }
    }
  }

  return { collection: definition.collection, created, failures };
}

/**
 * Setup all database indexes
 * Call this on application startup or as a one-time migration
 */
export async function setupDatabaseIndexes(): Promise<{
  success: boolean;
  results: Array<{ collection: string; created: number; failures: string[] }>;
  totalCreated: number;
  totalErrors: number;
}> {
  const db = getDatabase();
  const results: Array<{ collection: string; created: number; failures: string[] }> = [];
  let totalCreated = 0;
  let totalErrors = 0;

  console.log("[DB Indexes] Starting index setup...");

  for (const definition of INDEX_DEFINITIONS) {
    const result = await createCollectionIndexes(db, definition);
    results.push(result);
    totalCreated += result.created;
    totalErrors += result.failures.length;

    if (result.failures.length > 0) {
      console.warn(`[DB Indexes] ${result.collection}: ${result.failures.length} errors`);
      for (const error of result.failures) {
        console.warn(`  - ${error}`);
      }
    } else if (result.created > 0) {
      console.log(`[DB Indexes] ${result.collection}: ${result.created} indexes created`);
    }
  }

  console.log(`[DB Indexes] Complete: ${totalCreated} indexes created, ${totalErrors} errors`);

  return {
    success: totalErrors === 0,
    results,
    totalCreated,
    totalErrors,
  };
}

/**
 * List all existing indexes in the database
 */
export async function listAllIndexes(): Promise<
  Map<string, Array<{ name: string; key: Record<string, number> }>>
> {
  const db = getDatabase();
  const indexMap = new Map<string, Array<{ name: string; key: Record<string, number> }>>();

  // Get all collection names
  const collections = await db.listCollections().toArray();

  for (const collInfo of collections) {
    const collection = db.collection(collInfo.name);
    const indexes = await collection.indexes();
    indexMap.set(
      collInfo.name,
      indexes.map((idx) => ({
        name: idx.name || "unknown",
        key: idx.key as Record<string, number>,
      }))
    );
  }

  return indexMap;
}

/**
 * Drop all non-_id indexes (useful for resetting)
 * WARNING: This can cause performance issues during re-indexing
 */
export async function dropAllCustomIndexes(): Promise<{
  success: boolean;
  dropped: number;
  failures: string[];
}> {
  const db = getDatabase();
  let dropped = 0;
  const failures: string[] = [];

  const collections = await db.listCollections().toArray();

  for (const collInfo of collections) {
    try {
      const collection = db.collection(collInfo.name);
      const indexes = await collection.indexes();

      for (const index of indexes) {
        // Skip the _id index
        if (index.name === "_id_") continue;

        try {
          await collection.dropIndex(index.name!);
          dropped++;
        } catch (error) {
          const failureText = error instanceof Error ? error.message : String(error);
          failures.push(`${collInfo.name}.${index.name}: ${failureText}`);
        }
      }
    } catch (error) {
      const failureText = error instanceof Error ? error.message : String(error);
      failures.push(`${collInfo.name}: ${failureText}`);
    }
  }

  return { success: failures.length === 0, dropped, failures };
}
