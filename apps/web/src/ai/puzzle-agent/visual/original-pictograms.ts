import { INK_PICTOGRAM_PALETTE, INK_PICTOGRAM_STYLE_ID } from "./style";

/** Authored source candidates only. This module grants no publication approval. */
export type OriginalPictogramCandidate = Readonly<{
  assetId: string;
  artworkVersion: "v1";
  collectionVersion: "rebuzzle-ink-collection-v3";
  readingPolicyVersion: "original-readings-v1";
  styleId: typeof INK_PICTOGRAM_STYLE_ID;
  concept: string;
  /** Proposed editorial vocabulary; recognition evidence is still required. */
  approvedReadings: readonly string[];
  searchAliases: readonly string[];
  commonConfusions: readonly string[];
  provenance: "authored-svg";
  status: "candidate";
  svg: string;
}>;

const { ink, canvas } = INK_PICTOGRAM_PALETTE;
const solid = `fill="${ink}"`;
const paper = `fill="${canvas}"`;

function candidate(
  concept: string,
  drawing: string,
  synonyms: string[] = [],
  confusions: string[] = []
): OriginalPictogramCandidate {
  return Object.freeze({
    assetId: `rebuzzle-ink:${concept}:v1`,
    artworkVersion: "v1",
    collectionVersion: "rebuzzle-ink-collection-v3",
    readingPolicyVersion: "original-readings-v1",
    styleId: INK_PICTOGRAM_STYLE_ID,
    concept,
    approvedReadings: Object.freeze([concept, ...synonyms]),
    searchAliases: Object.freeze([concept, ...synonyms, ...confusions]),
    commonConfusions: Object.freeze([...confusions]),
    provenance: "authored-svg",
    status: "candidate",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><g fill="none" stroke="${ink}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg>`,
  });
}

