/**
 * Pure gates for whether a candidate needs a visual polish pass.
 */

import { scorePictogramClarity } from "../visual/pictogram-clarity";
import type { ApexCandidate } from "./types";

export function candidateNeedsVisualPolish(candidate: ApexCandidate): boolean {
  const iconScore = candidate.critique?.iconRecognizability ?? 100;
  if (candidate.critique?.verdict === "revise") return true;
  if (iconScore < 55) return true;
  return candidate.visual.layers.some((layer) => {
    if (layer.kind !== "pictogram") return false;
    if (!layer.svg) return true;
    if (layer.recognitionOk === false) return true;
    return !scorePictogramClarity(layer.svg).ok;
  });
}
