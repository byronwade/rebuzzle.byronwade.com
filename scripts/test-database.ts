#!/usr/bin/env tsx

/**
 * Database Connection Test Script
 * 
 * This script tests the Neon database connection and basic operations
 */

import { checkDatabaseHealth, db } from "../src/db/client"
import { PuzzlesRepo } from "../src/db/repositories/puzzles"

async function testDatabase() {
  console.log("🧪 Testing Neon database connection...")

  try {
    // Test 1: Basic connection health
    console.log("📡 Testing database health...")
    const health = await checkDatabaseHealth()
    
    if (!health.healthy) {
      throw new Error(`Database connection failed: ${health.error}`)
    }
    
    console.log(`✅ Database connection healthy (${health.latency}ms)`)

    // Test 2: Test basic query
    console.log("🔍 Testing basic query...")
    const result = await db.execute("SELECT NOW() as current_time")
    console.log(`✅ Current database time: ${result[0]?.current_time}`)

    // Test 3: Test puzzle repository
    console.log("🧩 Testing puzzle repository...")
    const puzzleStats = await PuzzlesRepo.getPuzzleStats()
    
    if (puzzleStats.success) {
      console.log("✅ Puzzle repository working:")
      console.log(`  - Total puzzles: ${puzzleStats.data.totalPuzzles}`)
      console.log(`  - Average difficulty: ${puzzleStats.data.averageDifficulty}`)
      console.log(`  - Earliest scheduled: ${puzzleStats.data.earliestScheduled}`)
      console.log(`  - Latest scheduled: ${puzzleStats.data.latestScheduled}`)
    } else {
      console.log("⚠️ Puzzle repository test failed:", puzzleStats.error)
    }

    // Test 4: Test today's puzzle
    console.log("📅 Testing today's puzzle query...")
    const todaysPuzzle = await PuzzlesRepo.findTodaysPuzzle()
    
    if (todaysPuzzle.success) {
      if (todaysPuzzle.data) {
        console.log(`✅ Today's puzzle found: ${todaysPuzzle.data.answer}`)
      } else {
        console.log("ℹ️ No puzzle scheduled for today")
      }
    } else {
      console.log("⚠️ Today's puzzle query failed:", todaysPuzzle.error)
    }

    console.log("🎉 Database test completed successfully!")
    
  } catch (error) {
    console.error("❌ Database test failed:", error)
    process.exit(1)
  }
}

// Run the test
testDatabase()
