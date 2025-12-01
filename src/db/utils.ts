/**
 * Database Utility Functions
 *
 * Common helpers for database operations
 */

// Note: drizzle-orm removed as project uses MongoDB, not SQL
// If SQL support is needed in the future, reinstall drizzle-orm

/**
 * Create a date range for queries
 */
export function createDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

/**
 * Get today's date range
 */
export function getTodayRange(): { start: Date; end: Date } {
  return createDateRange(new Date());
}

/**
 * Parse date string to Date
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

/**
 * Format date to ISO string without time
 */
export function formatDateOnly(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Batch operations helper
 * Splits large arrays into smaller batches to avoid query limits
 */
export async function batchOperation<T, R>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const result = await operation(batch);
    results.push(result);
  }

  return results;
}

/**
 * Retry helper for transient database errors
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        // Exponential backoff
        const delay = delayMs * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function calculatePagination(
  page: number,
  pageSize: number
): { limit: number; offset: number } {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.min(Math.max(1, pageSize), 100); // Max 100 items

  return {
    limit: normalizedPageSize,
    offset: (normalizedPage - 1) * normalizedPageSize,
  };
}

export function createPaginatedResult<T>(
  data: T[],
  totalItems: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalItems / params.pageSize);

  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      totalPages,
      totalItems,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Measure query execution time
 */
export async function measureQuery<T>(
  name: string,
  query: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await query();
    const duration = performance.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.log(`[Query: ${name}] Completed in ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(
      `[Query: ${name}] Failed after ${duration.toFixed(2)}ms`,
      error
    );
    throw error;
  }
}
