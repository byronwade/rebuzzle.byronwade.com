import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}

/**
 * Safely parse JSON from a Response object
 * Handles empty responses, invalid JSON, and network errors
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T | null> {
  try {
    // Check if response is ok
    if (!response.ok) {
      return null;
    }

    // Check if response has content
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return null;
    }

    // Get text first to check if it's empty
    const text = await response.text();
    if (!text || text.trim() === "") {
      return null;
    }

    // Parse JSON
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    return null;
  }
}
