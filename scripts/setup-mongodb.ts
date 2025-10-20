#!/usr/bin/env tsx

/**
 * MongoDB Setup Script
 * 
 * This script sets up MongoDB collections and indexes
 * for the Rebuzzle application
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function setupMongoDB() {
  console.log("🚀 Setting up MongoDB for Rebuzzle...");
  console.log("=" * 50);

  try {
    // Connect to MongoDB
    const connectionString = process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("MONGODB_URI or DATABASE_URL environment variable is required");
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
    await db.collection("users").createIndex({ "username": 1 }, { unique: true });
    await db.collection("users").createIndex({ "email": 1 }, { unique: true });
    await db.collection("users").createIndex({ "createdAt": 1 });

    // User Stats collection
    console.log("📈 Setting up userStats collection...");
    await db.createCollection("userStats");
    await db.collection("userStats").createIndex({ "userId": 1 }, { unique: true });
    await db.collection("userStats").createIndex({ "points": -1 });
    await db.collection("userStats").createIndex({ "streak": -1 });
    await db.collection("userStats").createIndex({ "level": -1 });

    // Puzzles collection
    console.log("🧩 Setting up puzzles collection...");
    await db.createCollection("puzzles");
    await db.collection("puzzles").createIndex({ "id": 1 }, { unique: true });
    await db.collection("puzzles").createIndex({ "difficulty": 1 });
    await db.collection("puzzles").createIndex({ "isActive": 1 });
    await db.collection("puzzles").createIndex({ "publishedAt": -1 });

    // Puzzle Attempts collection
    console.log("🎯 Setting up puzzleAttempts collection...");
    await db.createCollection("puzzleAttempts");
    await db.collection("puzzleAttempts").createIndex({ "id": 1 }, { unique: true });
    await db.collection("puzzleAttempts").createIndex({ "userId": 1 });
    await db.collection("puzzleAttempts").createIndex({ "puzzleId": 1 });
    await db.collection("puzzleAttempts").createIndex({ "createdAt": -1 });

    // Game Sessions collection
    console.log("🎮 Setting up gameSessions collection...");
    await db.createCollection("gameSessions");
    await db.collection("gameSessions").createIndex({ "id": 1 }, { unique: true });
    await db.collection("gameSessions").createIndex({ "userId": 1 });
    await db.collection("gameSessions").createIndex({ "puzzleId": 1 });
    await db.collection("gameSessions").createIndex({ "startedAt": -1 });
    await db.collection("gameSessions").createIndex({ "isCompleted": 1 });

    // Blog Posts collection
    console.log("📝 Setting up blogPosts collection...");
    await db.createCollection("blogPosts");
    await db.collection("blogPosts").createIndex({ "id": 1 }, { unique: true });
    await db.collection("blogPosts").createIndex({ "slug": 1 }, { unique: true });
    await db.collection("blogPosts").createIndex({ "authorId": 1 });
    await db.collection("blogPosts").createIndex({ "puzzleId": 1 });
    await db.collection("blogPosts").createIndex({ "publishedAt": -1 });
    await db.collection("blogPosts").createIndex({ "isPublished": 1 });

    // Achievements collection
    console.log("🏆 Setting up achievements collection...");
    await db.createCollection("achievements");
    await db.collection("achievements").createIndex({ "id": 1 }, { unique: true });
    await db.collection("achievements").createIndex({ "category": 1 });
    await db.collection("achievements").createIndex({ "points": -1 });
    await db.collection("achievements").createIndex({ "isActive": 1 });

    // User Achievements collection
    console.log("🎖️ Setting up userAchievements collection...");
    await db.createCollection("userAchievements");
    await db.collection("userAchievements").createIndex({ "userId": 1 });
    await db.collection("userAchievements").createIndex({ "achievementId": 1 });
    await db.collection("userAchievements").createIndex({ "earnedAt": -1 });

    // Levels collection
    console.log("📊 Setting up levels collection...");
    await db.createCollection("levels");
    await db.collection("levels").createIndex({ "level": 1 }, { unique: true });
    await db.collection("levels").createIndex({ "pointsRequired": 1 });
    await db.collection("levels").createIndex({ "isActive": 1 });

    // Push Subscriptions collection
    console.log("🔔 Setting up pushSubscriptions collection...");
    await db.createCollection("pushSubscriptions");
    await db.collection("pushSubscriptions").createIndex({ "userId": 1 });
    await db.collection("pushSubscriptions").createIndex({ "endpoint": 1 }, { unique: true });
    await db.collection("pushSubscriptions").createIndex({ "isActive": 1 });
    await db.collection("pushSubscriptions").createIndex({ "createdAt": -1 });

    // List all collections
    console.log("\n📋 Available collections:");
    const collections = await db.listCollections().toArray();
    collections.forEach(collection => {
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
