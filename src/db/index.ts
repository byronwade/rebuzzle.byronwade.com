/**
 * Database Module Exports
 *
 * Central export point for all database functionality
 */

// Client and connection
export { db, getConnection, closeConnection, checkDatabaseHealth, transaction } from "./client"
export type { Database, Transaction } from "./client"

// Schema
export * from "./schema"

// Errors
export * from "./errors"

// Utilities
export * from "./utils"

// Repositories
export * as PushSubscriptionsRepo from "./repositories/push-subscriptions"
export * as PuzzlesRepo from "./repositories/puzzles"
