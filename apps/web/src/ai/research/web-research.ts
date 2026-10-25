/**
 * Web research engine — search, rank, synthesize, corroborate.
 *
 *  1. Search: a small tool loop drives AI Gateway's provider-executed web
 *     search, batching queries and following up on gaps or conflicts.
 *  2. Rank: the host dedupes and trust-ranks every page that was really
 *     retrieved (dictionaries/encyclopedias first, forums and answer farms last).
 *  3. Synthesize: a structured pass may only make claims that cite those
 *     numbered sources.
 *  4. Corroborate: the host drops invented citations and downgrades claims
 *     whose figures or wording are not in the cited text.
 *
 * Research is advisory: any failure returns a `failed` dossier so callers can
 * continue without it. Only hard budget errors propagate.
 *
 * The AI SDK and gateway client load lazily so deterministic callers (and
 * their Jest suites) never pull the ESM `ai` package graph.
 */

import { z } from "zod";
import { AI_CONFIG } from "../config";
import { isHardAIBudgetError, parseAIError } from "../errors";
import { corroborateClaims } from "./corroboration";
import { collectSearchHits } from "./search-results";
import { rankResearchSources } from "./source-quality";
import type { ResearchDossier, ResearchSource } from "./types";

interface WebResearchRequest<TAssessment> {
  /** What is being researched, e.g. the answer phrase. */
  subject: string;
  /** Cache namespace and audit label, e.g. `answer-phrase`. */
  kind: string;
  /** One-sentence research goal. */
  objective: string;
  /** Concrete questions the dossier must answer. */
  questions: readonly string[];
  /** Starting queries; the researcher may add follow-ups. */
  seedQueries: readonly string[];
  /** Allowed claim categories, e.g. meaning / origin / variant. */
  claimKinds: readonly [string, ...string[]];
  /** Structured judgement derived from the sources. */
  assessmentSchema: z.ZodType<TAssessment>;
  assessmentInstructions: string;
  operation: string;
}

const cache = new Map<string, { expires: number; value: Promise<ResearchDossier<unknown>> }>();

export function clearResearchCache(): void {
  cache.clear();
}

