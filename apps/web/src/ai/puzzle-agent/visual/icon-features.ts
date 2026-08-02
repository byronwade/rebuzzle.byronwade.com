/**
 * Canonical identifying features for common rebus pictogram nouns.
 * Injected into draw prompts so icons look like something a human would sketch.
 */

export type IconFeatureEntry = {
  /** Synonyms / acceptable recognition labels */
  aliases: string[];
  /** Must-have visual marks for a 64×64 icon */
  features: string[];
  /** Preferred camera angle */
  view: string;
};

import { getCuratedPictogramAliases } from "./curated-pictograms";

export const ICON_FEATURES: Record<string, IconFeatureEntry> = {
  bee: {
    aliases: ["bee", "bumblebee", "honeybee", "insect"],
    features: ["oval striped body", "two oval wings", "two antennae", "small eye"],
    view: "side / three-quarter",
  },
  eye: {
    aliases: ["eye", "eyeball"],
    features: ["almond lid outline", "round iris", "dark pupil"],
    view: "front",
  },
  clock: {
    aliases: ["clock", "watch", "timepiece", "alarm clock"],
    features: ["round face", "two hands", "12 tick marks or hub", "optional legs/bells"],
    view: "front face",
  },
  key: {
    aliases: ["key"],
    features: ["oval bow/handle", "long shaft", "toothed bit at the tip"],
    view: "side profile",
  },
  umbrella: {
    aliases: ["umbrella"],
    features: ["curved canopy dome", "center shaft", "J-shaped handle"],
    view: "side",
  },
  sun: {
    aliases: ["sun", "sunshine"],
    features: ["center circle", "8–12 radiating rays"],
    view: "front",
  },
  moon: {
    aliases: ["moon", "crescent"],
    features: ["crescent or cratered circle", "clear curved silhouette"],
    view: "front",
  },
  tree: {
    aliases: ["tree"],
    features: ["trunk", "foliage canopy/cloud", "optional ground line"],
    view: "front",
  },
  house: {
    aliases: ["house", "home", "cottage"],
    features: ["square body", "triangle roof", "door", "optional window"],
    view: "front",
  },
  book: {
    aliases: ["book"],
    features: ["closed rectangle or open V pages", "spine", "cover edge"],
    view: "three-quarter",
  },
  fish: {
    aliases: ["fish"],
    features: ["oval body", "tail fin", "eye", "optional dorsal fin"],
    view: "side",
  },
  bird: {
    aliases: ["bird"],
    features: ["round body", "beak", "wing", "tail", "eye"],
    view: "side",
  },
  dog: {
    aliases: ["dog", "puppy"],
    features: ["head with snout", "floppy/pointed ears", "body", "tail"],
    view: "side or three-quarter head",
  },
  cat: {
    aliases: ["cat", "kitten"],
    features: ["round head", "pointed ears", "whiskers", "tail"],
    view: "front head or side",
  },
  heart: {
    aliases: ["heart"],
    features: ["two top lobes", "pointed bottom", "symmetric silhouette"],
    view: "front",
  },
  star: {
    aliases: ["star"],
    features: ["5-point star silhouette"],
    view: "front",
  },
  boat: {
    aliases: ["boat", "ship", "sailboat"],
    features: ["hull", "mast or cabin", "optional sail"],
    view: "side",
  },
  car: {
    aliases: ["car", "auto", "automobile"],
    features: ["body", "two wheels", "windows", "cabin silhouette"],
    view: "side",
  },
  apple: {
    aliases: ["apple"],
    features: ["round fruit body", "stem", "leaf"],
    view: "front",
  },
  flower: {
    aliases: ["flower", "blossom", "daisy"],
    features: ["center circle", "petals around", "optional stem"],
    view: "front",
  },
  lightbulb: {
    aliases: ["lightbulb", "bulb", "light"],
    features: ["glass dome", "screw base", "filament hint"],
    view: "front",
  },
  bulb: {
    aliases: ["lightbulb", "bulb", "light"],
    features: ["glass dome", "screw base", "filament hint"],
    view: "front",
  },
  lock: {
    aliases: ["lock", "padlock"],
    features: ["shackle arc", "rectangular body", "keyhole"],
    view: "front",
  },
  crown: {
    aliases: ["crown"],
    features: ["band", "3+ points/jewels on top"],
    view: "front",
  },
  rocket: {
    aliases: ["rocket"],
    features: ["pointed nose", "body cylinder", "fins", "optional flame"],
    view: "upright",
  },
  hat: {
    aliases: ["hat", "top hat", "cap"],
    features: ["crown", "brim"],
    view: "side or three-quarter",
  },
  shoe: {
    aliases: ["shoe", "boot", "sneaker"],
    features: ["sole", "upper", "heel or toe shape"],
    view: "side",
  },
  hand: {
    aliases: ["hand", "palm"],
    features: ["palm", "four fingers", "thumb"],
    view: "front open palm",
  },
  mountain: {
    aliases: ["mountain", "peak"],
    features: ["triangular peaks", "optional snow cap"],
    view: "front",
  },
  cloud: {
    aliases: ["cloud"],
    features: ["puffy overlapping lobes", "flat bottom"],
    view: "front",
  },
  rain: {
    aliases: ["rain", "raindrop", "droplet"],
    features: ["teardrop shapes falling", "optional cloud"],
    view: "front",
  },
  fire: {
    aliases: ["fire", "flame"],
    features: ["upward teardrop flames", "layered tips"],
    view: "front",
  },
  water: {
    aliases: ["water", "wave", "droplet"],
    features: ["wave crest or teardrop"],
    view: "front",
  },
  bridge: {
    aliases: ["bridge"],
    features: ["deck", "supports/arches"],
    view: "side",
  },
  egg: {
    aliases: ["egg"],
    features: ["oval upright silhouette"],
    view: "front",
  },
  bell: {
    aliases: ["bell"],
    features: ["dome body", "flare bottom", "clapper or handle"],
    view: "front",
  },
  candle: {
    aliases: ["candle"],
    features: ["cylinder", "wick", "flame"],
    view: "front",
  },
  gift: {
    aliases: ["gift", "present", "box"],
    features: ["square box", "ribbon cross", "bow on top"],
    view: "three-quarter",
  },
  trophy: {
    aliases: ["trophy", "cup"],
    features: ["cup bowl", "two handles", "stem/base"],
    view: "front",
  },
  hourglass: {
    aliases: ["hourglass", "sandglass"],
    features: ["two bulbs", "narrow waist", "frame"],
    view: "front",
  },
  compass: {
    aliases: ["compass"],
    features: ["round dial", "needle", "N mark optional"],
    view: "front",
  },
  anchor: {
    aliases: ["anchor"],
    features: ["ring top", "shank", "two flukes"],
    view: "front",
  },
  sword: {
    aliases: ["sword"],
    features: ["blade", "crossguard", "hilt"],
    view: "diagonal or upright",
  },
  ring: {
    aliases: ["ring"],
    features: ["circle band", "optional gem"],
    view: "three-quarter",
  },
  phone: {
    aliases: ["phone", "smartphone", "mobile"],
    features: ["rounded rectangle", "screen", "home button or notch hint"],
    view: "front",
  },
  train: {
    aliases: ["train", "locomotive"],
    features: ["engine body", "wheels", "smokestack or cabin"],
    view: "side",
  },
  plane: {
    aliases: ["plane", "airplane", "jet"],
    features: ["fuselage", "wings", "tail"],
    view: "top or side",
  },
  brain: {
    aliases: ["brain"],
    features: ["two lobes", "wrinkled folds"],
    view: "top/front",
  },
  skull: {
    aliases: ["skull"],
    features: ["cranium", "eye sockets", "nasal cavity", "teeth row"],
    view: "front",
  },
  ghost: {
    aliases: ["ghost"],
    features: ["rounded top", "wavy bottom", "two eyes"],
    view: "front",
  },
  leaf: {
    aliases: ["leaf"],
    features: ["pointed oval blade", "center vein", "stem"],
    view: "front",
  },
  cake: {
    aliases: ["cake"],
    features: ["layered cylinder", "frosting top", "optional candle/slice"],
    view: "three-quarter",
  },
  bread: {
    aliases: ["bread", "loaf"],
    features: ["loaf oval", "score lines on top"],
    view: "side",
  },
  money: {
    aliases: ["money", "cash", "dollar", "coin"],
    features: ["bills stack or coin circle with mark"],
    view: "three-quarter",
  },
  puzzle: {
    aliases: ["puzzle", "jigsaw"],
    features: ["jigsaw piece with tabs and blanks"],
    view: "front",
  },
};

