const generateAIObject = jest.fn();

jest.mock("../../../client", () => ({ generateAIObject }));

import { INK_PICTOGRAM_STYLE_ID } from "../../visual/style";
import { critiqueCandidate } from "../critique";

const input = {
  rebusPuzzle: "key over key",
  answer: "keynote",
  explanation: "A positional phrase.",
  hints: ["Look at the layout."],
  techniqueId: "positional_phrase",
  difficulty: 5,
  tierLabel: "Hard",
  unicodeFallback: "key\nkey",
  pictogramConcepts: ["key"],
};

const modelResponse = {
  verdict: "ship" as const,
  summary: "Clear and fair",
  strengths: ["Concrete cue"],
  flaws: [],
  reviseInstructions: [],
  falseLeadQuality: 85,
  ahaPredicted: 84,
  creativityScore: 80,
  iconRecognizability: 90,
  overusedTrope: false,
};

describe("critique source tracking", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks a successful model critique as actionable model evidence", async () => {
    generateAIObject.mockResolvedValue(modelResponse);

    await expect(critiqueCandidate(input)).resolves.toMatchObject({
      source: "model",
      verdict: "ship",
    });
  });

  it("marks an unavailable critique as fallback evidence", async () => {
    generateAIObject.mockRejectedValue(new Error("provider unavailable"));

    await expect(critiqueCandidate(input)).resolves.toMatchObject({
      source: "fallback",
      verdict: "revise",
    });
  });

  it("shows the actual board arrangement and text emphasis while omitting image payloads", async () => {
    generateAIObject.mockResolvedValue(modelResponse);
    await critiqueCandidate({
      ...input,
      visual: {
        styleId: INK_PICTOGRAM_STYLE_ID,
        mode: "composed",
        layout: "free",
        unicodeFallback: "BELL + TONE",
        layers: [
          {
            kind: "pictogram",
            concept: "bell",
            emojiFallback: "🔔",
            x: 20,
            y: 70,
            svg: "<svg>private</svg>",
          },
          { kind: "text", content: "TONE", emphasis: "tiny", x: 80, y: 20 },
          {
            kind: "image",
            concept: "music sheet",
            prompt: "draw a music sheet",
            alt: "music sheet",
            src: "data:image/png;base64,secret",
            x: 50,
            y: 50,
          },
        ],
      },
    });

    const prompt = generateAIObject.mock.calls[0][0].prompt as string;
    expect(prompt).toContain('"layout":"free"');
    expect(prompt).toContain('"emphasis":"tiny"');
    expect(prompt).toContain('"x":20,"y":70');
    expect(prompt).toContain('"concept":"music sheet"');
    expect(prompt).not.toContain("private");
    expect(prompt).not.toContain("base64");
    expect(prompt).toContain("competing interpretation");
    expect(prompt).toContain("visible cue");
  });
});
