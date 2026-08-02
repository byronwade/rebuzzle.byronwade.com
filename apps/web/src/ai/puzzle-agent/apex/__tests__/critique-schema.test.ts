import { CritiqueProviderSchema } from "../types";

const providerCritique = {
  verdict: "ship" as const,
  summary: "A clean and recognizable mechanism",
  strengths: ["Clear visual"],
  flaws: [],
  reviseInstructions: [],
  falseLeadQuality: 72,
  ahaPredicted: 84,
  creativityScore: null,
  iconRecognizability: null,
  overusedTrope: null,
};

describe("CritiqueProviderSchema", () => {
  it("requires nullable provider fields under strict structured output", () => {
    expect(CritiqueProviderSchema.safeParse(providerCritique).success).toBe(true);

    const missingCreativity = { ...providerCritique } as Partial<typeof providerCritique>;
    missingCreativity.creativityScore = undefined;

    expect(CritiqueProviderSchema.safeParse(missingCreativity).success).toBe(false);
  });
});
