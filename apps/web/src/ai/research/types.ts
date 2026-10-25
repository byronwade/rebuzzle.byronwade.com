/**
 * Shared research types.
 *
 * Kept free of AI SDK imports so deterministic gates (source trust,
 * citation corroboration, blog grounding) can be unit tested directly.
 */

import { z } from "zod";

/** How much a source's domain is trusted for factual claims. */
export type SourceTier = "reference" | "editorial" | "general" | "low";

export interface ResearchSource {
  /** Stable citation id handed to the synthesis model (S1, S2, …). */
  id: string;
  url: string;
  title: string;
  snippet: string;
  /** Registrable domain (e.g. `merriam-webster.com`). */
  domain: string;
  tier: SourceTier;
  publishedAt?: string;
}

export type ClaimSupport = "verified" | "single-source" | "unsupported";

export interface ResearchClaim {
  statement: string;
  kind: string;
  /** Only ids that were actually retrieved by a search call survive. */
  sourceIds: string[];
  support: ClaimSupport;
  /** 0–1 confidence derived from domain diversity and source tier. */
  confidence: number;
  /** Why a claim was downgraded, when it was. */
  notes: string[];
}

export type ResearchStatus = "researched" | "skipped" | "failed";

export interface ResearchDossier<TAssessment = unknown> {
  subject: string;
  kind: string;
  status: ResearchStatus;
  reason?: string;
  queries: string[];
  sources: ResearchSource[];
  claims: ResearchClaim[];
  summary: string;
  gaps: string[];
  assessment?: TAssessment;
  /** Citations the model invented that were never retrieved. */
  droppedCitations: number;
  researchedAt: string;
  modelUsed?: string;
  searchProvider?: string;
  durationMs: number;
}

export const PhraseFamiliaritySchema = z.enum([
  "everyday",
  "common",
  "niche",
  "obscure",
  "unknown",
]);
export type PhraseFamiliarity = z.infer<typeof PhraseFamiliaritySchema>;

/**
 * Compact, persisted research summary stored on puzzle metadata so the
 * next-day blog writer can reuse the same evidence instead of re-searching.
 */
export const StoredAnswerResearchSchema = z.object({
  version: z.literal(1),
  answer: z.string().min(1),
  status: z.enum(["researched", "skipped", "failed"]),
  verdict: z.enum(["use", "caution", "avoid"]),
  verdictReasons: z.array(z.string()).max(8),
  familiarity: PhraseFamiliaritySchema,
  meaning: z.string().optional(),
  variants: z.array(z.string()).max(8),
  facts: z
    .array(
      z.object({
        statement: z.string().min(1),
        kind: z.string().min(1),
        support: z.enum(["verified", "single-source"]),
        sourceIds: z.array(z.string()).max(6),
      })
    )
    .max(16),
  sources: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        title: z.string(),
        domain: z.string(),
        tier: z.enum(["reference", "editorial", "general", "low"]),
      })
    )
    .max(16),
  researchedAt: z.string(),
});
export type StoredAnswerResearch = z.infer<typeof StoredAnswerResearchSchema>;
