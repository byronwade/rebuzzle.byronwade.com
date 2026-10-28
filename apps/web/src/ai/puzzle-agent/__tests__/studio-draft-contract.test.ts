import type { ApexCandidate } from "../apex/types";
import { toStudioEditorValues, toStudioPuzzleDraft } from "../studio-draft-contract";

function candidate(): ApexCandidate {
  return {
    id: "studio-candidate-1",
    rebusPuzzle: "ONE over door",
    answer: "one way or another",
    difficulty: 7,
    difficultyLevel: "Evil",
    explanation: "The word one is placed above a door, showing one way.",
    category: "phrases",
    hints: ["Look at placement.", "Read the pieces together.", "It is a familiar phrase."],
    techniqueId: "positional_phrase",
    visual: {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "stack",
      unicodeFallback: "ONE\ndoor",
      layers: [{ kind: "text", content: "ONE", emphasis: "large" }],
    },
    fingerprint: "private-fingerprint",
    uniquenessScore: 91,
    noveltyEvidence: { private: "research" } as unknown as ApexCandidate["noveltyEvidence"],
    calibratedDifficulty: 7,
    inBand: true,
    isUnique: true,
    solvable: true,
    qualityOverall: 94,
    funScore: 88,
    answerSeed: "private-seed",
    boardRecognitionModels: ["private-model"],
    publishable: true,
    rejectReasons: ["private rejection"],
  };
}

describe("Studio draft contract", () => {
  it("returns only allowlisted puzzle fields and bounds qualification issues", () => {
    const draft = toStudioPuzzleDraft(candidate(), {
      status: "needs_review",
      issues: ["a".repeat(300), "issue two", "issue three", "issue four", "issue five"],
    });

    expect(Object.keys(draft).sort()).toEqual(
      [
        "answer",
        "difficulty",
        "explanation",
        "hints",
        "id",
        "qualification",
        "techniqueId",
        "visual",
      ].sort()
    );
    expect(draft.qualification.status).toBe("needs_review");
    expect(draft.qualification.issues).toHaveLength(4);
    expect(draft.qualification.issues[0]).toHaveLength(160);
    expect(JSON.stringify(draft)).not.toContain("private-fingerprint");
    expect(JSON.stringify(draft)).not.toContain("private-model");
    expect(JSON.stringify(draft)).not.toContain("private-seed");
    expect(JSON.stringify(draft)).not.toContain("private rejection");
  });

  it("maps a selected draft to a new editor state without a previous draft ID", () => {
    const draft = toStudioPuzzleDraft(candidate(), { status: "passed", issues: [] });

    expect(toStudioEditorValues(draft)).toEqual({
      draftId: undefined,
      title: "",
      answer: "one way or another",
      explanation: "The word one is placed above a door, showing one way.",
      hints: ["Look at placement.", "Read the pieces together.", "It is a familiar phrase."],
      techniqueId: "positional_phrase",
      difficulty: 7,
      layout: "stack",
      layers: draft.visual.layers,
    });
  });

  it("preserves an expanded free canvas when loading a generated draft", () => {
    const source = candidate();
    const draft = toStudioPuzzleDraft(
      { ...source, visual: { ...source.visual, freeCanvasHeight: 876 } },
      { status: "passed", issues: [] }
    );

    expect(toStudioEditorValues(draft).freeCanvasHeight).toBe(876);
  });
});
