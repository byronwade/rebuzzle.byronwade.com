/**
 * SVGL brand catalog types + offline snapshot.
 * Snapshot generated from https://api.svgl.app (cache locally; respect rate limits).
 */

import catalog from "./svgl-catalog.json" with { type: "json" };

export type SvglBrandEntry = {
  title: string;
  /** SVG filename under /svg/ or /library/ */
  file: string;
  aliases: string[];
  category: string;
};

/** Full offline catalog (~665 brands) for matching when live API is blocked */
export const SVGL_BRAND_SEED: SvglBrandEntry[] = catalog as SvglBrandEntry[];
