import type { PuzzleVisual } from "./composition";

export type DeclaredBoardCues = {
  concepts: string[];
  text: string[];
  operators: string[];
  unverifiableImageCount: number;
};

/** Semantic cues that must survive rendering exactly as a player sees them. */
export function getDeclaredBoardCues(visual: PuzzleVisual): DeclaredBoardCues {
  return visual.layers.reduce<DeclaredBoardCues>(
    (cues, layer) => {
      if (layer.kind === "pictogram") cues.concepts.push(layer.concept);
      else if (layer.kind === "image") {
        const concept = layer.concept?.trim();
        if (concept) cues.concepts.push(concept);
        else cues.unverifiableImageCount += 1;
      } else if (layer.kind === "text") cues.text.push(layer.content);
      else if (layer.kind === "operator") cues.operators.push(layer.symbol);
      return cues;
    },
    { concepts: [], text: [], operators: [], unverifiableImageCount: 0 }
  );
}

export function countDeclaredBoardCues(visual: PuzzleVisual): number {
  const cues = getDeclaredBoardCues(visual);
  return (
    cues.concepts.length + cues.text.length + cues.operators.length + cues.unverifiableImageCount
  );
}