/** Overused rebus answers — treat as tropes to avoid copying. */
export const OVERUSED_REBUS_TROPES = [
  "before",
  "sunflower",
  "piece of cake",
  "belief",
  "reading between the lines",
  "big deal",
  "once in a blue moon",
  "man overboard",
] as const;

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function lookupIconFeatures(concept: string): IconFeatureEntry | null {
  const key = normalizeLabel(concept).replace(/\s+/g, "");
  if (ICON_FEATURES[key]) return ICON_FEATURES[key]!;

  const lowered = normalizeLabel(concept);
  for (const [id, entry] of Object.entries(ICON_FEATURES)) {
    if (lowered === id || entry.aliases.some((a) => normalizeLabel(a) === lowered)) {
      return entry;
    }
    if (lowered.includes(id) || entry.aliases.some((a) => lowered.includes(normalizeLabel(a)))) {
      return entry;
    }
  }
  return null;
}

export function getIconFeatureHints(concept: string): string {
  const entry = lookupIconFeatures(concept);
  if (!entry) {
    return `Invent 3 chunky identifying marks a stranger would use to name "${concept}" at a glance.`;
  }
  return `Must-have features (${entry.view}): ${entry.features.join("; ")}.`;
}

/**
 * Fuzzy match: did the blind viewer name the intended concept?
 */
export function conceptMatchesSeen(concept: string, seenLabel: string): boolean {
  const intended = normalizeLabel(concept);
  const seen = normalizeLabel(seenLabel);
  if (!intended || !seen) return false;
  if (seen === intended) return true;
  if (seen.includes(intended) || intended.includes(seen)) return true;

  const curatedAliases = getCuratedPictogramAliases(concept);
  if (
    curatedAliases.some((alias) => {
      const normalized = normalizeLabel(alias);
      return seen === normalized || seen.includes(normalized) || normalized.includes(seen);
    })
  ) {
    return true;
  }

  const entry = lookupIconFeatures(concept);
  if (entry) {
    return entry.aliases.some((alias) => {
      const a = normalizeLabel(alias);
      return seen === a || seen.includes(a) || a.includes(seen);
    });
  }

  const intendedTokens = new Set(intended.split(" ").filter((t) => t.length > 2));
  const seenTokens = seen.split(" ").filter((t) => t.length > 2);
  return seenTokens.some((t) => intendedTokens.has(t));
}
