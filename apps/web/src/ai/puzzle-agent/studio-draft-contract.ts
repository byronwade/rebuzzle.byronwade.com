import type { ApexCandidate } from "./apex/types";
import type { PuzzleVisual, VisualLayer } from "./visual/composition";

export type StudioQualification = {
  status: "passed" | "needs_review" | "pending";
  issues: string[];
};

export type StudioPuzzleDraft = {
  id: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  visual: PuzzleVisual;
  qualification: StudioQualification;
};

export type StudioPuzzleEditorValues = {
  draftId: undefined;
  title: string;
  answer: string;
  explanation: string;
  hints: [string, string, string];
  techniqueId: string;
  difficulty: number;
  layout: PuzzleVisual["layout"];
  freeCanvasHeight?: number;
  layers: VisualLayer[];
};

const MAX_QUALIFICATION_ISSUES = 4;
const MAX_QUALIFICATION_ISSUE_LENGTH = 160;

/** Serialize only creator-facing puzzle fields and concise qualification evidence. */
export function toStudioPuzzleDraft(
  candidate: ApexCandidate,
  qualification: StudioQualification
): StudioPuzzleDraft {
  return {
    id: candidate.id,
    answer: candidate.answer,
    explanation: candidate.explanation,
    hints: candidate.hints.slice(0, 3),
    techniqueId: candidate.techniqueId,
    difficulty: candidate.difficulty,
    visual: candidate.visual,
    qualification: {
      status: qualification.status,
      issues: qualification.issues.slice(0, MAX_QUALIFICATION_ISSUES).map((issue) =>
        issue
          .replace(/[\r\n\t]+/g, " ")
          .trim()
          .slice(0, MAX_QUALIFICATION_ISSUE_LENGTH)
      ),
    },
  };
}

/** Turn a selected generated draft into a clean Studio editor state. */
export function toStudioEditorValues(draft: StudioPuzzleDraft): StudioPuzzleEditorValues {
  const [first = "", second = "", third = ""] = draft.hints;
  return {
    draftId: undefined,
    title: "",
    answer: draft.answer,
    explanation: draft.explanation,
    hints: [first, second, third],
    techniqueId: draft.techniqueId,
    difficulty: draft.difficulty,
    layout: draft.visual.layout,
    ...(draft.visual.freeCanvasHeight ? { freeCanvasHeight: draft.visual.freeCanvasHeight } : {}),
    layers: draft.visual.layers.map((layer) => ({ ...layer })),
  };
}
