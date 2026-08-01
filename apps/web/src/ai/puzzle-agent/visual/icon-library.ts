/**
 * Open icon pack lookup for rebus pictograms.
 *
 * Sources (offline-first via Iconify JSON packs):
 * - Lucide (ISC) — clean stroke icons, great for small silhouettes
 * - Phosphor (MIT) — huge coverage, regular weight
 * - Tabler (MIT) — consistent outline set
 * - Material Design Icons (Apache-2.0) — broad noun coverage
 *
 * Online fallback: Iconify API search + SVG download when local packs miss.
 * Restyled into Rebuzzle Ink Pictogram v1 (64×64, ink strokes).
 *
 * Reads @iconify-json/* packs directly (no @iconify/utils) for Jest/CJS compatibility.
 */

import { icons as lucideIcons } from "@iconify-json/lucide";
import { icons as mdiIcons } from "@iconify-json/mdi";
import { icons as phosphorIcons } from "@iconify-json/ph";
import { icons as tablerIcons } from "@iconify-json/tabler";
import { INK_PICTOGRAM_PALETTE } from "./style";

export type IconPackId = "lucide" | "ph" | "tabler" | "mdi";

export type LibraryIconHit = {
  pack: IconPackId | "iconify-api";
  iconName: string;
  /** Fully qualified Iconify id, e.g. lucide:key */
  iconId: string;
  svg: string;
  source: "local" | "api";
};

type IconifyIconBody = {
  body: string;
  width?: number;
  height?: number;
  hidden?: boolean;
};

type IconifyAlias = {
  parent: string;
  width?: number;
  height?: number;
};

type IconifyJSONLike = {
  prefix: string;
  width?: number;
  height?: number;
  icons: Record<string, IconifyIconBody>;
  aliases?: Record<string, IconifyAlias>;
};

type PackEntry = {
  id: IconPackId;
  icons: IconifyJSONLike;
  /** Prefer outline / regular variants */
  preferNames?: (base: string) => string[];
};

const PACKS: PackEntry[] = [
  {
    id: "lucide",
    icons: lucideIcons as IconifyJSONLike,
    preferNames: (base) => [base],
  },
  {
    id: "ph",
    icons: phosphorIcons as IconifyJSONLike,
    preferNames: (base) => [base, `${base}-bold`, `${base}-duotone`],
  },
  {
    id: "tabler",
    icons: tablerIcons as IconifyJSONLike,
    preferNames: (base) => [base, `${base}-filled`],
  },
  {
    id: "mdi",
    icons: mdiIcons as IconifyJSONLike,
    preferNames: (base) => [`${base}-outline`, base],
  },
];

/** Concept → candidate icon names (kebab) across packs */
const CONCEPT_ICON_CANDIDATES: Record<string, string[]> = {
  bee: ["bee", "bug"],
  eye: ["eye"],
  clock: ["clock", "alarm-clock", "clock-hour-4"],
  key: ["key"],
  umbrella: ["umbrella"],
  sun: ["sun"],
  moon: ["moon", "moon-stars"],
  tree: ["tree", "tree-deciduous", "pine-tree"],
  house: ["house", "home", "home-2"],
  book: ["book", "book-open"],
  fish: ["fish"],
  bird: ["bird"],
  dog: ["dog"],
  cat: ["cat"],
  heart: ["heart"],
  star: ["star"],
  boat: ["ship", "sailboat", "boat"],
  car: ["car"],
  apple: ["apple"],
  flower: ["flower", "flower-2"],
  lightbulb: ["lightbulb", "bulb"],
  bulb: ["lightbulb", "bulb"],
  lock: ["lock", "lock-keyhole", "padlock"],
  crown: ["crown"],
  rocket: ["rocket"],
  hat: ["hat", "hard-hat"],
  shoe: ["footprints", "shoe"],
  hand: ["hand"],
  mountain: ["mountain", "mountain-snow"],
  cloud: ["cloud"],
  rain: ["cloud-rain", "droplets"],
  fire: ["flame", "fire"],
  water: ["droplet", "droplets", "waves"],
  bridge: ["bridge"],
  egg: ["egg"],
  bell: ["bell"],
  candle: ["candle"],
  gift: ["gift"],
  trophy: ["trophy", "award"],
  hourglass: ["hourglass", "hourglass-empty"],
  compass: ["compass"],
  anchor: ["anchor"],
  sword: ["sword"],
  ring: ["ring"],
  phone: ["smartphone", "phone", "device-mobile"],
  train: ["train", "train-front"],
  plane: ["plane", "airplane"],
  brain: ["brain"],
  skull: ["skull"],
  ghost: ["ghost"],
  leaf: ["leaf"],
  cake: ["cake", "cake-slice"],
  bread: ["bread", "sandwich"],
  money: ["banknote", "coins", "cash", "currency-dollar"],
  puzzle: ["puzzle", "puzzle-piece"],
  bed: ["bed"],
  tea: ["cup", "mug", "coffee"],
  pear: ["pear"],
  door: ["door", "door-open"],
  saw: ["saw", "axe"],
  knot: ["rope"],
  can: ["jar", "bottle"],
  sheep: ["sheep"],
  hair: ["scissors", "cut"],
  store: ["store", "building-store", "shop"],
  sea: ["waves", "ripple"],
  hole: ["circle-dashed", "circle"],
  ladder: ["ladder"],
  needle: ["needle"],
  bowl: ["bowl", "soup"],
  pan: ["chef-hat", "cooking-pot"],
  fork: ["utensils"],
  spoon: ["utensils", "spoon"],
  raindrop: ["droplet", "droplets"],
  lighthouse: ["lighthouse", "tower"],
  butterfly: ["butterfly"],
  camera: ["camera"],
  map: ["map"],
  music: ["music"],
  wheel: ["cog", "settings"],
};

