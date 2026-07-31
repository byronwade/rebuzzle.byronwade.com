/**
 * Blog Post Generator Service
 *
 * Uses AI to generate engaging blog posts for past puzzles
 * with structured sections for SEO optimization
 */

import { generateAIText } from "@/ai/client";
import { BLOG_CONFIG } from "@/ai/config/blog";
import type { BlogFAQItem, BlogPostSEOMetadata, BlogPostSections } from "@/db/models";
import type { PuzzleLike } from "@/lib/puzzleUtils";
import { getPuzzleDisplay, getPuzzleType } from "@/lib/puzzleUtils";

export interface GeneratedBlogPost {
  title: string;
  content: string;
  slug: string;
  excerpt: string;
  // NEW: Structured sections for enhanced display
  sections?: BlogPostSections;
  seoMetadata?: BlogPostSEOMetadata;
}

// AI response structure
interface AIBlogResponse {
  title: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  sections: {
    introduction?: string;
    puzzleAnalysis?: string;
    solvingStrategy?: string;
    puzzleHistory?: string;
    solution?: string;
    callToAction?: string;
  };
  faq: BlogFAQItem[];
  fullContent: string;
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

    const responseText = response.text;

    // Try to parse JSON response
    let parsedResponse: AIBlogResponse | null = null;
    let content: string;
    let title: string;
    let excerpt: string;
    let sections: BlogPostSections | undefined;
    let seoMetadata: BlogPostSEOMetadata | undefined;

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

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const rawJson = jsonMatch?.[1] ?? responseText;

    try {
      parsedResponse = JSON.parse(rawJson.trim()) as AIBlogResponse;
      console.log("[Blog Generator] Successfully parsed JSON response");
    } catch {
      console.log("[Blog Generator] Could not parse JSON, using fallback extraction");
    }

    if (parsedResponse) {
      // Use structured JSON response
      title = parsedResponse.title || `Today's ${puzzleTypeName} Challenge`;
      content = parsedResponse.fullContent || responseText;
      excerpt =
        parsedResponse.metaDescription ||
        `A comprehensive analysis of yesterday's ${puzzleTypeName.toLowerCase()} puzzle.`;

      // Build sections object
      sections = {
        introduction: parsedResponse.sections?.introduction,
        puzzleAnalysis: parsedResponse.sections?.puzzleAnalysis,
        solvingStrategy: parsedResponse.sections?.solvingStrategy,
        puzzleHistory: parsedResponse.sections?.puzzleHistory,
        faq: parsedResponse.faq,
      };

      // Build SEO metadata
      const wordCount = content.split(/\s+/).length;
      seoMetadata = {
        focusKeyword: parsedResponse.focusKeyword || `${puzzleTypeName.toLowerCase()} puzzle`,
        secondaryKeywords: parsedResponse.secondaryKeywords || [],
        metaDescription: parsedResponse.metaDescription || excerpt,
        readingTime: Math.ceil(wordCount / 200), // ~200 words per minute
        wordCount,
      };
    } else {
      // Fallback: Extract from plain text response
      content = responseText;
      title = `Today's ${puzzleTypeName} Challenge`;

      // Try to extract title from H1
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match?.[1]) {
        const candidate = h1Match[1]
          .replace(/\*\*/g, "")
          .replace(/🧩|💡|✨|🎯/g, "")
          .trim();

        // Check if candidate contains the answer
        const answerLower = puzzle.answer.toLowerCase();
        const candidateLower = candidate.toLowerCase();
        if (!candidateLower.includes(answerLower)) {
          const words = candidate.split(/\s+/);
          if (words.length <= 8 && candidate.length <= 60) {
            title = candidate;
          } else if (words.length > 8) {
            title = words.slice(0, 8).join(" ");
            if (title.length > 60) {
              title = `${title.substring(0, 57)}...`;
            }
          } else if (candidate.length > 60) {
            title = `${candidate.substring(0, 57)}...`;
          }
        }
      }

      // Fallback title
      if (title === `Today's ${puzzleTypeName} Challenge` || title.length > 60) {
        const difficultyPhrase =
          puzzleData.difficulty >= 7
            ? "Tricky"
            : puzzleData.difficulty >= 5
              ? "Challenging"
              : "Fun";
        title = `${difficultyPhrase} ${puzzleTypeName} Puzzle`;
      }

      // Generate excerpt from first paragraph
      excerpt = `A comprehensive analysis of yesterday's ${puzzleTypeName.toLowerCase()} puzzle.`;
      const paragraphs = content.split(/\n\n+/);
      const execSummaryIndex = paragraphs.findIndex(
        (p) =>
          p.toLowerCase().includes("executive summary") || p.toLowerCase().includes("introduction")
      );

      if (execSummaryIndex >= 0 && execSummaryIndex + 1 < paragraphs.length) {
        const summaryPara = paragraphs[execSummaryIndex + 1];
        if (summaryPara && !summaryPara.startsWith("#") && summaryPara.length > 50) {
          excerpt = summaryPara
            .replace(/\*\*/g, "")
            .replace(/\[.*?\]/g, "")
            .substring(0, 200)
            .trim();
          if (excerpt.length > 150) excerpt += "...";
        }
      }

      if (excerpt.length < 100) {
        const firstPara = paragraphs.find((p) => !p.startsWith("#") && p.length > 100);
        if (firstPara) {
          excerpt = firstPara
            .replace(/\*\*/g, "")
            .replace(/\[.*?\]/g, "")
            .substring(0, 200)
            .trim();
          if (excerpt.length > 150) excerpt += "...";
        }
      }
    }

    // Validate title doesn't contain answer
    if (title.toLowerCase().includes(puzzle.answer.toLowerCase())) {
      const difficultyPhrase =
        puzzleData.difficulty >= 7 ? "Tricky" : puzzleData.difficulty >= 5 ? "Challenging" : "Fun";
      title = `${difficultyPhrase} ${puzzleTypeName} Puzzle`;
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    return {
      title,
      content,
      slug,
      excerpt,
      sections,
      seoMetadata,
    };
  } catch (error) {
    console.error("[Blog Generator] Failed to generate blog post:", error);
    throw error;
  }
}
