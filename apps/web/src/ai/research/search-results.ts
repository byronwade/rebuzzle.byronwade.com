/**
 * Normalize provider-executed web search outputs (Perplexity, Exa, Parallel)
 * into plain hits. Outputs are treated as untrusted JSON: anything that does
 * not look like `{ url, title?, snippet? }` is ignored.
 */

import type { RawSearchHit } from "./source-quality";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function joinText(value: unknown): string | undefined {
  if (typeof value === "string") return asString(value);
  if (Array.isArray(value)) {
    const parts = value.filter((part): part is string => typeof part === "string" && !!part.trim());
    return parts.length ? parts.join(" … ") : undefined;
  }
  return undefined;
}

function toHit(value: unknown): RawSearchHit | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const url = asString(record.url);
  if (!url) return null;
  const snippet =
    joinText(record.snippet) ??
    joinText(record.excerpts) ??
    joinText(record.highlights) ??
    joinText(record.summary) ??
    joinText(record.text) ??
    joinText(record.content);
  return {
    url,
    title: asString(record.title),
    snippet,
    publishedAt: asString(record.date) ?? asString(record.publishedDate),
  };
}

/** Extract hits from one tool output of any supported search provider. */
export function hitsFromSearchOutput(output: unknown): RawSearchHit[] {
  if (!output || typeof output !== "object") return [];
  const record = output as Record<string, unknown>;
  const results = Array.isArray(record.results) ? record.results : [];
  return results.map(toHit).filter((hit): hit is RawSearchHit => hit !== null);
}

/** Search errors are returned as tool output, not thrown. */
export function searchOutputError(output: unknown): string | undefined {
  if (!output || typeof output !== "object") return undefined;
  const record = output as Record<string, unknown>;
  if (Array.isArray(record.results)) return undefined;
  return asString(record.message) ?? asString(record.error);
}

interface StepLike {
  toolResults?: ReadonlyArray<{ toolName?: string; output?: unknown; input?: unknown }>;
  sources?: ReadonlyArray<{ sourceType?: string; url?: string; title?: string }>;
}

/** Collect every hit and query from a multi-step search run. */
export function collectSearchHits(steps: readonly StepLike[]): {
  hits: RawSearchHit[];
  queries: string[];
  errors: string[];
} {
  const hits: RawSearchHit[] = [];
  const queries: string[] = [];
  const errors: string[] = [];

  for (const step of steps) {
    for (const result of step.toolResults ?? []) {
      if (result.toolName !== "web_search") continue;
      const input = result.input as { query?: unknown; objective?: unknown } | undefined;
      const query = input?.query ?? input?.objective;
      if (typeof query === "string") queries.push(query);
      else if (Array.isArray(query)) {
        queries.push(...query.filter((q): q is string => typeof q === "string"));
      }
      const error = searchOutputError(result.output);
      if (error) errors.push(error);
      hits.push(...hitsFromSearchOutput(result.output));
    }
    for (const source of step.sources ?? []) {
      if (source.sourceType === "url" && source.url) {
        hits.push({ url: source.url, title: source.title });
      }
    }
  }

  return { hits, queries: Array.from(new Set(queries)), errors };
}