function normalizeConcept(concept: string): string {
  return concept
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function candidateNamesForConcept(concept: string): string[] {
  const normalized = normalizeConcept(concept);
  const compact = normalized.replace(/\s+/g, "");
  const hyphen = normalized.replace(/\s+/g, "-");
  const fromMap = CONCEPT_ICON_CANDIDATES[compact] ?? CONCEPT_ICON_CANDIDATES[hyphen];
  const names = new Set<string>();
  if (fromMap) for (const n of fromMap) names.add(n);
  if (hyphen) names.add(hyphen);
  if (compact && compact !== hyphen) names.add(compact);
  const first = normalized.split(" ")[0];
  if (first && first.length >= 3) {
    names.add(first);
    const mapped = CONCEPT_ICON_CANDIDATES[first];
    if (mapped) for (const n of mapped) names.add(n);
  }
  return [...names];
}

function resolveIconBody(
  pack: IconifyJSONLike,
  iconName: string
): IconifyIconBody | null {
  const direct = pack.icons[iconName];
  if (direct?.body && !direct.hidden) return direct;

  const alias = pack.aliases?.[iconName];
  if (!alias?.parent) return null;
  const parent = pack.icons[alias.parent];
  if (!parent?.body || parent.hidden) return null;
  return {
    body: parent.body,
    width: alias.width ?? parent.width,
    height: alias.height ?? parent.height,
  };
}

/**
 * Restyle a pack SVG body into Ink Pictogram v1 (64×64, ink strokes).
 */
export function restylePackSvgToInk(body: string): string {
  const ink = INK_PICTOGRAM_PALETTE.ink;
  const canvas = INK_PICTOGRAM_PALETTE.canvas;

  let cleaned = body
    .replace(/\bid="[^"]*"/gi, "")
    .replace(/\bcurrentColor\b/gi, ink)
    .replace(/\bstroke="[^"]*"/gi, `stroke="${ink}"`)
    .replace(/\bfill="currentColor"/gi, `fill="${ink}"`)
    .replace(/\bfill="(?!none)(#[0-9a-fA-F]{3,8}|black|white)"/gi, (_match, color: string) => {
      if (/^(#fff|#ffffff|white)$/i.test(color)) return `fill="${canvas}"`;
      if (/^(#000|#000000|black)$/i.test(color)) return 'fill="none"';
      return `fill="${color}"`;
    })
    .replace(/\bstroke-width="2(\.0)?"/gi, 'stroke-width="2.25"')
    .replace(/\bstroke-width='2(\.0)?'/gi, "stroke-width='2.25'");

  if (!/stroke-linecap=/i.test(cleaned)) {
    cleaned = cleaned.replace(/<g\b/i, '<g stroke-linecap="round" stroke-linejoin="round"');
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`,
    `<rect width="64" height="64" fill="${canvas}" opacity="0"/>`,
    `<g transform="translate(8 8) scale(2)" fill="none" stroke="${ink}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">`,
    cleaned,
    `</g>`,
    `</svg>`,
  ].join("");
}

function renderLocalIcon(pack: PackEntry, iconName: string): LibraryIconHit | null {
  const data = resolveIconBody(pack.icons, iconName);
  if (!data) return null;
  return {
    pack: pack.id,
    iconName,
    iconId: `${pack.id}:${iconName}`,
    svg: restylePackSvgToInk(data.body),
    source: "local",
  };
}

/**
 * Resolve concept to local pack icons (multiple candidates, best packs first).
 */
export function lookupLocalLibraryIcons(concept: string, limit = 6): LibraryIconHit[] {
  const bases = candidateNamesForConcept(concept);
  const hits: LibraryIconHit[] = [];
  const seen = new Set<string>();

  for (const pack of PACKS) {
    for (const base of bases) {
      const variants = pack.preferNames?.(base) ?? [base];
      for (const name of variants) {
        const key = `${pack.id}:${name}`;
        if (seen.has(key)) continue;
        const hit = renderLocalIcon(pack, name);
        if (!hit) continue;
        seen.add(key);
        hits.push(hit);
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

type IconifySearchResponse = {
  icons?: string[];
  total?: number;
};

/**
 * Online Iconify API: search + download SVG, then restyle.
 * Soft-fails offline / on network errors.
 */
export async function lookupOnlineLibraryIcons(
  concept: string,
  limit = 4
): Promise<LibraryIconHit[]> {
  const query = normalizeConcept(concept).slice(0, 40);
  if (!query) return [];

  try {
    const searchUrl = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${Math.max(limit * 4, 16)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!searchRes.ok) return [];
    const payload = (await searchRes.json()) as IconifySearchResponse;
    const preferredPrefixes = new Set(["lucide", "ph", "tabler", "mdi", "iconoir", "ri"]);
    const ranked = (payload.icons ?? [])
      .filter((id) => {
        const [prefix, name] = id.split(":");
        if (!prefix || !name) return false;
        if (/(filled|solid|sharp|twotone)$/i.test(name)) return false;
        return preferredPrefixes.has(prefix);
      })
      .slice(0, limit);

    const hits: LibraryIconHit[] = [];
    for (const iconId of ranked) {
      const [prefix, name] = iconId.split(":");
      if (!prefix || !name) continue;
      const svgUrl =
        `https://api.iconify.design/${prefix}/${name}.svg` +
        `?height=64&color=${encodeURIComponent(INK_PICTOGRAM_PALETTE.ink)}`;
      const svgRes = await fetch(svgUrl, { signal: AbortSignal.timeout(4000) });
      if (!svgRes.ok) continue;
      const raw = await svgRes.text();
      if (!raw.includes("<svg")) continue;
      const bodyMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
      const body = bodyMatch?.[1] ?? raw;
      hits.push({
        pack: "iconify-api",
        iconName: name,
        iconId,
        svg: restylePackSvgToInk(body),
        source: "api",
      });
    }
    return hits;
  } catch {
    return [];
  }
}

/**
 * Best-effort library candidates: local packs first, then online Iconify API.
 */
export async function lookupLibraryIconsForConcept(
  concept: string,
  options?: { allowOnline?: boolean; limit?: number }
): Promise<LibraryIconHit[]> {
  const limit = options?.limit ?? 6;
  const local = lookupLocalLibraryIcons(concept, limit);
  if (local.length >= 2 || options?.allowOnline === false) return local.slice(0, limit);

  const online = await lookupOnlineLibraryIcons(concept, Math.max(2, limit - local.length));
  const seen = new Set(local.map((h) => h.iconId));
  for (const hit of online) {
    if (seen.has(hit.iconId)) continue;
    local.push(hit);
    if (local.length >= limit) break;
  }
  return local;
}

/** For tests / diagnostics */
export function listMappedConcepts(): string[] {
  return Object.keys(CONCEPT_ICON_CANDIDATES);
}
