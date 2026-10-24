/**
 * MongoDB Database Client
 *
 * Clean, efficient MongoDB setup for Rebuzzle with:
 * - Connection pooling
 * - Automatic reconnection
 * - Health checks with retry logic
 * - Graceful error handling
 */

import { config } from "dotenv";
import { type Collection, type Db, MongoClient, type MongoClientOptions } from "mongodb";
import { getDatabaseUrl, getMongoDatabaseName } from "@/lib/env";

// Load .env.local only in local development. On Vercel, env vars are injected
// by the platform — calling dotenv there logs noisy "injecting env (0)" tips.
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  config({ path: ".env.local", quiet: true });
}

/** Database connection status */
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/** Connection state tracking */
let connectionStatus: ConnectionStatus = "disconnected";
let lastError: Error | null = null;

/**
 * MongoDB connection options optimized for serverless environments
 */
const getConnectionOptions = (): MongoClientOptions => ({
  // Connection pool settings - optimized for serverless (no warm min pool)
  maxPoolSize: process.env.NODE_ENV === "production" ? 5 : 5,
  minPoolSize: 0,

  // Connection timeout settings
  connectTimeoutMS: 8_000,
  socketTimeoutMS: 45_000, // 45 seconds for socket operations

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Server selection timeout
  serverSelectionTimeoutMS: 8_000,

  // Heartbeat settings (keep connections alive)
  heartbeatFrequencyMS: 10_000, // Send heartbeat every 10 seconds

  // Compression (if supported by server)
  compressors: ["zlib"] as ("none" | "zlib" | "snappy" | "zstd")[],

  // Wait queue settings
  maxIdleTimeMS: 30_000, // Close idle connections after 30 seconds
  waitQueueTimeoutMS: 8_000,
});

/**
 * Global connection cache for hot-reloading in development
 */
const globalForDb = globalThis as unknown as {
  client: MongoClient | undefined;
  db: Db | undefined;
  connectionPromise: Promise<MongoClient> | undefined;
  indexesInitialized: boolean;
};

export function shouldAutoInitializeIndexes(environment: NodeJS.ProcessEnv = process.env): boolean {
  if (environment.REBUZZLE_SKIP_AUTO_INDEXES === "1") return false;
  if (environment.NEXT_PHASE?.includes("production-build")) return false;
  if (environment.npm_lifecycle_event === "build") return false;
  // Production serverless cold starts must not list/create indexes on every instance —
  // that contends with real requests and makes the app feel sluggish. Opt in with
  // REBUZZLE_AUTO_INDEXES=1 for repair; prefer admin API / `pnpm db:create-indexes`.
  if (environment.NODE_ENV === "production" && environment.REBUZZLE_AUTO_INDEXES !== "1") {
    return false;
  }
  return true;
}

/**
 * Get or create MongoDB connection (singleton pattern)
 * Configured with connection pooling, retry logic, and timeouts
 */
export const getConnection = (): MongoClient => {
  if (!globalForDb.client) {
    const connectionString = getDatabaseUrl();
    const options = getConnectionOptions();

    globalForDb.client = new MongoClient(connectionString, options);
    connectionStatus = "connecting";

    // Handle connection errors
    globalForDb.client.on("error", (error) => {
      console.error("[MongoDB] Connection error:", error);
      connectionStatus = "error";
      lastError = error;
    });

    globalForDb.client.on("close", () => {
      console.warn("[MongoDB] Connection closed");
      connectionStatus = "disconnected";
    });

    globalForDb.client.on("connectionReady", () => {
      console.log("[MongoDB] Connection ready");
      connectionStatus = "connected";
      lastError = null;
    });

    globalForDb.client.on("serverHeartbeatFailed", (event) => {
      console.warn("[MongoDB] Heartbeat failed:", event.failure?.message);
    });
  }
  return globalForDb.client;
};

/**
 * Get connection status
 */
export const getConnectionStatus = (): { status: ConnectionStatus; error: Error | null } => ({
  status: connectionStatus,
  error: lastError,
});

/**
 * Ensure connection is established
 * In serverless environments, connections may need to be re-established
 * This is called automatically on first database operation, but can be called explicitly
 * to pre-warm the connection
 */
export const ensureConnection = async (): Promise<void> => {
  const client = getConnection();

  // Try to connect if not already connected
  // MongoDB driver handles this gracefully if already connected
  try {
    await client.connect();
    connectionStatus = "connected";
    lastError = null;
  } catch (error) {
    // If connection fails, check if it's because we're already connected
    // MongoDB throws an error if already connected in some versions
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (!errorMsg.includes("already connected") && !errorMsg.includes("topology is closed")) {
        connectionStatus = "error";
        lastError = error;
        throw error;
      }
    }
    // Otherwise, we're likely already connected, which is fine
    connectionStatus = "connected";
  }
};

/**
 * Get database instance
 * MongoDB connects lazily on first operation, but this ensures connection is ready
 */
export const getDatabase = (): Db => {
  if (!globalForDb.db) {
    const client = getConnection();
    // Prefer URI path DB; otherwise use MONGODB_DB / "rebuzzle"
    // (Atlas marketplace URIs often omit a database path and would default to "test")
    const uriHasDbPath = /mongodb(?:\+srv)?:\/\/[^/]+\/[^/?]+/.test(getDatabaseUrl());
    globalForDb.db = uriHasDbPath ? client.db() : client.db(getMongoDatabaseName());

    // Kick connect once; Mongo operations await the same topology handshake.
    if (!globalForDb.connectionPromise) {
      globalForDb.connectionPromise = client.connect().then((c) => {
        connectionStatus = "connected";
        lastError = null;
        return c;
      });
      globalForDb.connectionPromise.catch((error) => {
        connectionStatus = "error";
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn("[MongoDB] Connection pre-warm failed:", error);
        globalForDb.connectionPromise = undefined;
      });
    }

    // Initialize indexes in background (only once per process)
    if (!globalForDb.indexesInitialized && shouldAutoInitializeIndexes()) {
      globalForDb.indexesInitialized = true;
      initializeIndexes().catch((error) => {
        console.warn("[MongoDB] Background index initialization failed:", error);
      });
    }
  }
  return globalForDb.db;
};

/**
 * Initialize database indexes in the background
 * This is called once per process on first database access
 */
async function initializeIndexes(): Promise<void> {
  try {
    // Dynamic import to avoid circular dependency
    const { setupDatabaseIndexes } = await import("./indexes");
    const result = await setupDatabaseIndexes();
    if (!result.success) {
      console.warn("[MongoDB] Some indexes failed to create:", result.totalErrors, "errors");
    }
  } catch (error) {
    console.error("[MongoDB] Failed to initialize indexes:", error);
  }
}

/**
 * Get collection helper with proper typing
 * MongoDB connects lazily on first operation, ensuring connection is ready
 */
export const getCollection = <T extends Record<string, any> = any>(name: string): Collection<T> => {
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
      // MongoDB 6.x doesn't expose topology directly, so we try to connect
      try {
        await client.connect();
      } catch {
        // Already connected - ignore error
      }

      await client.db().admin().ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      const failureText = error instanceof Error ? error.message : "Unknown error";

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
        continue;
      }

      // All retries failed
      console.error("[DB Health Check] Failed after retries:", failureText);
      return {
        healthy: false,
        error: failureText,
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
