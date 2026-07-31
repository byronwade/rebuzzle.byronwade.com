/**
 * Database Module Exports
 *
 * Clean MongoDB database interface for Rebuzzle
 */

// Analytics operations
export * from "./analytics-ops";
// AI Learning System operations
export * from "./ai-operations";
// Error handling
export * from "./errors";
// Database models
export * from "./models";
// MongoDB client
export {
  checkDatabaseHealth,
  closeConnection,
  getCollection,
  getConnection,
  getDatabase,
} from "./mongodb";
// Database operations
export * as db from "./operations";
