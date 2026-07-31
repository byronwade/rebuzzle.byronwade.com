import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import type { Puzzle } from "@/db/models";
import { logger } from "@/lib/logger";

export type CachedDailyPuzzle = {
  id: string;
  puzzle: string;
  puzzleType: string;
  rebusPuzzle?: string;
  difficulty: number;
  answer: string;
  explanation: string;
  hints: string[];
  date: string;
  topic: string;
  keyword: string;
  category: string;
  relevanceScore: number;
  seoMetadata: Record<string, unknown>;
  aiGenerated: boolean;
  fromDatabase: true;
};

function formatPuzzleFromDb(puzzle: Puzzle, dateString: string): CachedDailyPuzzle {
  let puzzleDisplay = puzzle.puzzle || puzzle.rebusPuzzle || "";

  // Safety check: If puzzle text matches answer, it's likely corrupted data
  if (puzzleDisplay === puzzle.answer || puzzleDisplay.trim() === puzzle.answer.trim()) {
    logger.warn("Puzzle data may be corrupted - text matches answer", {
      puzzleDisplay,
      answer: puzzle.answer,
    });
    if (
      (puzzle.metadata as { clues?: string[] } | undefined)?.clues &&
      Array.isArray((puzzle.metadata as { clues?: string[] }).clues)
    ) {
      puzzleDisplay = ((puzzle.metadata as { clues: string[] }).clues).join("\n\n");
    } else {
      puzzleDisplay = "A logic grid puzzle. Use deductive reasoning to solve the relationships.";
    }
  }

  const puzzleType = puzzle.puzzleType || puzzle.metadata?.puzzleType || "rebus";

  return {
    id: puzzle.id,
    puzzle: puzzleDisplay,
    puzzleType,
    rebusPuzzle: puzzleType === "rebus" ? puzzleDisplay : undefined,
    difficulty:
      typeof puzzle.difficulty === "number"
        ? puzzle.difficulty
        : puzzle.difficulty === "easy"
          ? 3
          : puzzle.difficulty === "medium"
            ? 5
            : 7,
    answer: puzzle.answer,
    explanation: puzzle.explanation || "",
    hints: puzzle.metadata?.hints || puzzle.hints || ["No hints available"],
    date: dateString,
    topic: puzzle.metadata?.topic || "General",
    keyword: puzzle.answer.replace(/\s+/g, ""),
    category: puzzle.metadata?.category || puzzle.category || "general",
    relevanceScore: 8,
    seoMetadata: (puzzle.metadata?.seoMetadata as Record<string, unknown>) || {},
    aiGenerated: true,
    fromDatabase: true,
  };
}

/**
 * Cross-request cached DB read for today's puzzle.
 * Generation stays outside this cache so failures aren't cached.
 */
export async function getCachedDailyPuzzleFromDb(
  dateString: string
): Promise<CachedDailyPuzzle | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("daily-puzzle", `daily-puzzle-${dateString}`);

  logger.info("Cache lookup for daily puzzle", { dateString });

  const existingPuzzle = await db.puzzleOps.findTodaysPuzzle();
  if (!existingPuzzle) {
    return null;
  }

  logger.info("Cache hit: daily puzzle from database", {
    answer: existingPuzzle.answer,
    dateString,
  });

  return formatPuzzleFromDb(existingPuzzle, dateString);
}
