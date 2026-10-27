import { INK_PICTOGRAM_PALETTE, INK_PICTOGRAM_STYLE_ID } from "./style";

/** Authored source candidates only. This module grants no publication approval. */
export type OriginalPictogramCandidate = Readonly<{
  assetId: string;
  artworkVersion: "v1";
  collectionVersion: "rebuzzle-ink-collection-v1";
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
    collectionVersion: "rebuzzle-ink-collection-v1",
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
]);

export function listOriginalPictogramCandidates(): readonly OriginalPictogramCandidate[] {
  return candidates;
}
