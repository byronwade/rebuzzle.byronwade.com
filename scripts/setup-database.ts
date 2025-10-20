#!/usr/bin/env tsx

/**
 * Database Setup Script
 * 
 * This script:
 * 1. Runs database migrations
 * 2. Verifies database connection
 * 3. Sets up initial data if needed
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { checkDatabaseHealth } from "../src/db/client"
import { db } from "../src/db/client"

async function setupDatabase() {
  console.log("🚀 Setting up Neon database...")

  try {
    // Check database connection
    console.log("📡 Checking database connection...")
    const health = await checkDatabaseHealth()
    
    if (!health.healthy) {
      throw new Error(`Database connection failed: ${health.error}`)
    }
    
    console.log(`✅ Database connection healthy (${health.latency}ms)`)

    // Run migrations
    console.log("🔄 Running database migrations...")
    await migrate(db, { migrationsFolder: "./src/db/migrations" })
    console.log("✅ Migrations completed")

    // Verify tables exist
    console.log("🔍 Verifying database schema...")
    const result = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log("📋 Database tables:")
    result.forEach((row: any) => {
      console.log(`  - ${row.table_name}`)
    })

    console.log("🎉 Database setup completed successfully!")
    
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  }
}

// Run the setup
setupDatabase()
