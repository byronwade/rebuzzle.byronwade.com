/**
 * Cultural pulse — people-scored signals for Eve invent (last30days-inspired).
 *
 * Primary: optional last30days CLI (Reddit/HN/GitHub/Polymarket when available).
 * Fallback: free builtin fetches (HN Algolia, Reddit RSS, Polymarket) so production
 * never depends on a local Python skill install.
 */

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { AI_CONFIG } from "../../config";

export type CulturalSignal = {
  title: string;
  source: string;
  score: number;
  url?: string;
  summary?: string;
};

export type CulturalPulse = {
  query: string;
  windowDays: number;
  engine: "last30days" | "builtin" | "hybrid";
  sourcesUsed: string[];
  signals: CulturalSignal[];
  /** Short phrase / idiom seeds Eve can invent around (not copy) */
  phraseSeeds: string[];
  promptBlock: string;
};

type CacheEntry = { at: number; pulse: CulturalPulse };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 60 * 1000;

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

function scoreFromEngagement(engagement: unknown): number {
  if (!engagement || typeof engagement !== "object") return 1;
  const e = engagement as Record<string, unknown>;
  const score = typeof e.score === "number" ? e.score : 0;
  const comments = typeof e.num_comments === "number" ? e.num_comments : 0;
  const points = typeof e.points === "number" ? e.points : 0;
  return Math.max(score, points, 0) + Math.min(comments, 200) * 0.25;
}

/**
 * Heuristic: pull rebus-worthy short phrases from titles (not full headlines).
 */
export function extractPhraseSeeds(signals: CulturalSignal[], limit = 8): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const idiomLike =
    /\b(out of|over the|under the|on the|in the|between|before|after|piece of|spill the|break the|hit the|catch|throw|pull|cut|keep|make|take)\b/i;

  for (const signal of signals) {
    const title = normalizeTitle(signal.title);
    // Quoted phrases often are the meme/catchphrase
    for (const m of title.matchAll(/[“"']([^”"']{3,40})[”"']/g)) {
      const phrase = m[1]?.trim().toLowerCase();
      if (!phrase || seen.has(phrase)) continue;
      seen.add(phrase);
      out.push(phrase);
      if (out.length >= limit) return out;
    }

    // Idiom-shaped fragments
    if (idiomLike.test(title)) {
      const cleaned = title
        .replace(/^(TIL|ELI5|Ask HN:|Show HN:)\s*/i, "")
        .replace(/[?!|].*$/, "")
        .trim()
        .toLowerCase();
      if (cleaned.length >= 8 && cleaned.length <= 48 && !seen.has(cleaned)) {
        seen.add(cleaned);
        out.push(cleaned);
        if (out.length >= limit) return out;
      }
    }
  }

  // Fallback: top short titles as inspiration labels (Eve invents cousins)
  for (const signal of signals.slice(0, 12)) {
    const t = normalizeTitle(signal.title).toLowerCase();
    if (t.length < 6 || t.length > 42) continue;
    if (seen.has(t)) continue;
    if (/\b(http|www\.|reddit|github)\b/i.test(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= limit) break;
  }

  return out;
}