// Original geometry: broad closed silhouettes, rounded ink and sparse identifying marks.
// Never edit released v1 bytes in place; a revised drawing receives a new version.
const candidates: readonly OriginalPictogramCandidate[] = Object.freeze([
  candidate(
    "clock",
    `<circle cx="32" cy="32" r="24" ${solid}/><circle cx="32" cy="32" r="20" ${paper}/><path d="M32 15v3m17 14h-3M32 49v-3M15 32h3"/><path d="m23 23 9 9 11-6" stroke-width="3.5"/><circle cx="32" cy="32" r="2" ${solid}/>`,
    ["timepiece"],
    ["watch", "alarm clock"]
  ),
  candidate(
    "key",
    `<path d="M29 30h24v8h-5v7h-6v-7H29" ${paper}/><path d="M20 12c9 0 16 7 16 16s-7 16-16 16S7 37 7 28s4-16 13-16Z" ${paper}/><path d="M16 21h8v9h-8z" ${solid}/><path d="M37 34h12"/>`,
    [],
    ["wrench"]
  ),
  candidate(
    "umbrella",
    `<path d="M32 9v5m0 23v12c0 9 12 9 12 0" stroke-width="3"/><path d="M8 37c1-14 11-23 24-23s23 9 24 23c-4-5-8-5-12 0-4-5-8-5-12 0-4-5-8-5-12 0-4-5-8-5-12 0Z" ${paper}/><path d="M32 14c-7 6-11 14-12 23m12-23c7 6 11 14 12 23"/>`,
    ["parasol"],
    ["mushroom"]
  ),
  candidate(
    "bee",
    `<path d="M32 27c-14-1-18-14-11-17 8-3 14 9 11 17Z" ${paper}/><path d="M34 26c1-13 12-19 16-12 4 8-6 15-16 12Z" ${paper}/><path d="m13 36-6 3 7 2" ${solid}/><ellipse cx="29" cy="39" rx="17" ry="12" ${paper}/><path d="M24 28c-4 7-4 14 0 22m8-22c-3 7-3 14 0 22" stroke-width="5"/><circle cx="47" cy="33" r="9" ${paper}/><path d="m44 24-3-7m9 7 3-6M25 51l-3 4m14-5 2 5"/><circle cx="50" cy="31" r="1.5" ${solid}/>`,
    [],
    ["wasp", "fly"]
  ),
  candidate(
    "eye",
    `<path d="M7 32c7-11 15-17 25-17s18 6 25 17c-7 11-15 17-25 17S14 43 7 32Z" ${paper}/><path d="M7 32c7-11 15-17 25-17s18 6 25 17" stroke-width="3.5"/><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="6" ${solid}/><circle cx="34" cy="29" r="2" ${paper} stroke="none"/>`,
    [],
    ["eyeball"]
  ),
  candidate(
    "bell",
    `<path d="M28 14v-3c0-5 8-5 8 0v3"/><path d="M14 44c5-4 6-9 6-17 0-9 5-14 12-14s12 5 12 14c0 8 1 13 6 17Z" ${paper}/><path d="M15 44h34v5H15z" ${solid}/><path d="M27 50c0 7 10 7 10 0" ${paper}/><path d="M26 23c0-2 2-4 4-4"/>`,
    [],
    ["hat"]
  ),
  candidate(
    "book",
    `<path d="M8 13c9-2 17 0 24 5 7-5 15-7 24-5v37c-9-2-17 0-24 5-7-5-15-7-24-5Z" ${solid}/><path d="M11 10c8 0 15 2 21 7 6-5 13-7 21-7v35c-8 0-15 2-21 7-6-5-13-7-21-7Z" ${paper}/><path d="M32 17v35M17 20c4 0 7 1 10 3m-10 5c4 0 7 1 10 3m10-8c3-2 6-3 10-3m-10 11c3-2 6-3 10-3"/>`,
    ["open book"],
    ["notebook"]
  ),
  candidate(
    "house",
    `<path d="M41 19V9h8v17" ${paper}/><path d="M13 29 32 12l19 17v25H13Z" ${paper}/><path d="M7 29 32 7l25 22-4 4-21-18-21 18Z" ${solid}/><path d="M28 54V37h10v17" ${solid}/><path d="M18 32h7v8h-7z"/><path d="M12 55h40"/>`,
    ["home"],
    ["cabin"]
  ),
  candidate(
    "moon",
    `<path d="M43 9c-8 1-14 7-15 16-2 11 7 21 18 22-9 11-28 9-35-3C2 29 12 10 28 8c5-1 10-1 15 1Z" ${paper}/><path d="M16 30c-2 6 0 12 4 16"/>`,
    ["crescent"],
    ["banana"]
  ),
  candidate(
    "sun",
    `<circle cx="32" cy="32" r="15" ${paper}/><circle cx="32" cy="32" r="10"/><path d="M32 7v5m0 40v5M7 32h5m40 0h5M14 14l4 4m28 28 4 4M14 50l4-4m28-28 4-4" stroke-width="3.5"/>`,
    ["sunshine"],
    ["gear"]
  ),
  candidate(
    "leaf",
    `<path d="M12 49C4 26 21 9 53 9c1 29-14 48-36 43Z" ${paper}/><path d="M9 56 44 21M22 43l-2-15m11 6 13 1m-7-7V18"/>`,
    [],
    ["feather"]
  ),
  candidate(
    "lightbulb",
    `<path d="M23 43c0-7-9-10-9-21a18 18 0 0 1 36 0c0 11-9 14-9 21Z" ${paper}/><path d="M24 43h16v10H24z" ${solid}/><path d="M28 54v3h8v-3" ${solid}/><path d="M29 42V29l-5-6m11 19V29l5-6M23 16c1-3 4-5 7-5"/><path d="M25 48h14" stroke="${canvas}"/>`,
    ["light bulb", "bulb"],
    ["balloon"]
  ),
  candidate(
    "fire",
    `<path d="M33 7c3 12-6 16-4 23 5-1 9-7 9-12 11 10 17 19 12 29-4 8-13 12-22 10C8 53 6 37 17 23c-1 7 1 11 5 12-3-13 5-18 11-28Z" ${paper}/><path d="M31 34c1 7-6 9-5 15 1 5 7 8 12 4 5-4 3-11 0-15-1 5-3 7-5 7 1-4 1-7-2-11Z" ${solid}/>`,
    ["flame"],
    ["water", "leaf"]
  ),
  candidate(
    "snowflake",
    `<path d="M32 8v48M11 20l42 24M11 44l42-24" stroke-width="3"/><path d="m25 12 7 7 7-7m-14 40 7-7 7 7M12 28l10-3-2-10m32 21-10 3 2 10M20 49l2-10-10-3m32-21-2 10 10 3"/>`,
    ["snow"],
    ["asterisk"]
  ),
  candidate(
    "rain",
    `<path d="M16 36a9 9 0 0 1-1-18 15 15 0 0 1 28-2 10 10 0 1 1 5 20Z" ${paper}/><path d="M16 45c-2 3-4 5-4 7a4 4 0 0 0 8 0c0-2-2-4-4-7Zm16-4c-2 3-4 5-4 7a4 4 0 0 0 8 0c0-2-2-4-4-7Zm16 4c-2 3-4 5-4 7a4 4 0 0 0 8 0c0-2-2-4-4-7Z" ${solid}/>`,
    ["rain cloud"],
    ["cloud", "storm"]
  ),
  candidate(
    "flower",
    `<path d="M32 35v21m0-8c-10 1-17-3-17-11 9 0 15 4 17 11Z" ${paper}/><path d="M25 12c0-9 14-9 14 0 8-4 15 8 7 13 8 5 1 17-7 13 0 9-14 9-14 0-8 4-15-8-7-13-8-5-1-17 7-13Z" ${paper}/><circle cx="32" cy="25" r="6" ${solid}/>`,
    ["blossom"],
    ["sunflower"]
  ),
  candidate(
    "wheat",
    `<path d="M32 14v43" stroke-width="3"/><path d="M32 22c-7-2-11-7-10-13 7 1 11 6 10 13Zm0 10c-9-1-15-6-15-13 9 0 15 5 15 13Zm0 12c-10 0-17-5-18-12 10-1 17 4 18 12Z" ${paper}/><path d="M32 22c7-2 11-7 10-13-7 1-11 6-10 13Zm0 10c9-1 15-6 15-13-9 0-15 5-15 13Zm0 12c10 0 17-5 18-12-10-1-17 4-18 12Z" ${paper}/><path d="M32 7v7"/>`,
    [],
    ["grain", "barley"]
  ),
  candidate(
    "tree",
    `<path d="M27 32h10v22l6 3H21l6-3Z" ${solid}/><path d="M18 39C6 39 5 23 15 19c-2-11 13-15 18-7 7-9 22-2 18 8 11 6 6 21-4 20-5 8-15 7-19 1-4 4-9 3-10-2Z" ${paper}/><path d="M31 41v-9l-6-5m6 9 8-8"/>`,
    [],
    ["bush", "oak"]
  ),
  candidate(
    "star",
    `<path d="m32 7 7 16 18 2-14 12 4 19-15-10-15 10 4-19L7 25l18-2Z" ${paper}/><path d="m32 15 4 10" stroke-width="3"/>`,
    [],
    ["starfish"]
  ),
  candidate(
    "egg",
    `<path d="M52 36c0 14-8 21-20 21S12 50 12 36 23 7 32 7s20 15 20 29Z" ${paper}/><path d="M21 32c0-6 3-12 7-15" stroke-width="3"/>`,
    [],
    ["oval", "stone"]
  ),
  candidate(
    "sprout",
    `<path d="M32 55V32" stroke-width="3"/><path d="M32 34C16 36 8 28 8 15c16-1 25 5 24 19Zm0-8C31 13 40 7 55 9c-1 13-9 20-23 17Z" ${paper}/><path d="m18 23 14 11m0-8 12-8M15 56h34"/>`,
    ["seedling"],
    ["leaf", "plant"]
  ),
  candidate(
    "dog",
    `<path d="M13 33c-6-1-7-7-5-12 1 5 5 7 9 6h15l5-13 10 1 3 8 7 3-2 8H44v20h-7V41H23v13h-7V39Z" ${paper}/><path d="M38 15c-4 2-5 10-1 14 5 0 8-8 6-13" ${solid}/><circle cx="48" cy="24" r="1.2" ${solid}/><path d="M54 26h3v4h-4" ${solid}/>`,
    [],
    ["puppy", "wolf"]
  ),
  candidate(
    "cat",
    `<path d="M16 33c-10 1-12-13-6-18 6-3 9 4 5 7-2 1-3-1-3-2-2 4 1 9 6 8h15l1-14 7 6 9-6 2 17-7 7v17h-7V42H25v13h-7V38Z" ${paper}/><path d="m39 29 2 1m6-1 2-1m-7 7h3M37 34l-6-1m17 1 8-2"/>`,
    [],
    ["kitten", "fox"]
  ),
  candidate(
    "bird",
    `<path d="m9 39 12-4c1-13 7-23 17-23 8 0 13 7 12 15l7 4-9 3c-4 14-19 19-31 10Z" ${paper}/><path d="M21 36c4-9 10-12 18-10-1 9-8 15-17 15"/><circle cx="42" cy="22" r="1.5" ${solid}/><path d="M29 48v8m8-10v10m-12 0h8m0 0h8"/>`,
    [],
    ["duck", "sparrow"]
  ),
  candidate(
    "fish",
    `<path d="M40 24 56 14v36L40 40C29 51 13 43 7 32c6-11 22-19 33-8Z" ${paper}/><path d="m23 20 8-10 7 12m-15 22 8 10 7-12" ${paper}/><path d="M21 22c5 6 5 14 0 20M43 27v10"/><circle cx="15" cy="30" r="1.7" ${solid}/>`,
    [],
    ["shark"]
  ),
  candidate(
    "heart",
    `<path d="M32 55 12 35C-1 21 10 6 22 10c5 1 8 5 10 9 2-4 5-8 10-9 12-4 23 11 10 25Z" ${paper}/><path d="M15 21c1-4 5-5 8-2" stroke-width="3"/>`,
    [],
    []
  ),
  candidate(
    "brain",
    `<path d="M32 12c-6-8-16-4-17 4-9 0-12 10-7 16-5 7 0 17 8 17 3 9 13 10 16 3 3 7 13 6 16-3 8 0 13-10 8-17 5-6 2-16-7-16-1-8-11-12-17-4Z" ${paper}/><path d="M32 12v40M16 16c7 0 10 6 7 12M8 32c5-4 12-2 14 3m-6 14c-2-6 2-11 8-11m25-22c-7 0-10 6-7 12m14 4c-5-4-12-2-14 3m6 14c2-6-2-11-8-11"/>`,
    [],
    ["cloud", "walnut"]
  ),
  candidate(
    "ear",
    `<path d="M20 24c-2-10 4-17 13-17 13 0 21 10 19 22-2 10-12 11-14 20-2 11-15 11-18 2" ${paper}/><path d="M26 24c0-7 8-10 13-5 7 7 0 13-5 15l-1 7m-9-9c6-3 12 0 10 5"/>`,
    [],
    ["shell"]
  ),
  candidate(
    "hand",
    `<path d="M20 34V16c0-6 7-6 7 0v14V11c0-6 7-6 7 0v19V14c0-6 7-6 7 0v18V22c0-6 7-6 7 0v20c0 10-7 15-17 15-6 0-10-3-13-8L8 34c-3-5 2-9 6-5l6 5Z" ${paper}/><path d="M24 40c4-3 9-3 13-1"/>`,
    ["palm"],
    ["glove"]
  ),
  candidate(
    "footprints",
    `<path d="M19 26c7-1 10 5 7 12-2 5 1 8-1 13-2 5-9 5-11 0-3-8-4-23 5-25Zm25-12c7 0 10 6 6 13-3 5-1 8-3 12-3 5-10 3-11-2-1-9-1-23 8-23Z" ${paper}/><path d="M20 18v3m-7-1 1 3m-5 2 2 2m30-19v3m7-2-1 3m6 1-2 2" stroke-width="4"/>`,
    ["footsteps"],
    ["shoes", "feet"]
  ),
  candidate(
    "skull",
    `<path d="M18 41C1 32 9 9 26 8h12c17 1 25 24 8 33v12H18Z" ${paper}/><path d="M21 53v4h22v-4"/><path d="M16 29c0-7 12-7 12 0s-12 7-12 0Zm20 0c0-7 12-7 12 0s-12 7-12 0Z" ${solid}/><path d="m32 35-4 7h8Z" ${solid}/><path d="M25 48v7m7-7v7m7-7v7"/>`,
    [],
    ["skeleton"]
  ),
  candidate(
    "envelope",
    `<rect x="7" y="14" width="50" height="36" rx="4" ${paper}/><path d="m9 17 23 19 23-19M9 47l16-16m30 16L39 31"/><path d="m27 32 5 4 5-4" stroke-width="3"/>`,
    ["mail", "letter"],
    ["email"]
  ),
  candidate(
    "door",
    `<path d="M13 8h38v49H13Z" ${paper}/><path d="m19 12 24 4v37l-24 4Z" ${paper}/><path d="M24 19h13v13H24z"/><circle cx="37" cy="38" r="2" ${solid}/><path d="M8 57h48"/>`,
    [],
    ["window"]
  ),
  candidate(
    "boat",
    `<path d="M32 8v36" stroke-width="3"/><path d="m28 12-17 26h17Zm8 6v20h19Z" ${paper}/><path d="M7 44h50l-9 12H17Z" ${solid}/>`,
    ["sailboat"],
    ["ship"]
  ),
  candidate(
    "music",
    `<path d="M25 44V14l28-6v30" stroke-width="3"/><path d="M25 14v8l28-6V8Z" ${solid}/><ellipse cx="17" cy="48" rx="9" ry="6" ${solid}/><ellipse cx="45" cy="42" rx="9" ry="6" ${solid}/>`,
    ["musical notes"],
    ["musical note"]
  ),
  candidate(
    "gift",
    `<path d="M12 29h40v27H12Z" ${paper}/><path d="M8 20h48v10H8Z" ${paper}/><path d="M28 20h8v36h-8Z" ${solid}/><path d="M32 20C13 21 12 7 20 8c7 0 12 12 12 12Zm0 0C51 21 52 7 44 8c-7 0-12 12-12 12Z" ${paper}/>`,
    ["present"],
    ["box"]
  ),
  candidate(
    "camera",
    `<path d="M10 19h10l4-9h16l4 9h10c3 0 4 2 4 5v25c0 3-1 5-4 5H10c-3 0-4-2-4-5V24c0-3 1-5 4-5Z" ${paper}/><circle cx="32" cy="36" r="13" ${solid}/><circle cx="32" cy="36" r="8" ${paper}/><circle cx="49" cy="25" r="2" ${solid}/><path d="M12 14h6" stroke-width="4"/>`,
    [],
    ["video camera"]
  ),
  candidate(
    "diamond",
    `<path d="m17 10-10 16 25 31 25-31-10-16Z" ${paper}/><path d="M7 26h50M17 10l7 16 8-16 8 16 7-16M24 26l8 31 8-31"/>`,
    ["gem", "gemstone"],
    ["jewel"]
  ),
  candidate(
    "globe",
    `<circle cx="30" cy="28" r="20" ${paper}/><ellipse cx="30" cy="28" rx="9" ry="20"/><path d="M10 28h40M15 16h30M15 40h30M46 8c17 16 10 39-11 43v6m-11 0h22"/><path d="M23 57h24" stroke-width="3.5"/>`,
    ["world", "earth"],
    ["ball"]
  ),
  candidate(
    "newspaper",
    `<path d="M9 9h40v43c0 6-8 6-8 0V18h15v34c0 5-3 6-7 6H15c-4 0-6-2-6-6Z" ${paper}/><path d="M16 17h23" stroke-width="4"/><path d="M16 25h10v11H16Z" ${solid}/><path d="M31 25h8m-8 6h8M16 43h23m-23 7h23"/>`,
    ["news"],
    ["magazine"]
  ),
]);

export function listOriginalPictogramCandidates(): readonly OriginalPictogramCandidate[] {
  return candidates;
}
