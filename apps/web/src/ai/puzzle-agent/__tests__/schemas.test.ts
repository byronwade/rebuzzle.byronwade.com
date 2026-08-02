import { normalizePuzzleAgentDraft, PuzzleAgentDraftSchema } from "../schemas";

const strictDraft = {
  puzzle: {
    rebusPuzzle: "👁️ + SCREAM",
    answer: "ice cream",
    difficulty: 4,
    difficultyLevel: "Hard" as const,
    explanation: "An eye supplies the I sound before the word scream.",
    category: "Food",
    hints: ["Look at the sounds.", "The first picture is an eye.", "Say both parts aloud."],
    techniqueId: "single_homophone",
    visual: {
      styleId: "ink-pictogram-v1" as const,
      mode: "composed" as const,
      layout: "row" as const,
      layers: [
        {
          kind: "pictogram" as const,
          concept: "eye",
          role: null,
          svg: null,
          assetId: null,
          source: null,
          seenAs: null,
          recognitionConfidence: null,
          recognitionProfiles: null,
          emojiFallback: "👁️",
        },
        { kind: "operator" as const, symbol: "+" },
        { kind: "text" as const, content: "SCREAM", emphasis: "normal" as const },
      ],
      unicodeFallback: "👁️ + SCREAM",
      caption: null,
    },
  },
  thinkingSummary: null,
  recommendations: [],
};

describe("PuzzleAgentDraftSchema", () => {
  it("requires provider-facing nullable keys instead of optional keys", () => {
    expect(PuzzleAgentDraftSchema.safeParse(strictDraft).success).toBe(true);

    const missingRole = structuredClone(strictDraft);
    (missingRole.puzzle.visual.layers[0] as { role?: string | null }).role = undefined;

    expect(PuzzleAgentDraftSchema.safeParse(missingRole).success).toBe(false);
  });

  it("normalizes strict nulls into the optional runtime puzzle shape", () => {
    const draft = PuzzleAgentDraftSchema.parse(strictDraft);
    const normalized = normalizePuzzleAgentDraft(draft);
    const pictogram = normalized.puzzle.visual.layers[0];

    expect(normalized.thinkingSummary).toBeUndefined();
    expect(pictogram).toEqual({
      kind: "pictogram",
      concept: "eye",
      emojiFallback: "👁️",
    });
  });

  it("requires and preserves a concrete concept for provider-generated image layers", () => {
    const imageDraft = structuredClone(strictDraft) as unknown as {
      puzzle: { visual: { layers: unknown[] } };
    };
    imageDraft.puzzle.visual.layers = [
      {
        kind: "image",
        concept: "car",
        prompt: "one red car on a plain background",
        alt: "red car",
        src: null,
      },
    ];

    const parsed = PuzzleAgentDraftSchema.safeParse(imageDraft);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(normalizePuzzleAgentDraft(parsed.data).puzzle.visual.layers[0]).toEqual({
      kind: "image",
      concept: "car",
      prompt: "one red car on a plain background",
      alt: "red car",
    });

    (imageDraft.puzzle.visual.layers[0] as { concept?: string }).concept = undefined;
    expect(PuzzleAgentDraftSchema.safeParse(imageDraft).success).toBe(false);
  });
});