export function formatCulturalPulseForPrompt(pulse: CulturalPulse): string {
  if (!pulse.signals.length) {
    return "Cultural pulse: no fresh people-signals this window — invent from timeless idioms, not news headlines.";
  }
  const lines = [
    `Cultural pulse (last ${pulse.windowDays}d, engine=${pulse.engine}, sources=${pulse.sourcesUsed.join("+") || "none"}):`,
    "Use as INSPIRATION for fresh rebus answers/mechanisms — do not copy headlines or niche fandom slang.",
    ...pulse.signals.slice(0, 8).map((s) => {
      const eng = s.score ? ` [eng≈${Math.round(s.score)}]` : "";
      return `  - (${s.source}${eng}) ${s.title.slice(0, 120)}`;
    }),
    pulse.phraseSeeds.length
      ? `Phrase seeds to invent cousins of: ${pulse.phraseSeeds.slice(0, 6).join(" · ")}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolveLast30DaysScript(): Promise<string | null> {
  const envPath = process.env.EVE_LAST30DAYS_SCRIPT?.trim();
  if (envPath && (await fileExists(envPath))) return envPath;

  const skillDir = process.env.EVE_LAST30DAYS_SKILL_DIR?.trim();
  if (skillDir) {
    const candidate = join(skillDir, "scripts", "last30days.py");
    if (await fileExists(candidate)) return candidate;
  }

  // Common local installs (Cursor / agents skills)
  const guesses = [
    join(process.cwd(), ".agents", "skills", "last30days", "scripts", "last30days.py"),
    join(process.cwd(), "skills", "last30days", "scripts", "last30days.py"),
    join(
      process.env.HOME || "",
      ".agents",
      "skills",
      "last30days",
      "scripts",
      "last30days.py"
    ),
  ];
  for (const g of guesses) {
    if (g && (await fileExists(g))) return g;
  }
  return null;
}

async function runLast30DaysCli(query: string): Promise<CulturalSignal[] | null> {
  if (!AI_CONFIG.puzzleAgent.culturalPulse.last30Days) {
    return null;
  }
  const script = await resolveLast30DaysScript();
  if (!script) return null;

  const python = process.env.LAST30DAYS_PYTHON || process.env.EVE_LAST30DAYS_PYTHON || "python3";
  const timeoutMs = Math.max(
    8_000,
    Math.min(90_000, Number(process.env.EVE_LAST30DAYS_TIMEOUT_MS || 45_000) || 45_000)
  );

  return new Promise((resolve) => {
    const child = spawn(
      python,
      [script, query, "--emit=json", "--json-profile=agent", "--quick"],
      {
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let settled = false;
    const finish = (value: CulturalSignal[] | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(null);
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.on("error", () => {
      clearTimeout(timer);
      finish(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        finish(null);
        return;
      }
      try {
        // Engine may print narration before JSON — take last JSON object
        const start = stdout.lastIndexOf("{");
        if (start < 0) {
          finish(null);
          return;
        }
        const raw = JSON.parse(stdout.slice(start)) as {
          results?: Array<Record<string, unknown>>;
          window_days?: number;
        };
        const results = Array.isArray(raw.results) ? raw.results : [];
        const signals = results
          .map((row) => {
            const title = typeof row.title === "string" ? normalizeTitle(row.title) : "";
            if (!title) return null;
            return {
              title,
              source: typeof row.source === "string" ? row.source : "last30days",
              score: scoreFromEngagement(row.engagement),
              url: typeof row.url === "string" ? row.url : undefined,
              summary: typeof row.summary === "string" ? row.summary.slice(0, 240) : undefined,
            } satisfies CulturalSignal;
          })
          .filter((s): s is CulturalSignal => Boolean(s));
        finish(signals);
      } catch {
        finish(null);
      }
    });
  });
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "RebuzzleEve/1.0 (+https://rebuzzle.byronwade.com)",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/rss+xml,application/atom+xml,text/xml,*/*",
        "User-Agent": "RebuzzleEve/1.0 (+https://rebuzzle.byronwade.com)",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseAtomTitles(xml: string, source: string): CulturalSignal[] {
  const titles = [...xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi)].map(
    (m) =>
      normalizeTitle(
        (m[1] || "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
      )
  );
  // First title is often the feed name
  return titles.slice(1, 12).map((title, i) => ({
    title,
    source,
    score: 40 - i,
  }));
}

async function builtinPulse(query: string): Promise<{
  signals: CulturalSignal[];
  sourcesUsed: string[];
}> {
  const sourcesUsed: string[] = [];
  const signals: CulturalSignal[] = [];

  const q = encodeURIComponent(query.slice(0, 80));
  const [hnFront, hnSearch, poly, rebusRss, idiomsRss] = await Promise.all([
    fetchJson("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=8"),
    fetchJson(
      `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=8`
    ),
    fetchJson(
      "https://gamma-api.polymarket.com/events?limit=8&active=true&closed=false"
    ),
    fetchText("https://www.reddit.com/r/rebus/top.rss?t=month"),
    fetchText("https://www.reddit.com/r/idioms/hot.rss"),
  ]);

  const pushHn = (data: unknown, source: string) => {
    if (!data || typeof data !== "object") return;
    const hits = (data as { hits?: Array<Record<string, unknown>> }).hits;
    if (!Array.isArray(hits)) return;
    sourcesUsed.push(source);
    for (const hit of hits) {
      const title = typeof hit.title === "string" ? normalizeTitle(hit.title) : "";
      if (!title) continue;
      signals.push({
        title,
        source,
        score: typeof hit.points === "number" ? hit.points : 1,
        url: typeof hit.url === "string" ? hit.url : undefined,
      });
    }
  };

  pushHn(hnFront, "hackernews");
  pushHn(hnSearch, "hackernews-search");

  if (Array.isArray(poly)) {
    sourcesUsed.push("polymarket");
    for (const event of poly as Array<Record<string, unknown>>) {
      const title = typeof event.title === "string" ? normalizeTitle(event.title) : "";
      if (!title) continue;
      signals.push({
        title,
        source: "polymarket",
        score: 30,
        url:
          typeof event.slug === "string"
            ? `https://polymarket.com/event/${event.slug}`
            : undefined,
      });
    }
  }

  if (rebusRss) {
    sourcesUsed.push("reddit-rebus");
    signals.push(...parseAtomTitles(rebusRss, "reddit-rebus"));
  }
  if (idiomsRss) {
    sourcesUsed.push("reddit-idioms");
    signals.push(...parseAtomTitles(idiomsRss, "reddit-idioms"));
  }

  signals.sort((a, b) => b.score - a.score);
  return { signals: signals.slice(0, 20), sourcesUsed: [...new Set(sourcesUsed)] };
}

