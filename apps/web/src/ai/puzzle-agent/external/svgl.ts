/**
 * SVGL API client — company / product logos for brand-aware rebus puzzles.
 *
 * Docs: https://api.svgl.app
 * - Cache catalog responses (rate limits)
 * - Do not rebuild SVGL as a product
 * - Prefer /svg/{file} which is more reliably reachable than search
 */

import { sanitizePictogramSvg } from "../visual/sanitize-svg";
import { INK_PICTOGRAM_PALETTE } from "../visual/style";
import { SVGL_BRAND_SEED, type SvglBrandEntry } from "./svgl-brands";

export type SvglLogoHit = {
  title: string;
  file: string;
  category: string;
  svg: string;
  source: "svgl";
  iconId: string;
};

type ThemeOptions = { dark: string; light: string };

type SvglApiEntry = {
  id?: number;
  title: string;
  category: string | string[];
  route: string | ThemeOptions;
  url?: string;
  wordmark?: string | ThemeOptions;
  brandUrl?: string;
};

type CacheBag = {
  fetchedAt: number;
  entries: SvglBrandEntry[];
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let catalogCache: CacheBag | null = null;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function routeToFile(route: string | ThemeOptions): string | null {
  const url = typeof route === "string" ? route : route.light || route.dark;
  if (!url) return null;
  const file = url.split("/").pop()?.split("?")[0];
  return file && file.endsWith(".svg") ? file : null;
}

function seedAsEntries(): SvglBrandEntry[] {
  return [...SVGL_BRAND_SEED];
}

async function fetchJsonCatalog(): Promise<SvglBrandEntry[] | null> {
  try {
    const res = await fetch("https://api.svgl.app", {
      headers: {
        Accept: "application/json",
        "User-Agent": "RebuzzlePuzzleAgent/1.0 (+https://rebuzzle.byronwade.com)",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.trimStart().startsWith("<!")) return null;
    const data = JSON.parse(text) as SvglApiEntry[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const entries: SvglBrandEntry[] = [];
    for (const item of data) {
      const file = routeToFile(item.route);
      if (!file || !item.title) continue;
      const category = Array.isArray(item.category)
        ? (item.category[0] ?? "Software")
        : item.category;
      entries.push({
        title: item.title,
        file,
        aliases: [normalize(item.title)],
        category,
      });
    }
    return entries.length ? entries : null;
  } catch {
    return null;
  }
}

/**
 * Cached brand catalog — live SVGL list when reachable, else curated seed.
 */
export async function getSvglCatalog(): Promise<SvglBrandEntry[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CACHE_TTL_MS) {
    return catalogCache.entries;
  }
  const live = await fetchJsonCatalog();
  const entries = live?.length ? live : seedAsEntries();
  catalogCache = { fetchedAt: Date.now(), entries };
  return entries;
}

/** Test helper */
export function resetSvglCache(): void {
  catalogCache = null;
}

export function matchBrandInCatalog(
  query: string,
  catalog: SvglBrandEntry[]
): SvglBrandEntry | null {
  const q = normalize(query);
  if (!q || q.length < 2) return null;

  // Exact title / alias wins (avoid "react" → Preact)
  for (const entry of catalog) {
    const title = normalize(entry.title);
    const names = [title, ...entry.aliases.map(normalize)];
    if (names.some((name) => name === q)) return entry;
  }

  let best: SvglBrandEntry | null = null;
  let bestScore = 0;

  for (const entry of catalog) {
    const title = normalize(entry.title);
    const names = [title, ...entry.aliases.map(normalize)];
    for (const name of names) {
      if (!name || name.length < 3) continue;
      // Require tight containment — whole token, not substring traps
      const nameTokens = name.split(" ");
      const qTokens = q.split(" ");
      const tokenHit =
        nameTokens.includes(q) || qTokens.includes(name) || name === q;
      if (!tokenHit) continue;
      const score = Math.min(name.length, q.length) / Math.max(name.length, q.length);
      if (score > bestScore) {
        best = entry;
        bestScore = score;
      }
    }
  }
  return bestScore >= 0.85 ? best : null;
}

async function fetchBrandSvg(file: string): Promise<string | null> {
  const urls = [
    `https://api.svgl.app/svg/${file}`,
    `https://svgl.app/library/${file}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "image/svg+xml,text/plain,*/*",
          "User-Agent": "RebuzzlePuzzleAgent/1.0 (+https://rebuzzle.byronwade.com)",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes("<svg")) continue;
      return text;
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Fit a brand SVG into the 64×64 rebus board while preserving brand colors
 * (recognition depends on mark + palette).
 */
export function fitBrandSvgToBoard(rawSvg: string): string | null {
  const cleaned = rawSvg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/xlink:href="(?!#)/gi, 'data-blocked="')
    .trim();

  const viewBoxMatch = cleaned.match(/viewBox=["']([^"']+)["']/i);
  const innerMatch = cleaned.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!innerMatch) return null;

  const viewBox = viewBoxMatch?.[1] ?? "0 0 64 64";
  const parts = viewBox.split(/[\s,]+/).map(Number);
  const vbW = parts[2] && parts[2] > 0 ? parts[2] : 64;
  const vbH = parts[3] && parts[3] > 0 ? parts[3] : 64;
  const pad = 6;
  const scale = Math.min((64 - pad * 2) / vbW, (64 - pad * 2) / vbH);
  const ox = (64 - vbW * scale) / 2 - (parts[0] || 0) * scale;
  const oy = (64 - vbH * scale) / 2 - (parts[1] || 0) * scale;

  const wrapped = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`,
    `<rect width="64" height="64" fill="${INK_PICTOGRAM_PALETTE.canvas}" opacity="0"/>`,
    `<g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${scale.toFixed(4)})">`,
    innerMatch[1],
    `</g>`,
    `</svg>`,
  ].join("");

  // Brand marks can be denser than ink pictograms — allow larger sanitized payloads
  const sanitized = sanitizePictogramSvg(wrapped, { maxBytes: 40_000 });
  if (sanitized) return sanitized;
  if (wrapped.length <= 40_000 && wrapped.includes("<svg")) return wrapped;
  return null;
}

/**
 * Look up a company/product logo for a rebus concept.
 */
export async function lookupSvglBrandLogo(
  concept: string
): Promise<SvglLogoHit | null> {
  const catalog = await getSvglCatalog();
  const match = matchBrandInCatalog(concept, catalog);
  if (!match) return null;

  const raw = await fetchBrandSvg(match.file);
  if (!raw) return null;
  const svg = fitBrandSvgToBoard(raw);
  if (!svg) return null;

  return {
    title: match.title,
    file: match.file,
    category: match.category,
    svg,
    source: "svgl",
    iconId: `svgl:${match.file.replace(/\.svg$/i, "")}`,
  };
}

/**
 * Suggest brand logo concepts near a theme (for seed invention).
 */
export async function suggestBrandSeeds(input: {
  theme?: string;
  limit?: number;
}): Promise<Array<{ title: string; file: string; category: string }>> {
  const catalog = await getSvglCatalog();
  const limit = Math.max(1, Math.min(12, input.limit ?? 6));
  const theme = normalize(input.theme ?? "");

  const scored = catalog.map((entry) => {
    let score = 1;
    if (theme) {
      const hay = `${entry.title} ${entry.category} ${entry.aliases.join(" ")}`.toLowerCase();
      if (hay.includes(theme)) score += 5;
      for (const part of theme.split(" ")) {
        if (part.length > 2 && hay.includes(part)) score += 2;
      }
    }
    // Prefer consumer-recognizable categories for daily puzzles
    if (/social|music|entertainment|payment|browser/i.test(entry.category)) score += 1;
    return { entry, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => ({
      title: entry.title,
      file: entry.file,
      category: entry.category,
    }));
}
