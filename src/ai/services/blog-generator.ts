/**
 * Blog Post Generator Service
 *
 * Uses AI to generate engaging blog posts for past puzzles
 */

import { generateAIText } from "@/ai/client";
import { BLOG_CONFIG } from "@/ai/config/blog";
import type { PuzzleLike } from "@/lib/puzzleUtils";
import { getPuzzleDisplay, getPuzzleType } from "@/lib/puzzleUtils";

export interface GeneratedBlogPost {
  title: string;
  content: string;
  slug: string;
  excerpt: string;
}

/**
 * Generate a blog post for a specific puzzle
 */
export async function generateBlogPost(
  puzzle: PuzzleLike & {
    answer: string;
    difficulty: any;
    category?: string;
    explanation?: string;
  }
): Promise<GeneratedBlogPost> {
  console.log(`[Blog Generator] Generating post for puzzle: ${puzzle.answer}`);

  const puzzleType = getPuzzleType(puzzle);

  const puzzleData = {
    puzzle: getPuzzleDisplay(puzzle, puzzleType),
    rebusPuzzle: getPuzzleDisplay(puzzle, puzzleType), // For backward compatibility
    puzzleType,
    answer: puzzle.answer,
    category: puzzle.category,
    difficulty: puzzle.difficulty,
    explanation: puzzle.explanation || "A visual word puzzle.",
    complexityScore: (puzzle as any).complexityScore,
    hints: (puzzle as any).hints,
  };

  try {
    const response = await generateAIText({
      system: BLOG_CONFIG.prompts.system,
      prompt: BLOG_CONFIG.prompts.generatePost(puzzleData),
      temperature: 0.8, // Higher creativity for unique, elaborate content
      modelType: "smart", // Use smart model for comprehensive writing
      // Note: maxTokens handled by model defaults (typically 8192+ for smart models)
    });

    const content = response.text;

    // Extract title - look for a SHORT, PLAYFUL H1 title (without revealing the answer)
    const puzzleTypeName =
      puzzleData.puzzleType === "rebus"
        ? "Rebus"
        : puzzleData.puzzleType === "logic-grid"
          ? "Logic Grid"
          : puzzleData.puzzleType === "cryptic-crossword"
            ? "Cryptic Crossword"
            : puzzleData.puzzleType === "number-sequence"
              ? "Number Sequence"
              : puzzleData.puzzleType === "pattern-recognition"
                ? "Pattern Recognition"
                : puzzleData.puzzleType === "caesar-cipher"
                  ? "Caesar Cipher"
                  : puzzleData.puzzleType === "trivia"
                    ? "Trivia"
                    : "Puzzle";

    let title = `Today's ${puzzleTypeName} Challenge`;

    // First, try to find the H1 title from the first line
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) {
      const candidate = h1Match[1]
        .replace(/\*\*/g, "")
        .replace(/🧩|💡|✨|🎯/g, "")
        .trim();

      // Check if candidate contains the answer - if so, reject it
      const answerLower = puzzle.answer.toLowerCase();
      const candidateLower = candidate.toLowerCase();
      if (candidateLower.includes(answerLower)) {
        // Title contains answer, skip it and use fallback
      } else {
        // Ensure title is SHORT (40-60 chars, 4-8 words max)
        const words = candidate.split(/\s+/);
        if (words.length <= 8 && candidate.length <= 60) {
          // Good title length
          title = candidate;
        } else if (words.length > 8) {
          // Too many words - truncate to first 6-8 words
          title = words.slice(0, 8).join(" ");
          if (title.length > 60) {
            title = title.substring(0, 57) + "...";
          }
        } else if (candidate.length > 60) {
          // Too long - truncate
          title = candidate.substring(0, 57) + "...";
        }
      }
    }

    // Fallback: Generate a short, playful title without the answer
    if (title === `Today's ${puzzleTypeName} Challenge` || title.length > 60) {
      const difficultyPhrase =
        puzzleData.difficulty >= 7
          ? "Tricky"
          : puzzleData.difficulty >= 5
            ? "Challenging"
            : "Fun";
      title = `${difficultyPhrase} ${puzzleTypeName} Puzzle`;
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    // Generate excerpt from Executive Summary or first substantial paragraph
    let excerpt = `A comprehensive analysis of yesterday's ${puzzleTypeName.toLowerCase()} puzzle.`;
    const paragraphs = content.split(/\n\n+/);

    // Try to find Executive Summary section first
    const execSummaryIndex = paragraphs.findIndex(
      (p) =>
        p.toLowerCase().includes("executive summary") ||
        p.toLowerCase().includes("introduction")
    );

    if (execSummaryIndex >= 0 && execSummaryIndex + 1 < paragraphs.length) {
      const summaryPara = paragraphs[execSummaryIndex + 1];
      if (
        summaryPara &&
        !summaryPara.startsWith("#") &&
        summaryPara.length > 50
      ) {
        excerpt = summaryPara
          .replace(/\*\*/g, "")
          .replace(/\[.*?\]/g, "")
          .substring(0, 200)
          .trim();
        if (excerpt.length > 150) excerpt += "...";
      }
    }

    // Fallback to first substantial paragraph
    if (excerpt.length < 100) {
      const firstPara = paragraphs.find(
        (p) => !p.startsWith("#") && p.length > 100
      );
      if (firstPara) {
        excerpt = firstPara
          .replace(/\*\*/g, "")
          .replace(/\[.*?\]/g, "")
          .substring(0, 200)
          .trim();
        if (excerpt.length > 150) excerpt += "...";
      }
    }

    return {
      title,
      content,
      slug,
      excerpt,
    };
  } catch (error) {
    console.error("[Blog Generator] Failed to generate blog post:", error);
    throw error;
  }
}