function buildPulse(input: {
  query: string;
  last30?: CulturalSignal[] | null;
  builtin: { signals: CulturalSignal[]; sourcesUsed: string[] };
}): CulturalPulse {
  const merged = new Map<string, CulturalSignal>();
  for (const s of [...(input.last30 ?? []), ...input.builtin.signals]) {
    const key = s.title.toLowerCase();
    const prev = merged.get(key);
    if (!prev || s.score > prev.score) merged.set(key, s);
  }
  const signals = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 16);
  const engine =
    input.last30?.length && input.builtin.signals.length
      ? ("hybrid" as const)
      : input.last30?.length
        ? ("last30days" as const)
        : ("builtin" as const);
  const sourcesUsed = [
    ...(input.last30?.length ? ["last30days"] : []),
    ...input.builtin.sourcesUsed,
  ];
  const phraseSeeds = extractPhraseSeeds(signals);
  const pulse: CulturalPulse = {
    query: input.query,
    windowDays: 30,
    engine,
    sourcesUsed: [...new Set(sourcesUsed)],
    signals,
    phraseSeeds,
    promptBlock: "",
  };
  pulse.promptBlock = formatCulturalPulseForPrompt(pulse);
  return pulse;
}

/**
 * Research what people are engaging with — for Eve invent inspiration.
 */
export async function researchCulturalPulse(input?: {
  theme?: string;
  category?: string;
  query?: string;
}): Promise<CulturalPulse> {
  const query =
    input?.query?.trim() ||
    [
      input?.theme?.trim(),
      input?.category?.trim(),
      "idioms catchphrases everyday phrases slang memes",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 120);

  if (!AI_CONFIG.puzzleAgent.culturalPulse.enabled) {
    return {
      query,
      windowDays: 30,
      engine: "builtin",
      sourcesUsed: [],
      signals: [],
      phraseSeeds: [],
      promptBlock:
        "Cultural pulse disabled — invent timeless idioms, not news headlines.",
    };
  }

  const cacheKey = query.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.pulse;

  const [last30, builtin] = await Promise.all([
    runLast30DaysCli(query),
    builtinPulse(query),
  ]);

  const pulse = buildPulse({ query, last30, builtin });
  cache.set(cacheKey, { at: Date.now(), pulse });
  return pulse;
}

export function resetCulturalPulseCache(): void {
  cache.clear();
}
