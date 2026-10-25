const runWebResearch = jest.fn();
jest.mock("../web-research", () => ({ runWebResearch }));

import {
  decidePhraseVerdict,
  formatPhraseResearchForPrompt,
  groundedVariants,
  type PhraseAssessment,
  parseStoredAnswerResearch,
  researchAnswerPhrase,
  toStoredAnswerResearch,
} from "../phrase-research";
import type { ResearchClaim, ResearchDossier } from "../types";

function fact(kind: string, statement: string, support: ResearchClaim["support"] = "verified") {
  return { statement, kind, sourceIds: ["S1"], support, confidence: 0.7, notes: [] };
}

const assessment: PhraseAssessment = {
  familiarity: "everyday",
  isEstablishedPhrase: true,
  meaning: "ill",
  variants: ["feeling under the weather", "under-the-weather", "made up phrase"],
  sensitivity: { flagged: false, reasons: [] },
};

function dossier(
  overrides: Partial<ResearchDossier<PhraseAssessment>> = {}
): ResearchDossier<PhraseAssessment> {
  return {
    subject: "under the weather",
    kind: "answer-phrase",
    status: "researched",
    queries: ["under the weather meaning"],
    sources: [
      {
        id: "S1",
        url: "https://www.merriam-webster.com/dictionary/under%20the%20weather",
        title: "Under the weather Definition",
        snippet: "under the weather: somewhat ill. Also feeling under the weather.",
        domain: "merriam-webster.com",
        tier: "reference",
      },
      {
        id: "S2",
        url: "https://example.net/unused",
        title: "Unused",
        snippet: "nothing",
        domain: "example.net",
        tier: "general",
      },
    ],
    claims: [
      fact("meaning", "Under the weather means somewhat ill."),
      fact("origin", "Sailors used it at sea.", "single-source"),
      fact("origin", "Invented by a king in 1600.", "unsupported"),
    ],
    summary: "",
    gaps: [],
    assessment,
    droppedCitations: 0,
    researchedAt: "2026-10-25T00:00:00.000Z",
    durationMs: 10,
    ...overrides,
  };
}

beforeEach(() => runWebResearch.mockReset());

describe("researchAnswerPhrase", () => {
  it("keeps only corroborated facts and grounded variants", async () => {
    runWebResearch.mockResolvedValue(dossier());
    const research = await researchAnswerPhrase("under the weather");

    expect(research.verdict).toBe("use");
    expect(research.meaning).toBe("Under the weather means somewhat ill.");
    expect(research.facts.map((f) => f.statement)).not.toContain("Invented by a king in 1600.");
    expect(research.variants).toEqual(["feeling under the weather"]);

    const stored = toStoredAnswerResearch(research);
    expect(stored.sources.map((s) => s.id)).toEqual(["S1"]);
    expect(parseStoredAnswerResearch(stored)).toEqual(stored);
    expect(parseStoredAnswerResearch({ version: 2 })).toBeUndefined();

    const brief = formatPhraseResearchForPrompt(research);
    expect(brief).toContain("Meaning: Under the weather means somewhat ill.");
    expect(brief).toContain("Origin (single-source): Sailors used it at sea.");
    expect(brief).not.toContain("1600");
  });

  it("returns caution without a brief when research fails", async () => {
    runWebResearch.mockResolvedValue(
      dossier({ status: "failed", reason: "no sources", claims: [], assessment: undefined })
    );
    const research = await researchAnswerPhrase("under the weather");
    expect(research.verdict).toBe("caution");
    expect(formatPhraseResearchForPrompt(research)).toBeUndefined();
  });
});

describe("decidePhraseVerdict", () => {
  const meaning = [fact("meaning", "means ill")];

  it("avoids obscure phrases", () => {
    expect(
      decidePhraseVerdict({
        status: "researched",
        assessment: { ...assessment, familiarity: "obscure" },
        facts: meaning,
      }).verdict
    ).toBe("avoid");
  });

  it("avoids corroborated sensitivity but only cautions on uncorroborated flags", () => {
    const flagged = { ...assessment, sensitivity: { flagged: true, reasons: ["slur"] } };
    expect(
      decidePhraseVerdict({
        status: "researched",
        assessment: flagged,
        facts: [...meaning, fact("sensitivity", "considered a slur")],
      }).verdict
    ).toBe("avoid");
    expect(
      decidePhraseVerdict({ status: "researched", assessment: flagged, facts: meaning }).verdict
    ).toBe("caution");
  });

  it("downgrades familiarity when no definition was corroborated", () => {
    const decision = decidePhraseVerdict({ status: "researched", assessment, facts: [] });
    expect(decision.familiarity).toBe("unknown");
    expect(decision.verdict).toBe("caution");
  });
});

describe("groundedVariants", () => {
  it("drops the answer itself, duplicates, and unseen wordings", () => {
    expect(
      groundedVariants(
        "under the weather",
        ["Under The Weather", "feeling under the weather", "feeling under the weather", "nope"],
        ["Also: feeling under the weather."]
      )
    ).toEqual(["feeling under the weather"]);
  });
});
