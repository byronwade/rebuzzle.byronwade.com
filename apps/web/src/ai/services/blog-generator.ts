/**
 * Blog Post Generator — Eve skill + structured JSON
 *
 * Loads agent/skills/generate-puzzle-blog.md so nightly posts stay
 * consistent with the Eve agent system while using the shared AI Gateway.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  sections?: BlogPostSections;
  seoMetadata?: BlogPostSEOMetadata;
}

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

function loadEveBlogSkill(): string {
  try {
    return readFileSync(join(process.cwd(), "agent/skills/generate-puzzle-blog.md"), "utf8");
  } catch {
    return "";
  }
}

function puzzleTypeLabel(puzzleType: string): string {
  switch (puzzleType) {
    case "rebus":
      return "Rebus";
    case "logic-grid":
      return "Logic Grid";
    case "cryptic-crossword":
      return "Cryptic Crossword";
    case "number-sequence":
      return "Number Sequence";
    case "pattern-recognition":
      return "Pattern Recognition";
    case "caesar-cipher":
      return "Caesar Cipher";
    case "trivia":
      return "Trivia";
    default:
      return "Puzzle";
  }
}

function stripAnswerFromTitle(title: string, answer: string, fallback: string): string {
  if (!title.toLowerCase().includes(answer.toLowerCase())) {
    return title.length > 60 ? `${title.slice(0, 57)}...` : title;
  }
  return fallback;
}

/**
 * Generate a blog post for a specific puzzle (Eve blog skill + BLOG_CONFIG).
 */
export async function generateBlogPost(
  puzzle: PuzzleLike & {
    answer: string;
    difficulty: number | string;
    category?: string;
    explanation?: string;
    publishedAt?: Date | string;
    hints?: unknown[];
  }
): Promise<GeneratedBlogPost> {
  console.log(`[Blog Generator] Eve generating post for puzzle: ${puzzle.answer}`);

  const puzzleType = getPuzzleType(puzzle);
  const typeName = puzzleTypeLabel(puzzleType);
  const display = getPuzzleDisplay(puzzle, puzzleType);
  const difficulty =
    typeof puzzle.difficulty === "number" ? puzzle.difficulty : Number(puzzle.difficulty) || 5;

  const puzzleData = {
    puzzle: display,
    rebusPuzzle: display,
    puzzleType,
    answer: puzzle.answer,
    category: puzzle.category,
    difficulty,
    explanation: puzzle.explanation || "A visual word puzzle.",
    hints: puzzle.hints,
  };

  const skill = loadEveBlogSkill();
  const system = [
    BLOG_CONFIG.prompts.system,
    skill ? `\n\n## Eve skill: generate-puzzle-blog\n${skill}` : "",
    "",
    "You are Eve. Follow the skill output contract exactly. Return ONLY valid JSON.",
  ].join("\n");

  const publishedKey =
    puzzle.publishedAt != null
      ? new Date(puzzle.publishedAt).toISOString().slice(0, 10)
      : "yesterday";

  try {
    const response = await generateAIText({
      system,
      prompt: [
        BLOG_CONFIG.prompts.generatePost(puzzleData),
        "",
        `Puzzle live date (UTC): ${publishedKey}`,
        "Write the archive post for that day — consistent series voice, lightly unique.",
      ].join("\n"),
      temperature: 0.65,
      modelType: "smart",
    });

    const responseText = response.text;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const rawJson = jsonMatch?.[1] ?? responseText;

    let parsedResponse: AIBlogResponse | null = null;
    try {
      parsedResponse = JSON.parse(rawJson.trim()) as AIBlogResponse;
      console.log("[Blog Generator] Parsed Eve JSON response");
    } catch {
      console.log("[Blog Generator] JSON parse failed — using text fallback");
    }

    const difficultyPhrase = difficulty >= 7 ? "Tricky" : difficulty >= 5 ? "Challenging" : "Fun";
    const fallbackTitle = `${difficultyPhrase} ${typeName} Puzzle`;

    let title: string;
    let content: string;
    let excerpt: string;
    let sections: BlogPostSections | undefined;
    let seoMetadata: BlogPostSEOMetadata | undefined;

    if (parsedResponse) {
      title = stripAnswerFromTitle(
        parsedResponse.title || fallbackTitle,
        puzzle.answer,
        fallbackTitle
      );
      content = parsedResponse.fullContent || responseText;
      excerpt =
        parsedResponse.metaDescription ||
        `A look back at the ${typeName.toLowerCase()} puzzle from ${publishedKey}.`;

      sections = {
        introduction: parsedResponse.sections?.introduction,
        puzzleAnalysis: parsedResponse.sections?.puzzleAnalysis,
        solvingStrategy: parsedResponse.sections?.solvingStrategy,
        puzzleHistory: parsedResponse.sections?.puzzleHistory,
        solution: parsedResponse.sections?.solution,
        callToAction: parsedResponse.sections?.callToAction,
        faq: parsedResponse.faq,
      };

      const wordCount = content.split(/\s+/).filter(Boolean).length;
      seoMetadata = {
        focusKeyword: parsedResponse.focusKeyword || `${typeName.toLowerCase()} puzzle`,
        secondaryKeywords: parsedResponse.secondaryKeywords || [],
        metaDescription: parsedResponse.metaDescription || excerpt,
        readingTime: Math.max(1, Math.ceil(wordCount / 200)),
        wordCount,
      };
    } else {
      content = responseText;
      title = fallbackTitle;
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (h1Match?.[1]) {
        title = stripAnswerFromTitle(
          h1Match[1].replace(/\*\*/g, "").trim(),
          puzzle.answer,
          fallbackTitle
        );
      }
      excerpt = `A look back at the ${typeName.toLowerCase()} puzzle from ${publishedKey}.`;
    }

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
