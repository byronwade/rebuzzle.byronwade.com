/**
 * SEO Utility Functions
 *
 * Helper functions for SEO operations including canonical URLs,
 * metadata generation, and URL formatting.
 */

import { getAppUrl } from "../env";

/**
 * Get the canonical URL for a given path
 */
export function getCanonicalUrl(path: string): string {
  const baseUrl = getAppUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Format a date for SEO metadata (ISO 8601)
 */
export function formatDateForSEO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Truncate text to a specific length for meta descriptions
 */
export function truncateDescription(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Generate keywords array from text
 */
export function generateKeywords(
  text: string,
  additional: string[] = []
): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const uniqueWords = Array.from(new Set([...words, ...additional]));
  return uniqueWords.slice(0, 10); // Limit to 10 keywords
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
  return getAppUrl();
}

/**
 * Build a full URL from a path
 */
export function buildUrl(path: string): string {
  return getCanonicalUrl(path);
}

