/**
 * Database Client Configuration
 *
 * This module provides:
 * - Singleton database connection
 * - Connection pooling for performance
 * - Proper cleanup and error handling
 * - Development vs production configuration
 */

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

/**
 * Global connection cache for hot-reloading in development
 * Prevents connection leaks during Next.js fast refresh
 */
const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined
}

/**
 * Database configuration based on environment
 */
const getConnectionConfig = (): postgres.Options<Record<string, postgres.PostgresType>> => {
  const baseConfig: postgres.Options<Record<string, postgres.PostgresType>> = {
    // Connection pooling configuration
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,

    // Automatic type parsing
    types: {
      date: {
        to: 1184,
        from: [1082, 1083, 1114, 1184],
        serialize: (x: unknown) => (x as Date).toISOString(),
        parse: (x: string) => new Date(x),
      },
    },

    // Error handling
    onnotice: process.env.NODE_ENV === "development"
      ? (notice) => console.log("[DB Notice]", notice)
      : undefined,

    // Debug mode in development
    debug: process.env.NODE_ENV === "development"
      ? (connection, query, params) => {
          console.log("[DB Query]", { query, params })
        }
      : undefined,
  }

  return baseConfig
}

/**
 * Get database URL from environment
 * Supports both regular and non-pooling connections
 */
const getDatabaseUrl = (): string => {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      "Database URL not found. Please set POSTGRES_URL_NON_POOLING or DATABASE_URL environment variable."
    )
  }

  return url
}

/**
 * Create postgres connection with proper configuration
 */
const createConnection = (): postgres.Sql => {
  const connectionString = getDatabaseUrl()
  const config = getConnectionConfig()

  return postgres(connectionString, config)
}

/**
 * Get or create database connection (singleton pattern)
 */
export const getConnection = (): postgres.Sql => {
  if (!globalForDb.connection) {
    globalForDb.connection = createConnection()
  }
  return globalForDb.connection
}

/**
 * Drizzle ORM instance with schema
 */
export const db = drizzle(getConnection(), {
  schema,
  logger: process.env.NODE_ENV === "development",
})

/**
 * Close database connection
 * Useful for cleanup in tests and serverless functions
 */
export const closeConnection = async (): Promise<void> => {
  if (globalForDb.connection) {
    await globalForDb.connection.end()
    globalForDb.connection = undefined
  }
}

/**
 * Health check for database connection
 */
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean
  latency?: number
  error?: string
}> => {
  try {
    const start = Date.now()
    await getConnection()`SELECT 1`
    const latency = Date.now() - start

    return { healthy: true, latency }
  } catch (error) {
    console.error("[DB Health Check] Failed:", error)
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Transaction helper with automatic rollback on error
 */
export const transaction = async <T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> => {
  return await db.transaction(async (tx) => {
    try {
      return await callback(tx)
    } catch (error) {
      console.error("[DB Transaction] Error:", error)
      throw error
    }
  })
}

// Export type for use in other files
export type Database = typeof db
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
