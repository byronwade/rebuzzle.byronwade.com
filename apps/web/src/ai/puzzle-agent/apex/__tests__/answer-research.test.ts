jest.mock("../../../research/web-research", () => ({ runWebResearch: jest.fn() }));

import type { PhraseResearch, PhraseVerdict } from "../../../research/phrase-research";
import { screenAnswerSeedsWithResearch } from "../answer-research";
import type { PhraseBankEntry } from "../types";

const cue = [{ kind: "catalog" as const, concept: "key", role: "word-part" as const }];

const entries: PhraseBankEntry[] = ["keyboard", "keystone", "keyhole", "keynote"].map((answer) => ({
  answer,
  category: "compound",
  difficultyHint: 5,
  techniqueAffinity: ["simple_compound"],
  visualCues: cue,
}));

function research(answer: string, verdict: PhraseVerdict): PhraseResearch {
  return {
    answer,
    dossier: {
      subject: answer,
      kind: "answer-phrase",
      status: "researched",
      queries: [],
      sources: [
        {
          id: "S1",
          url: "https://www.merriam-webster.com/x",
          title: "Def",
          snippet: `${answer} definition`,
          domain: "merriam-webster.com",
          tier: "reference",
        },
      ],
      claims: [],
      summary: "",
      gaps: [],
      droppedCitations: 0,
      researchedAt: "2026-10-25T00:00:00.000Z",
      durationMs: 1,
    },
    familiarity: verdict === "avoid" ? "obscure" : "everyday",
    meaning: `${answer} is a thing`,
    variants: [],
    facts: [
      {
        statement: `${answer} is a thing`,
        kind: "meaning",
        sourceIds: ["S1"],
        support: "verified",
        confidence: 0.7,
        notes: [],
      },
    ],
    verdict,
    verdictReasons: verdict === "avoid" ? ["obscure"] : [],
  };
}

const base = {
  entries,
  techniqueIds: ["simple_compound"],
  count: 2,
  requireVisualCuePlan: true,
  enabled: true,
  gate: true,
  maxReplacements: 3,
  deadlineMs: 1000,
};

describe("screenAnswerSeedsWithResearch", () => {
  it("returns plain seeds when research is disabled", async () => {
    const researcher = jest.fn();
    const result = await screenAnswerSeedsWithResearch({ ...base, enabled: false, researcher });
    expect(result.seeds.map((s) => s.entry.answer)).toEqual(["keyboard", "keystone"]);
    expect(researcher).not.toHaveBeenCalled();
  });

  it("attaches a cited brief to each researched seed", async () => {
    const researcher = jest.fn(async (answer: string) => research(answer, "use"));
    const result = await screenAnswerSeedsWithResearch({ ...base, researcher });
    expect(result.seeds).toHaveLength(2);
    expect(result.seeds[0]?.brief).toContain("WEB-RESEARCHED ANSWER BRIEF");
    expect(result.seeds[0]?.research?.verdict).toBe("use");
    expect(result.researched).toBe(2);
  });

  it("swaps out seeds the evidence says to avoid", async () => {
    const researcher = jest.fn(async (answer: string) =>
      research(answer, answer === "keystone" ? "avoid" : "use")
    );
    const result = await screenAnswerSeedsWithResearch({ ...base, researcher });
    expect(result.seeds.map((s) => s.entry.answer)).toEqual(["keyboard", "keyhole"]);
    expect(result.rejected).toEqual([{ answer: "keystone", reasons: ["obscure"] }]);
    // keyboard is not researched twice
    expect(researcher).toHaveBeenCalledTimes(3);
  });

  it("keeps avoided seeds out even when the inventory runs dry", async () => {
    const researcher = jest.fn(async (answer: string) =>
      research(answer, answer === "keyboard" ? "use" : "avoid")
    );
    const result = await screenAnswerSeedsWithResearch({ ...base, researcher });
    expect(result.seeds.map((s) => s.entry.answer)).toEqual(["keyboard"]);
    expect(result.inventoryShort).toBe(false);
  });

  it("keeps each surviving seed's reserved technique after filtering", async () => {
    const mixed: PhraseBankEntry[] = [
      { ...entries[0], answer: "keyboard", techniqueAffinity: ["simple_compound"] },
      { ...entries[1], answer: "keystone", techniqueAffinity: ["positional_phrase"] },
    ] as PhraseBankEntry[];
    const researcher = jest.fn(async (answer: string) =>
      research(answer, answer === "keyboard" ? "avoid" : "use")
    );
    const result = await screenAnswerSeedsWithResearch({
      ...base,
      entries: mixed,
      techniqueIds: ["simple_compound", "positional_phrase"],
      researcher,
    });
    expect(result.seeds.map((s) => [s.entry.answer, s.techniqueId])).toEqual([
      ["keystone", "positional_phrase"],
    ]);
  });

  it("replaces only the avoided slot and keeps later reservations", async () => {
    const mixed: PhraseBankEntry[] = [
      { ...entries[0], answer: "keyboard", techniqueAffinity: ["simple_compound"] },
      { ...entries[1], answer: "keystone", techniqueAffinity: ["positional_phrase"] },
      { ...entries[2], answer: "keyhole", techniqueAffinity: ["letter_math"] },
    ] as PhraseBankEntry[];
    const researcher = jest.fn(async (answer: string) =>
      research(answer, answer === "keystone" ? "avoid" : "use")
    );
    const result = await screenAnswerSeedsWithResearch({
      ...base,
      entries: mixed,
      techniqueIds: ["simple_compound", "positional_phrase", "letter_math"],
      count: 3,
      researcher,
    });
    expect(result.seeds.map((s) => [s.entry.answer, s.techniqueId])).toEqual([
      ["keyboard", "simple_compound"],
      ["keyhole", "letter_math"],
    ]);
    expect(result.rejected.map((r) => r.answer)).toEqual(["keystone"]);
  });

  it("only reports without the gate", async () => {
    const researcher = jest.fn(async (answer: string) => research(answer, "avoid"));
    const result = await screenAnswerSeedsWithResearch({ ...base, gate: false, researcher });
    expect(result.seeds.map((s) => s.entry.answer)).toEqual(["keyboard", "keystone"]);
    expect(result.rejected).toEqual([]);
  });

  it("generates without a brief when research misses the deadline", async () => {
    const researcher = jest.fn(() => new Promise<PhraseResearch>(() => undefined));
    const result = await screenAnswerSeedsWithResearch({ ...base, deadlineMs: 5, researcher });
    expect(result.seeds.map((s) => s.brief)).toEqual([undefined, undefined]);
  });

  it("flags a short inventory before researching", async () => {
    const researcher = jest.fn();
    const result = await screenAnswerSeedsWithResearch({ ...base, count: 9, researcher });
    expect(result.inventoryShort).toBe(true);
    expect(researcher).not.toHaveBeenCalled();
  });
});
