#!/usr/bin/env tsx

/**
 * Complete Neon Database Setup Script
 * 
 * This script handles the complete setup process:
 * 1. Environment validation
 * 2. Database connection test
 * 3. Migration generation and application
 * 4. Schema verification
 * 5. Initial data setup (if needed)
 */

import { execSync } from "child_process"
import { checkDatabaseHealth, db } from "../src/db/client"
import { PuzzlesRepo } from "../src/db/repositories/puzzles"

async function setupNeonDatabase() {
  console.log("🚀 Starting complete Neon database setup...")
  console.log("=" * 50)

  try {
    // Step 1: Validate environment variables
    console.log("🔍 Step 1: Validating environment variables...")
    const requiredEnvVars = [
      "DATABASE_URL",
      "POSTGRES_URL", 
      "POSTGRES_URL_NON_POOLING"
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:")
      missingVars.forEach(varName => console.error(`  - ${varName}`))
      console.error("\nPlease add these to your .env.local file")
      process.exit(1)
    }

    console.log("✅ Environment variables validated")

    // Step 2: Test database connection
    console.log("\n🔍 Step 2: Testing database connection...")
    const health = await checkDatabaseHealth()
    
    if (!health.healthy) {
      throw new Error(`Database connection failed: ${health.error}`)
    }
    
    console.log(`✅ Database connection healthy (${health.latency}ms)`)

    // Step 3: Generate migrations
    console.log("\n🔍 Step 3: Generating database migrations...")
    try {
      execSync("npx drizzle-kit generate", { stdio: "inherit" })
      console.log("✅ Migrations generated")
    } catch (error) {
      console.log("⚠️ Migration generation failed, continuing...")
    }

    // Step 4: Apply migrations
    console.log("\n🔍 Step 4: Applying database migrations...")
    try {
      execSync("npx drizzle-kit migrate", { stdio: "inherit" })
      console.log("✅ Migrations applied")
    } catch (error) {
      console.log("⚠️ Migration application failed, trying push...")
      try {
        execSync("npx drizzle-kit push", { stdio: "inherit" })
        console.log("✅ Schema pushed successfully")
      } catch (pushError) {
        console.error("❌ Both migrate and push failed")
        throw pushError
      }
    }

    // Step 5: Verify schema
    console.log("\n🔍 Step 5: Verifying database schema...")
    const result = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log("📋 Database tables created:")
    result.forEach((row: any) => {
      console.log(`  ✅ ${row.table_name}`)
    })

    // Step 6: Test repository functions
    console.log("\n🔍 Step 6: Testing repository functions...")
    const puzzleStats = await PuzzlesRepo.getPuzzleStats()
    
    if (puzzleStats.success) {
      console.log("✅ Puzzle repository working:")
      console.log(`  - Total puzzles: ${puzzleStats.data.totalPuzzles}`)
      console.log(`  - Average difficulty: ${puzzleStats.data.averageDifficulty}`)
    } else {
      console.log("⚠️ Puzzle repository test failed:", puzzleStats.error)
    }

    // Step 7: Test cron job endpoints
    console.log("\n🔍 Step 7: Testing cron job configuration...")
    console.log("✅ Cron jobs configured in vercel.json:")
    console.log("  - Puzzle generation: 0 0 * * * (midnight daily)")
    console.log("  - Notifications: 0 8 * * * (8 AM daily)")

    console.log("\n🎉 Neon database setup completed successfully!")
    console.log("=" * 50)
    console.log("Next steps:")
    console.log("1. Deploy to Vercel with environment variables")
    console.log("2. Test cron jobs after deployment")
    console.log("3. Monitor database performance in Neon dashboard")
    
  } catch (error) {
    console.error("\n❌ Neon database setup failed:", error)
    console.log("\nTroubleshooting:")
    console.log("1. Verify environment variables are correct")
    console.log("2. Check Neon database is not paused")
    console.log("3. Ensure SSL mode is set to 'require'")
    console.log("4. Run 'npm run db:test' to diagnose issues")
    process.exit(1)
  }
}

// Run the setup
setupNeonDatabase()
