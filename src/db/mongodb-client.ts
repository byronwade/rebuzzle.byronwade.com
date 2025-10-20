/**
 * MongoDB Client Configuration
 *
 * This module provides:
 * - MongoDB database connection
 * - Collection helpers
 * - Type-safe operations
 * - Proper error handling and health checks
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

/**
 * Get database URL from environment
 */
const getDatabaseUrl = (): string => {
  const url = process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Database URL not found. Please set MONGODB_URI or DATABASE_URL environment variable."
    );
  }

  return url;
};

/**
 * Global connection cache for hot-reloading in development
 */
const globalForDb = globalThis as unknown as {
  connection: MongoClient | undefined;
  db: Db | undefined;
};

/**
 * Get or create MongoDB connection (singleton pattern)
 */
export const getConnection = (): MongoClient => {
  if (!globalForDb.connection) {
    const connectionString = getDatabaseUrl();
    globalForDb.connection = new MongoClient(connectionString);
  }
  return globalForDb.connection;
};

/**
 * Get database instance
 */
export const getDatabase = (): Db => {
  if (!globalForDb.db) {
    const client = getConnection();
    globalForDb.db = client.db();
  }
  return globalForDb.db;
};

/**
 * Get collection helper
 */
export const getCollection = <T extends Record<string, any> = any>(name: string): Collection<T> => {
  const db = getDatabase();
  return db.collection<T>(name);
};

/**
 * Close database connection
 */
export const closeConnection = async (): Promise<void> => {
  if (globalForDb.connection) {
    await globalForDb.connection.close();
    globalForDb.connection = undefined;
    globalForDb.db = undefined;
  }
};

/**
 * Health check for database connection
 */
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  try {
    const start = Date.now();
    const client = getConnection();
    await client.db().admin().ping();
    const latency = Date.now() - start;

    return { healthy: true, latency };
  } catch (error) {
    console.error("[DB Health Check] Failed:", error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Export type for use in other files
export type Database = Db;
