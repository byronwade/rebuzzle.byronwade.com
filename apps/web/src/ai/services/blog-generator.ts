/**
 * Blog Post Generator — Eve skill + structured JSON
 *
 * Loads agent/skills/generate-puzzle-blog.md so nightly posts stay
 * consistent with the Eve agent system while using the shared AI Gateway.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { generateAIObject } from "@/ai/client";
import { BLOG_CONFIG } from "@/ai/config/blog";
import type { BlogPostSEOMetadata, BlogPostSections } from "@/db/models";
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

const aiBlogResponseSchema = z.object({
  title: z.string().min(1),
  metaDescription: z.string().min(20),
  focusKeyword: z.string().min(1),
  secondaryKeywords: z.array(z.string().min(1)),
  sections: z.object({
    introduction: z.string().min(1),
    puzzleAnalysis: z.string().min(1),
    solvingStrategy: z.string().min(1),
    puzzleHistory: z.string().min(1),
    solution: z.string().min(1),
    callToAction: z.string().min(1),
  }),
  faq: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .min(3)
    .max(5),
  fullContent: z.string().min(200),
});

type AIBlogResponse = z.infer<typeof aiBlogResponseSchema>;

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

function answerPattern(answer: string): RegExp {
  const escaped = answer
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "iu");
}

function containsAnswer(value: string | undefined, answer: string): boolean {
  return Boolean(value && answerPattern(answer).test(value));
}

function contentOutsideSolution(content: string): {
  outside: string;
  solution: string;
} | null {
  const heading = /^##\s+(?:the\s+)?solution\s*$/im.exec(content);
  if (!heading || heading.index == null) return null;

  const solutionStart = heading.index + heading[0].length;
  const afterHeading = content.slice(solutionStart);
  const nextHeading = /^##\s+/m.exec(afterHeading);
  const solutionEnd =
    nextHeading?.index == null ? content.length : solutionStart + nextHeading.index;

  return {
    outside: `${content.slice(0, heading.index)}\n${content.slice(solutionEnd)}`,
    solution: content.slice(solutionStart, solutionEnd),
  };
}

/** Deterministic publication gate for spoiler safety and obvious copy defects. */
export function getBlogEditorialIssues(post: GeneratedBlogPost, answer: string): string[] {
  const issues: string[] = [];
  const spoilerFields: Array<[string, string | undefined]> = [
    ["title", post.title],
    ["excerpt", post.excerpt],
    ["introduction", post.sections?.introduction],
    ["puzzle analysis", post.sections?.puzzleAnalysis],
    ["solving strategy", post.sections?.solvingStrategy],
    ["puzzle history", post.sections?.puzzleHistory],
    ["call to action", post.sections?.callToAction],
    ["SEO meta description", post.seoMetadata?.metaDescription],
  ];

  for (const [label, value] of spoilerFields) {
    if (containsAnswer(value, answer)) issues.push(`${label} reveals the answer`);
  }

  for (const [index, item] of (post.sections?.faq ?? []).entries()) {
    if (containsAnswer(item.question, answer) || containsAnswer(item.answer, answer)) {
      issues.push(`FAQ ${index + 1} reveals the answer`);
    }
  }

  const contentParts = contentOutsideSolution(post.content);
  if (!contentParts) {
    issues.push("full content is missing a dedicated Solution heading");
  } else {
    if (containsAnswer(contentParts.outside, answer)) {
      issues.push("full content reveals the answer outside the Solution section");
    }
    if (!containsAnswer(contentParts.solution, answer)) {
      issues.push("Solution section does not contain the answer");
    }
  }

  if (/\bpuzzle\s+puzzle\b/iu.test(post.content)) {
    issues.push('full content contains the repeated phrase "puzzle puzzle"');
  }

  return [...new Set(issues)];
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
    let retryFeedback = "";
    let lastIssues: string[] = [];

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const parsedResponse: AIBlogResponse = await generateAIObject({
        system,
        prompt: [
          BLOG_CONFIG.prompts.generatePost(puzzleData),
          "",
          `Puzzle live date (UTC): ${publishedKey}`,
          "Write the archive post for that day — consistent series voice, lightly unique.",
          retryFeedback,
        ]
          .filter(Boolean)
          .join("\n"),
        temperature: attempt === 1 ? 0.65 : 0.35,
        modelType: "smart",
        schema: aiBlogResponseSchema,
      });
      console.log(`[Blog Generator] Received structured Eve response (attempt ${attempt})`);

      const difficultyPhrase = difficulty >= 7 ? "Tricky" : difficulty >= 5 ? "Challenging" : "Fun";
      const fallbackTitle = `${difficultyPhrase} ${typeName} Puzzle`;
      const title = stripAnswerFromTitle(
        parsedResponse.title || fallbackTitle,
        puzzle.answer,
        fallbackTitle
      );
      const content = parsedResponse.fullContent;
      const excerpt =
        parsedResponse.metaDescription ||
        `A look back at the ${typeName.toLowerCase()} puzzle from ${publishedKey}.`;
      const sections: BlogPostSections = {
        introduction: parsedResponse.sections?.introduction,
        puzzleAnalysis: parsedResponse.sections?.puzzleAnalysis,
        solvingStrategy: parsedResponse.sections?.solvingStrategy,
        puzzleHistory: parsedResponse.sections?.puzzleHistory,
        solution: parsedResponse.sections?.solution,
        callToAction: parsedResponse.sections?.callToAction,
        faq: parsedResponse.faq,
      };
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const seoMetadata: BlogPostSEOMetadata = {
        focusKeyword: parsedResponse.focusKeyword || `${typeName.toLowerCase()} puzzle`,
        secondaryKeywords: parsedResponse.secondaryKeywords || [],
        metaDescription: parsedResponse.metaDescription || excerpt,
        readingTime: Math.max(1, Math.ceil(wordCount / 200)),
        wordCount,
      };
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      const generated = { title, content, slug, excerpt, sections, seoMetadata };

      lastIssues = getBlogEditorialIssues(generated, puzzle.answer);
      if (lastIssues.length === 0) return generated;

      console.warn(`[Blog Generator] Editorial validation failed (attempt ${attempt})`, {
        issues: lastIssues,
      });
      retryFeedback = [
        "",
        `Your previous draft failed validation: ${lastIssues.join("; ")}.`,
        `Rewrite the entire JSON. The exact answer "${puzzle.answer}" may appear ONLY under the ## The Solution heading and in sections.solution.`,
        "Do not put the answer in metadata, excerpt, FAQ, CTA, or any other section. Remove repetitive wording.",
      ].join("\n");
    }

    throw new Error(`Generated blog post failed editorial validation: ${lastIssues.join("; ")}`);
  } catch (error) {
    console.error("[Blog Generator] Failed to generate blog post:", error);
    throw error;
  }
}
