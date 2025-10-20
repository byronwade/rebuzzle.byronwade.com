/**
 * Database Module Exports
 *
 * Clean MongoDB database interface for Rebuzzle
 */

// MongoDB client
export { 
  getConnection, 
  getDatabase, 
  getCollection, 
  closeConnection, 
  checkDatabaseHealth 
} from "./mongodb";

// Database models
export * from "./models";

// Database operations
export * as db from "./operations";

// Error handling
export * from "./errors";
