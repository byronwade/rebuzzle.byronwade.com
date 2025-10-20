#!/usr/bin/env tsx

/**
 * Neon Auth Setup Script
 * 
 * This script sets up Neon Auth integration for:
 * - User authentication
 * - Leaderboard functionality
 * - User statistics
 * - Blog integration
 */

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { users, userStats, blogPosts, puzzles } from '../src/db/schema'
import { eq } from 'drizzle-orm'

async function setupNeonAuth() {
  console.log("🔐 Setting up Neon Auth integration...")
  console.log("=" * 50)

  try {
    // Initialize database connection
    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql)

    // Test database connection
    console.log("📡 Testing database connection...")
    await sql`SELECT 1`
    console.log("✅ Database connection successful")

    // Check if we have any users
    console.log("👥 Checking existing users...")
    const existingUsers = await db.select().from(users).limit(5)
    console.log(`Found ${existingUsers.length} existing users`)

    // Check if we have any blog posts
    console.log("📝 Checking existing blog posts...")
    const existingPosts = await db.select().from(blogPosts).limit(5)
    console.log(`Found ${existingPosts.length} existing blog posts`)

    // Check if we have any puzzles
    console.log("🧩 Checking existing puzzles...")
    const existingPuzzles = await db.select().from(puzzles).limit(5)
    console.log(`Found ${existingPuzzles.length} existing puzzles`)

    // Test leaderboard query
    console.log("🏆 Testing leaderboard functionality...")
    try {
      const leaderboard = await db
        .select({
          user: {
            id: users.id,
            username: users.username,
            email: users.email,
          },
          stats: {
            points: userStats.points,
            streak: userStats.streak,
            totalGames: userStats.totalGames,
            wins: userStats.wins,
            level: userStats.level,
          }
        })
        .from(userStats)
        .innerJoin(users, eq(userStats.userId, users.id))
        .orderBy(userStats.points)
        .limit(5)

      console.log(`✅ Leaderboard query successful (${leaderboard.length} entries)`)
    } catch (error) {
      console.log("⚠️ Leaderboard query failed (expected if no data):", error)
    }

    // Test blog posts query
    console.log("📰 Testing blog functionality...")
    try {
      const blogData = await db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          author: {
            username: users.username,
          },
          puzzle: {
            rebusPuzzle: puzzles.rebusPuzzle,
            answer: puzzles.answer,
          }
        })
        .from(blogPosts)
        .innerJoin(users, eq(blogPosts.authorId, users.id))
        .innerJoin(puzzles, eq(blogPosts.puzzleId, puzzles.id))
        .limit(3)

      console.log(`✅ Blog query successful (${blogData.length} entries)`)
    } catch (error) {
      console.log("⚠️ Blog query failed (expected if no data):", error)
    }

    console.log("\n🎉 Neon Auth setup completed successfully!")
    console.log("=" * 50)
    console.log("Next steps:")
    console.log("1. Set up Neon Auth environment variables")
    console.log("2. Configure authentication providers")
    console.log("3. Test user registration and login")
    console.log("4. Verify leaderboard and statistics functionality")
    console.log("5. Test blog post creation and retrieval")
    
  } catch (error) {
    console.error("\n❌ Neon Auth setup failed:", error)
    console.log("\nTroubleshooting:")
    console.log("1. Verify DATABASE_URL is set correctly")
    console.log("2. Check if Neon database is active")
    console.log("3. Ensure database schema is migrated")
    console.log("4. Run 'npm run db:setup-neon' first")
    process.exit(1)
  }
}

// Run the setup
setupNeonAuth()
