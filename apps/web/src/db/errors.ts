/**
 * Database Error Handling System
 *
 * Provides type-safe error handling for database operations
 * with proper categorization and user-friendly messages
 */

/**
 * Base database error class
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Not found error - when a record doesn't exist
 */
export class NotFoundError extends DatabaseError {
  constructor(resource: string, identifier?: string) {
    super(`${resource} not found${identifier ? `: ${identifier}` : ""}`, "NOT_FOUND", {
      resource,
      identifier,
    });
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Validation error - when data doesn't meet requirements
 */
export class ValidationError extends DatabaseError {
  constructor(message: string, field?: string) {
    super(message, "VALIDATION_ERROR", { field });
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Unique constraint violation
 */
export class UniqueConstraintError extends DatabaseError {
  constructor(field: string, value?: string) {
    super(`${field} already exists${value ? `: ${value}` : ""}`, "UNIQUE_VIOLATION", {
      field,
      value,
    });
    this.name = "UniqueConstraintError";
    Object.setPrototypeOf(this, UniqueConstraintError.prototype);
  }
}

/**
 * Foreign key constraint violation
 */
export class ForeignKeyError extends DatabaseError {
  constructor(table: string, field: string) {
    super(`Referenced ${field} does not exist in ${table}`, "FOREIGN_KEY_VIOLATION", {
      table,
      field,
    });
    this.name = "ForeignKeyError";
    Object.setPrototypeOf(this, ForeignKeyError.prototype);
  }
}

/**
 * Connection error - when database is unreachable
 */
export class ConnectionError extends DatabaseError {
  constructor(details?: unknown) {
    super("Failed to connect to database", "CONNECTION_ERROR", details);
    this.name = "ConnectionError";
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * Transaction error - when a transaction fails
 */
export class TransactionError extends DatabaseError {
  constructor(message: string, details?: unknown) {
    super(message, "TRANSACTION_ERROR", details);
    this.name = "TransactionError";
    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}

/**
 * Parse postgres error codes into typed errors
 */
export function parsePostgresError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const pgError = error as {
      code?: string;
      constraint?: string;
      detail?: string;
      table?: string;
      column?: string;
    };

    // Unique constraint violation
    if (pgError.code === "23505") {
      const field = pgError.constraint?.replace(/_.*/, "") || "field";
      return new UniqueConstraintError(field);
    }

    // Foreign key violation
    if (pgError.code === "23503") {
      return new ForeignKeyError(pgError.table || "table", pgError.column || "field");
    }

    // Connection errors
    if (pgError.code?.startsWith("08")) {
      return new ConnectionError(pgError);
    }

    // Transaction errors
    if (pgError.code?.startsWith("40")) {
      return new TransactionError(pgError.detail || "Transaction failed", pgError);
    }
  }

  // Generic database error
  return new DatabaseError(
    error instanceof Error ? error.message : "Unknown database error",
    "UNKNOWN_ERROR",
    error
  );
}

/**
 * Result type for database operations
 * Follows the Result pattern for better error handling
 */
export type DbResult<T, E = DatabaseError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create success result
 */
export function success<T>(data: T): DbResult<T> {
  return { success: true, data };
}

/**
 * Create error result
 */
export function failure<E extends DatabaseError>(error: E): DbResult<never, E> {
  return { success: false, error };
}

/**
 * Wrap async database operations with error handling
 */
export async function wrapDbOperation<T>(operation: () => Promise<T>): Promise<DbResult<T>> {
  try {
    const result = await operation();
    return success(result);
  } catch (error) {
    const dbError = parsePostgresError(error);
    console.error("[DB Operation Error]", dbError);
    return failure(dbError);
  }
}
