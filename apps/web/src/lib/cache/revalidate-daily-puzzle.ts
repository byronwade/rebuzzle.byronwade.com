import { revalidateTag } from "next/cache";
import { logger } from "@/lib/logger";

/**
 * Expire the daily-puzzle cache entries for a date.
 *
 * The play path can publish a puzzle while rendering `/`, where Next.js forbids
 * revalidateTag. The write already landed and the cached miss only lives for
 * seconds, so a refused revalidation is logged rather than failing the page.
 */
export function revalidateDailyPuzzle(dateString?: string): void {
  const tags = dateString ? ["daily-puzzle", `daily-puzzle-${dateString}`] : ["daily-puzzle"];
  for (const tag of tags) {
    try {
      revalidateTag(tag, "max");
    } catch (error) {
      logger.warn("Skipped daily-puzzle revalidation outside a server action", {
        tag,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
