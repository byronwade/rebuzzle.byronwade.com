/**
 * MongoDB Database Client
 *
 * Clean, efficient MongoDB setup for Rebuzzle
 */

import { config } from "dotenv";
import { type Collection, type Db, MongoClient } from "mongodb";

// Load environment variables
config({ path: ".env.local" });

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
  client: MongoClient | undefined;
  db: Db | undefined;
};

/**
 * Get or create MongoDB connection (singleton pattern)
 * Configured with connection pooling, retry logic, and timeouts
 */
export const getConnection = (): MongoClient => {
  if (!globalForDb.client) {
    const connectionString = getDatabaseUrl();

    // Configure connection options for production
    const options = {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool

      // Connection timeout settings
      connectTimeoutMS: 10_000, // 10 seconds to establish connection
      socketTimeoutMS: 45_000, // 45 seconds for socket operations

      // Retry settings
      retryWrites: true,
      retryReads: true,

      // Server selection timeout
      serverSelectionTimeoutMS: 10_000, // 10 seconds to select a server

      // Heartbeat settings (keep connections alive)
      heartbeatFrequencyMS: 10_000, // Send heartbeat every 10 seconds

      // Compression (if supported by server)
      compressors: ["zlib"] as ("none" | "zlib" | "snappy" | "zstd")[],
    };

    globalForDb.client = new MongoClient(connectionString, options);

    // Handle connection errors
    globalForDb.client.on("error", (error) => {
      console.error("[MongoDB] Connection error:", error);
    });

    globalForDb.client.on("close", () => {
      console.warn("[MongoDB] Connection closed");
    });

    globalForDb.client.on("reconnect", () => {
      console.log("[MongoDB] Reconnected");
    });
  }
  return globalForDb.client;
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
 * Get collection helper with proper typing
 */
export const getCollection = <T extends Record<string, any> = any>(
  name: string
): Collection<T> => {
  const db = getDatabase();
  return db.collection<T>(name);
};

/**
 * Close database connection
 */
export const closeConnection = async (): Promise<void> => {
  if (globalForDb.client) {
    await globalForDb.client.close();
    globalForDb.client = undefined;
    globalForDb.db = undefined;
  }
};

/**
 * Health check for database connection with retry logic
 */
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const start = Date.now();
      const client = getConnection();

      // Ensure connection is established
      if (!(client as any).topology?.isConnected()) {
        await client.connect();
      }

      await client.db().admin().ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );
        continue;
      }

      // All retries failed
      console.error("[DB Health Check] Failed after retries:", errorMessage);
      return {
        healthy: false,
        error: errorMessage,
      };
    }
  }

  return {
    healthy: false,
    error: "Health check failed after all retries",
  };
};

// Export type for use in other files
export type Database = Db;