function cacheKey(kind: string, subject: string): string {
  return `${kind}:${subject.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

function emptyDossier<T>(
  request: WebResearchRequest<T>,
  status: "skipped" | "failed",
  reason: string,
  started: number,
  extra: Partial<ResearchDossier<T>> = {}
): ResearchDossier<T> {
  return {
    subject: request.subject,
    kind: request.kind,
    status,
    reason,
    queries: [],
    sources: [],
    claims: [],
    summary: "",
    gaps: [],
    droppedCitations: 0,
    researchedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    searchProvider: AI_CONFIG.research.provider,
    ...extra,
  };
}

type GatewayClient = typeof import("../client");

function searchTool(client: GatewayClient) {
  const tools = client.getAiGateway().tools;
  const { provider, maxResultsPerSearch } = AI_CONFIG.research;
  if (provider === "exa") {
    return tools.exaSearch({
      numResults: maxResultsPerSearch,
      contents: { highlights: { maxCharacters: 900 } },
    });
  }
  if (provider === "parallel") {
    return tools.parallelSearch({
      maxResults: maxResultsPerSearch,
      excerpts: { maxCharsPerResult: 900 },
    });
  }
  return tools.perplexitySearch({
    maxResults: maxResultsPerSearch,
    maxTokensPerPage: 512,
    searchLanguageFilter: ["en"],
  });
}

const RESEARCHER_SYSTEM = `You are Rebuzzle's research librarian. You gather evidence; you do not write copy.
- Use the web_search tool. Batch several precise queries into one call (up to 5) instead of many single calls.
- Prefer authoritative references: major dictionaries, etymology references, encyclopedias, phrase-origin references, established publishers.
- Ignore puzzle-answer sites, forums, and social posts as evidence.
- After the first search, run one follow-up search only to resolve a conflict or fill a gap that matters for the questions.
- Finish with 3-6 terse bullet notes on what the evidence shows and what is still uncertain.`;

async function gatherSources<T>(
  request: WebResearchRequest<T>,
  client: GatewayClient
): Promise<{ sources: ResearchSource[]; queries: string[]; errors: string[]; modelUsed?: string }> {
  const { generateText, stepCountIs } = await import("ai");
  const { enforceQuota } = await import("../quota-manager");
  const models = client.getGatewayModelChain("smart").slice(0, 2);
  let lastError: unknown;

  for (const modelId of models) {
    try {
      await enforceQuota();
      const result = await generateText({
        model: client.getAiGateway()(modelId),
        system: RESEARCHER_SYSTEM,
        prompt: [
          `Research subject: "${request.subject}"`,
          `Objective: ${request.objective}`,
          "Questions to answer:",
          ...request.questions.map((q, i) => `${i + 1}. ${q}`),
          "",
          `Suggested first queries: ${request.seedQueries.map((q) => `"${q}"`).join(", ")}`,
        ].join("\n"),
        tools: { web_search: searchTool(client) },
        stopWhen: stepCountIs(AI_CONFIG.research.maxSearchSteps),
        // Always search at least once; later steps may stop when evidence is enough.
        prepareStep: ({ stepNumber }) => (stepNumber === 0 ? { toolChoice: "required" } : {}),
        temperature: AI_CONFIG.generation.temperature.factual,
        maxRetries: 0,
        providerOptions: {
          gateway: { tags: ["rebuzzle", `operation:${request.operation}-search`] },
        },
        abortSignal: AbortSignal.timeout(AI_CONFIG.research.timeoutMs),
      });

      const { hits, queries, errors } = collectSearchHits(result.steps);
      return {
        sources: rankResearchSources(hits, { limit: AI_CONFIG.research.maxSources }),
        queries,
        errors,
        modelUsed: modelId,
      };
    } catch (error) {
      if (isHardAIBudgetError(error)) throw parseAIError(error);
      lastError = error;
    }
  }
  throw lastError ?? new Error("research search failed");
}

function formatSourcesForPrompt(sources: readonly ResearchSource[]): string {
  return sources
    .map(
      (source) =>
        `[${source.id}] (${source.tier} · ${source.domain}) ${source.title}\n${source.snippet || "(no excerpt)"}`
    )
    .join("\n\n");
}

/**
 * Run a complete research pass. Results (including failures for a short
 * window) are cached per subject so a tournament, its critique, and the
 * next-day blog share one search.
 */
export function runWebResearch<TAssessment>(
  request: WebResearchRequest<TAssessment>
): Promise<ResearchDossier<TAssessment>> {
  const started = Date.now();
  if (!AI_CONFIG.research.enabled) {
    return Promise.resolve(emptyDossier(request, "skipped", "research disabled", started));
  }
  if (!request.subject.trim()) {
    return Promise.resolve(emptyDossier(request, "skipped", "empty subject", started));
  }

  const key = cacheKey(request.kind, request.subject);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value as Promise<ResearchDossier<TAssessment>>;
  }

  const value = executeResearch(request, started);
  cache.set(key, { expires: Date.now() + AI_CONFIG.research.cacheTtlMs, value });
  value
    .then((dossier) => {
      // Retry failed research after a short cool-down rather than a week.
      if (dossier.status !== "researched") {
        cache.set(key, { expires: Date.now() + 10 * 60 * 1000, value });
      }
    })
    .catch(() => cache.delete(key));
  return value;
}

async function executeResearch<TAssessment>(
  request: WebResearchRequest<TAssessment>,
  started: number
): Promise<ResearchDossier<TAssessment>> {
  try {
    const client = await import("../client");
    client.ensureGatewayKey();
    client.assertGatewayAuthConfigured();

    const gathered = await gatherSources(request, client);
    if (!gathered.sources.length) {
      return emptyDossier(
        request,
        "failed",
        gathered.errors[0] ? `search error: ${gathered.errors[0]}` : "no sources retrieved",
        started,
        { queries: gathered.queries, modelUsed: gathered.modelUsed }
      );
    }

    const knownIds = new Set(gathered.sources.map((s) => s.id));
    const synthesis = await client.generateAIObject({
      operation: `${request.operation}-synthesis`,
      modelType: "smart",
      temperature: AI_CONFIG.generation.temperature.factual,
      schema: z.object({
        summary: z.string().min(1).max(900),
        claims: z
          .array(
            z.object({
              statement: z.string().min(4).max(400),
              kind: z.enum(request.claimKinds),
              sourceIds: z.array(z.string()).min(1).max(4),
            })
          )
          .max(14),
        gaps: z.array(z.string()).max(6),
        assessment: request.assessmentSchema,
      }),
      system: `You turn retrieved web sources into an evidence dossier.
Rules:
- Every claim must be stated by the text of the sources it cites. Cite sources by id only (${[...knownIds].slice(0, 3).join(", ")}, …).
- Never use outside knowledge for a claim, and never cite an id that is not listed.
- Copy years, dates, and names exactly as the cited text gives them; omit them when the text does not.
- When sources disagree, keep both claims and add the disagreement to gaps.
- Put anything you could not confirm in gaps instead of claims.`,
      prompt: [
        `Subject: "${request.subject}"`,
        `Objective: ${request.objective}`,
        "Questions:",
        ...request.questions.map((q, i) => `${i + 1}. ${q}`),
        "",
        "Assessment instructions:",
        request.assessmentInstructions,
        "",
        "Retrieved sources:",
        formatSourcesForPrompt(gathered.sources),
      ].join("\n"),
    });

    const { claims, droppedCitations } = corroborateClaims(synthesis.claims, gathered.sources);

    return {
      subject: request.subject,
      kind: request.kind,
      status: "researched",
      queries: gathered.queries,
      sources: gathered.sources,
      claims,
      summary: synthesis.summary,
      gaps: synthesis.gaps,
      assessment: synthesis.assessment,
      droppedCitations,
      researchedAt: new Date().toISOString(),
      modelUsed: gathered.modelUsed,
      searchProvider: AI_CONFIG.research.provider,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    if (isHardAIBudgetError(error)) throw parseAIError(error);
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[Research] failed", { kind: request.kind, subject: request.subject, message });
    return emptyDossier(request, "failed", message.slice(0, 300), started);
  }
}
