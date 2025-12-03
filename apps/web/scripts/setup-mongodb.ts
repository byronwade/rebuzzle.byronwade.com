#!/usr/bin/env tsx

/**
 * MongoDB Setup Script
 *
 * This script sets up MongoDB collections and indexes
 * for the Rebuzzle application
 */

import { config } from "dotenv";
import { MongoClient } from "mongodb";

// Load environment variables
config({ path: ".env.local" });

async function setupMongoDB() {
  console.log("🚀 Setting up MongoDB for Rebuzzle...");
  console.log("=" * 50);

  try {
    // Connect to MongoDB
    const connectionString =
      process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "MONGODB_URI or DATABASE_URL environment variable is required"
      );
    }

    console.log("📡 Connecting to MongoDB...");
    const client = new MongoClient(connectionString);
    await client.connect();

    const db = client.db();
    console.log("✅ Connected to MongoDB successfully!");

    // Create collections with indexes
    console.log("\n📊 Setting up collections and indexes...");

    // Users collection
    console.log("👥 Setting up users collection...");
    await db.createCollection("users");
    await db.collection("users").createIndex({ id: 1 }, { unique: true });
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ createdAt: -1 });
    await db.collection("users").createIndex({ lastLogin: -1 });
    await db.collection("users").createIndex({ resetToken: 1 });
    await db.collection("users").createIndex({ resetTokenExpiry: 1 });
    await db.collection("users").createIndex({ isAdmin: 1 }); // Index for admin queries

    // User Stats collection
    console.log("📈 Setting up userStats collection...");
    await db.createCollection("userStats");
    await db
      .collection("userStats")
      .createIndex({ userId: 1 }, { unique: true });
    await db.collection("userStats").createIndex({ points: -1 });
    await db.collection("userStats").createIndex({ streak: -1 });
    await db.collection("userStats").createIndex({ level: -1 });
    await db.collection("userStats").createIndex({ lastPlayDate: -1 });
    // Compound index for leaderboard queries with timeframe filtering
    await db
      .collection("userStats")
      .createIndex({ lastPlayDate: -1, points: -1, streak: -1 });

    // Puzzles collection
    console.log("🧩 Setting up puzzles collection...");
    await db.createCollection("puzzles");
    await db.collection("puzzles").createIndex({ id: 1 }, { unique: true });
    await db.collection("puzzles").createIndex({ difficulty: 1 });
    await db.collection("puzzles").createIndex({ active: 1 });
    await db.collection("puzzles").createIndex({ publishedAt: -1 });
    await db.collection("puzzles").createIndex({ publishedAt: 1, active: 1 });
    await db.collection("puzzles").createIndex({ createdAt: -1 });
    await db.collection("puzzles").createIndex({ puzzleType: 1 });

    // Puzzle Attempts collection
    console.log("🎯 Setting up puzzleAttempts collection...");
    await db.createCollection("puzzleAttempts");
    await db
      .collection("puzzleAttempts")
      .createIndex({ id: 1 }, { unique: true });
    await db.collection("puzzleAttempts").createIndex({ userId: 1 });
    await db.collection("puzzleAttempts").createIndex({ puzzleId: 1 });
    await db.collection("puzzleAttempts").createIndex({ userId: 1, puzzleId: 1 });
    await db.collection("puzzleAttempts").createIndex({ attemptedAt: -1 });
    await db.collection("puzzleAttempts").createIndex({ userId: 1, attemptedAt: -1 });
    // Compound index for checking today's puzzle completion (success or failure)
    await db.collection("puzzleAttempts").createIndex({
      userId: 1,
      attemptedAt: -1,
      isCorrect: 1,
      abandoned: 1,
    });

    // Game Sessions collection
    console.log("🎮 Setting up gameSessions collection...");
    await db.createCollection("gameSessions");
    await db
      .collection("gameSessions")
      .createIndex({ id: 1 }, { unique: true });
    await db.collection("gameSessions").createIndex({ userId: 1 });
    await db.collection("gameSessions").createIndex({ puzzleId: 1 });
    await db.collection("gameSessions").createIndex({ startedAt: -1 });
    await db.collection("gameSessions").createIndex({ isCompleted: 1 });

    // Blog Posts collection
    console.log("📝 Setting up blogPosts collection...");
    await db.createCollection("blogPosts");
    await db.collection("blogPosts").createIndex({ id: 1 }, { unique: true });
    await db.collection("blogPosts").createIndex({ slug: 1 }, { unique: true });
    await db.collection("blogPosts").createIndex({ authorId: 1 });
    await db.collection("blogPosts").createIndex({ puzzleId: 1 });
    await db.collection("blogPosts").createIndex({ publishedAt: -1 });
    await db.collection("blogPosts").createIndex({ createdAt: -1 });

    // Achievements collection
    console.log("🏆 Setting up achievements collection...");
    await db.createCollection("achievements");
    await db
      .collection("achievements")
      .createIndex({ id: 1 }, { unique: true });
    await db.collection("achievements").createIndex({ category: 1 });
    await db.collection("achievements").createIndex({ points: -1 });
    await db.collection("achievements").createIndex({ isActive: 1 });

    // User Achievements collection
    console.log("🎖️ Setting up userAchievements collection...");
    await db.createCollection("userAchievements");
    await db.collection("userAchievements").createIndex({ userId: 1 });
    await db.collection("userAchievements").createIndex({ achievementId: 1 });
    await db.collection("userAchievements").createIndex({ userId: 1, achievementId: 1 }, { unique: true });
    await db.collection("userAchievements").createIndex({ unlockedAt: -1 });

    // Levels collection
    console.log("📊 Setting up levels collection...");
    await db.createCollection("levels");
    await db.collection("levels").createIndex({ level: 1 }, { unique: true });
    await db.collection("levels").createIndex({ pointsRequired: 1 });
    await db.collection("levels").createIndex({ isActive: 1 });

    // Push Subscriptions collection
    console.log("🔔 Setting up pushSubscriptions collection...");
    await db.createCollection("pushSubscriptions");
    await db.collection("pushSubscriptions").createIndex({ userId: 1 });
    await db
      .collection("pushSubscriptions")
      .createIndex({ endpoint: 1 }, { unique: true });
    await db.collection("pushSubscriptions").createIndex({ createdAt: -1 });

    // Analytics Events collection
    console.log("📊 Setting up analyticsEvents collection...");
    await db.createCollection("analyticsEvents");
    await db
      .collection("analyticsEvents")
      .createIndex({ id: 1 }, { unique: true });
    await db.collection("analyticsEvents").createIndex({ userId: 1 });
    await db.collection("analyticsEvents").createIndex({ sessionId: 1 });
    await db.collection("analyticsEvents").createIndex({ eventType: 1 });
    await db.collection("analyticsEvents").createIndex({ timestamp: -1 });
    await db
      .collection("analyticsEvents")
      .createIndex({ "metadata.puzzleId": 1 });
    // Compound index for common queries
    await db
      .collection("analyticsEvents")
      .createIndex({ userId: 1, eventType: 1, timestamp: -1 });
    // TTL index for data retention (optional - 2 years)
    // await db.collection("analyticsEvents").createIndex({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

    // User Sessions collection
    console.log("👤 Setting up userSessions collection...");
    await db.createCollection("userSessions");
    await db
      .collection("userSessions")
      .createIndex({ id: 1 }, { unique: true });
    await db.collection("userSessions").createIndex({ userId: 1 });
    await db.collection("userSessions").createIndex({ startTime: -1 });
    await db.collection("userSessions").createIndex({ isReturningUser: 1 });
    await db.collection("userSessions").createIndex({ endTime: 1 });
    // Compound index for retention queries
    await db
      .collection("userSessions")
      .createIndex({ userId: 1, startTime: -1 });

    // ========================================================================
    // AI LEARNING SYSTEM COLLECTIONS
    // ========================================================================

    // AI Decisions collection - stores every AI decision with full context
    console.log("🤖 Setting up aiDecisions collection...");
    await db.createCollection("aiDecisions");
    await db.collection("aiDecisions").createIndex({ id: 1 }, { unique: true });
    await db.collection("aiDecisions").createIndex({ timestamp: -1 });
    await db.collection("aiDecisions").createIndex({ operationId: 1 });
    await db.collection("aiDecisions").createIndex({ decisionType: 1, timestamp: -1 });
    await db.collection("aiDecisions").createIndex({ "output.success": 1, timestamp: -1 });
    await db.collection("aiDecisions").createIndex({ entityId: 1, entityType: 1 });
    await db.collection("aiDecisions").createIndex({ "qualityMetrics.score": 1 });
    await db.collection("aiDecisions").createIndex({ provider: 1, model: 1, timestamp: -1 });
    await db.collection("aiDecisions").createIndex({ userId: 1, timestamp: -1 });
    // Compound index for common analytics queries
    await db.collection("aiDecisions").createIndex({
      decisionType: 1,
      "output.success": 1,
      timestamp: -1
    });

    // AI Errors collection - dedicated error tracking for pattern analysis
    console.log("⚠️ Setting up aiErrors collection...");
    await db.createCollection("aiErrors");
    await db.collection("aiErrors").createIndex({ id: 1 }, { unique: true });
    await db.collection("aiErrors").createIndex({ timestamp: -1 });
    await db.collection("aiErrors").createIndex({ errorCode: 1, timestamp: -1 });
    await db.collection("aiErrors").createIndex({ severity: 1, resolved: 1 });
    await db.collection("aiErrors").createIndex({ decisionId: 1 });
    await db.collection("aiErrors").createIndex({ tags: 1 });
    await db.collection("aiErrors").createIndex({ operationId: 1 });
    // Compound index for unresolved critical errors
    await db.collection("aiErrors").createIndex({
      resolved: 1,
      severity: 1,
      timestamp: -1
    });

    // AI Feedback collection - user feedback on AI outputs
    console.log("💬 Setting up aiFeedback collection...");
    await db.createCollection("aiFeedback");
    await db.collection("aiFeedback").createIndex({ id: 1 }, { unique: true });
    await db.collection("aiFeedback").createIndex({ puzzleId: 1 });
    await db.collection("aiFeedback").createIndex({ userId: 1, timestamp: -1 });
    await db.collection("aiFeedback").createIndex({ decisionId: 1 });
    await db.collection("aiFeedback").createIndex({ processedForLearning: 1 });
    await db.collection("aiFeedback").createIndex({ feedbackType: 1, timestamp: -1 });
    await db.collection("aiFeedback").createIndex({ rating: 1 });
    await db.collection("aiFeedback").createIndex({ timestamp: -1 });
    // Compound index for feedback aggregation
    await db.collection("aiFeedback").createIndex({
      feedbackType: 1,
      rating: 1,
      timestamp: -1
    });

    // AI Configurations collection - versioned AI config with A/B testing
    console.log("⚙️ Setting up aiConfigurations collection...");
    await db.createCollection("aiConfigurations");
    await db.collection("aiConfigurations").createIndex({ id: 1 }, { unique: true });
    await db.collection("aiConfigurations").createIndex({ version: 1 }, { unique: true });
    await db.collection("aiConfigurations").createIndex({ status: 1, isDefault: 1 });
    await db.collection("aiConfigurations").createIndex({ "abTest.testId": 1 });
    await db.collection("aiConfigurations").createIndex({ createdAt: -1 });

    // AI Learning Events collection - tracks how feedback influences AI
    console.log("📚 Setting up aiLearningEvents collection...");
    await db.createCollection("aiLearningEvents");
    await db.collection("aiLearningEvents").createIndex({ id: 1 }, { unique: true });
    await db.collection("aiLearningEvents").createIndex({ status: 1, timestamp: -1 });
    await db.collection("aiLearningEvents").createIndex({ appliedToConfigId: 1 });
    await db.collection("aiLearningEvents").createIndex({ eventType: 1, timestamp: -1 });
    await db.collection("aiLearningEvents").createIndex({ timestamp: -1 });
    // Index for finding learning events by feedback
    await db.collection("aiLearningEvents").createIndex({ feedbackIds: 1 });

    // List all collections
    console.log("\n📋 Available collections:");
    const collections = await db.listCollections().toArray();
    collections.forEach((collection) => {
      console.log(`  - ${collection.name}`);
    });

    console.log("\n🎉 MongoDB setup completed successfully!");
    console.log("=" * 50);
    console.log("Next steps:");
    console.log("1. Test the database connection");
    console.log("2. Start your application");
    console.log("3. Verify collections are working");
  } catch (error) {
    console.error("\n❌ MongoDB setup failed:", error);
    console.log("\nTroubleshooting:");
    console.log("1. Verify MONGODB_URI is set correctly");
    console.log("2. Check if MongoDB Atlas cluster is active");
    console.log("3. Ensure network access is configured");
    console.log("4. Verify database user permissions");
    process.exit(1);
  } finally {
    // Close connection
    try {
      await client.close();
    } catch (error) {
      // Connection might already be closed
    }
  }
}

// Run the setup
setupMongoDB();
