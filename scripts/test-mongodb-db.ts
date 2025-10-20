#!/usr/bin/env tsx

/**
 * MongoDB Database Test Script
 * 
 * This script tests the MongoDB database connection
 * and verifies all collections are working
 */

import { checkDatabaseHealth, getDatabase, getCollection, closeConnection } from "../src/db/mongodb-client";

async function testMongoDB() {
  console.log("🧪 Testing MongoDB database connection...");
  console.log("=" * 50);

  try {
    // Test database health
    console.log("📡 Testing database health...");
    const health = await checkDatabaseHealth();
    
    if (health.healthy) {
      console.log(`✅ Database connection successful! Latency: ${health.latency}ms`);
    } else {
      console.error(`❌ Database connection failed: ${health.error}`);
      process.exit(1);
    }

    // Test database operations
    console.log("\n📊 Testing database operations...");
    const db = getDatabase();
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });

    // Test users collection
    console.log("\n👥 Testing users collection...");
    const usersCollection = getCollection("users");
    const userCount = await usersCollection.countDocuments();
    console.log(`  Users: ${userCount} documents`);

    // Test userStats collection
    console.log("\n📈 Testing userStats collection...");
    const userStatsCollection = getCollection("userStats");
    const statsCount = await userStatsCollection.countDocuments();
    console.log(`  User Stats: ${statsCount} documents`);

    // Test puzzles collection
    console.log("\n🧩 Testing puzzles collection...");
    const puzzlesCollection = getCollection("puzzles");
    const puzzleCount = await puzzlesCollection.countDocuments();
    console.log(`  Puzzles: ${puzzleCount} documents`);

    // Test blogPosts collection
    console.log("\n📝 Testing blogPosts collection...");
    const blogPostsCollection = getCollection("blogPosts");
    const blogCount = await blogPostsCollection.countDocuments();
    console.log(`  Blog Posts: ${blogCount} documents`);

    // Test indexes
    console.log("\n🔍 Testing indexes...");
    const usersIndexes = await usersCollection.indexes();
    console.log(`  Users collection has ${usersIndexes.length} indexes`);

    const userStatsIndexes = await userStatsCollection.indexes();
    console.log(`  UserStats collection has ${userStatsIndexes.length} indexes`);

    console.log("\n🎉 MongoDB database test completed successfully!");
    console.log("=" * 50);
    console.log("Database is ready for use!");
    
  } catch (error) {
    console.error("\n❌ MongoDB database test failed:", error);
    console.log("\nTroubleshooting:");
    console.log("1. Verify MONGODB_URI is set correctly");
    console.log("2. Check if MongoDB Atlas cluster is active");
    console.log("3. Ensure network access is configured");
    console.log("4. Verify database user permissions");
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Run the test
testMongoDB();
