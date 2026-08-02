import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { BlogPostPuzzleOrigin, BlogPostSEOMetadata, BlogPostSections } from "@/db/models";

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const sectionsSchema = z.object({
  introduction: z.string().optional(),
  puzzleAnalysis: z.string().optional(),
  solvingStrategy: z.string().optional(),
  puzzleHistory: z.string().optional(),
  solution: z.string().optional(),
  callToAction: z.string().optional(),
  faq: z.array(faqSchema).optional(),
});

const seoMetadataSchema = z.object({
  focusKeyword: z.string().min(1),
  secondaryKeywords: z.array(z.string()),
  metaDescription: z.string().min(1),
  readingTime: z.number().int().positive(),
  wordCount: z.number().int().positive(),
});

export const repositoryBlogPostFileSchema = z.object({
  version: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(10).max(100),
  excerpt: z.string().min(20).max(300),
  content: z.string().min(200),
  publishedAt: z.string().datetime({ offset: true }),
  puzzle: z.object({
    id: z.string().min(1),
    display: z.string().min(1),
    type: z.string().min(1),
    answer: z.string().min(1),
    explanation: z.string().min(1),
    difficulty: z.union([z.number(), z.string()]).optional(),
    category: z.string().optional(),
  }),
  sections: sectionsSchema.optional(),
  seoMetadata: seoMetadataSchema.optional(),
  puzzleOrigin: z
    .object({
      type: z.enum(["classic", "ai-generated", "user-submitted", "themed"]),
      inspiration: z.string().optional(),
      history: z.string().optional(),
      culturalContext: z.string().optional(),
      creatorNotes: z.string().optional(),
    })
    .optional(),
});

export type RepositoryBlogPostFile = z.infer<typeof repositoryBlogPostFileSchema>;

export interface RepositoryBlogPost {
  slug: string;
  date: string;
  title: string;
  puzzle: string;
  puzzleType: string;
  answer: string;
  explanation: string;
  content: string;
  excerpt: string;
  publishedAt: Date;
  metadata: {
    topic?: string;
    keyword: string;
    category?: string;
    seoMetadata?: {
      keywords: string[];
      description: string;
      ogTitle: string;
      ogDescription: string;
    };
  };
  sections?: BlogPostSections;
  seoMetadata?: BlogPostSEOMetadata;
  puzzleOrigin?: BlogPostPuzzleOrigin;
}

export function getRepositoryBlogDirectory(): string {
  return join(process.cwd(), "content", "blog-posts");
}

function toBlogPost(file: RepositoryBlogPostFile): RepositoryBlogPost {
  const publishedAt = new Date(file.publishedAt);
  const seoMetadata = file.seoMetadata as BlogPostSEOMetadata | undefined;

  return {
    slug: file.slug,
    date: publishedAt.toISOString().slice(0, 10),
    title: file.title,
    puzzle: file.puzzle.display,
    puzzleType: file.puzzle.type,
    answer: file.puzzle.answer,
    explanation: file.puzzle.explanation,
    content: file.content,
    excerpt: file.excerpt,
    publishedAt,
    sections: file.sections as BlogPostSections | undefined,
    seoMetadata,
    puzzleOrigin: file.puzzleOrigin as BlogPostPuzzleOrigin | undefined,
    metadata: {
      topic: String(file.puzzle.difficulty ?? "general"),
      keyword: file.puzzle.answer.replace(/\s+/g, ""),
      category: file.puzzle.category,
      seoMetadata: seoMetadata
        ? {
            keywords: [seoMetadata.focusKeyword, ...seoMetadata.secondaryKeywords],
            description: seoMetadata.metaDescription,
            ogTitle: file.title,
            ogDescription: seoMetadata.metaDescription,
          }
        : undefined,
    },
  };
}

export function loadRepositoryBlogPosts(
  directory = getRepositoryBlogDirectory()
): RepositoryBlogPost[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const path = join(directory, name);
      let value: unknown;

      try {
        value = JSON.parse(readFileSync(path, "utf8"));
      } catch (error) {
        throw new Error(
          `Invalid repository blog JSON in ${name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      const parsed = repositoryBlogPostFileSchema.safeParse(value);
      if (!parsed.success) {
        throw new Error(`Invalid repository blog post ${name}: ${parsed.error.message}`);
      }
      if (`${parsed.data.slug}.json` !== name) {
        throw new Error(`Repository blog filename must match its slug: ${parsed.data.slug}.json`);
      }
      return toBlogPost(parsed.data);
    })
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
