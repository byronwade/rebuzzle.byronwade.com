const runWebResearch = jest.fn();
jest.mock("../web-research", () => ({ runWebResearch }));

import {
  type BlogResearchPack,
  formatBlogResearchForPrompt,
  formatBlogResearchNotes,
  gatherBlogResearch,
  getBlogResearchIssues,
} from "../blog-research";
import type { StoredAnswerResearch } from "../types";

const stored: StoredAnswerResearch = {
  version: 1,
  answer: "under the weather",
  status: "researched",
  verdict: "use",
  verdictReasons: [],
  familiarity: "everyday",
  meaning: "Means somewhat ill.",
  variants: [],
  facts: [
    { statement: "Means somewhat ill.", kind: "meaning", support: "verified", sourceIds: ["S1"] },
    {
      statement: "Recorded from 1827 in nautical use.",
      kind: "origin",
      support: "verified",
      sourceIds: ["S1"],
    },
  ],
  sources: [
    {
      id: "S1",
      url: "https://www.etymonline.com/word/weather",
      title: "weather",
      domain: "etymonline.com",
      tier: "reference",
    },
  ],
  researchedAt: "2026-10-24T00:00:00.000Z",
};

beforeEach(() => {
  runWebResearch.mockReset();
  runWebResearch.mockResolvedValue({
    subject: "rebus puzzles",
    kind: "puzzle-format-history",
    status: "researched",
    queries: [],
    sources: [
      {
        id: "S1",
        url: "https://www.britannica.com/topic/rebus",
        title: "Rebus",
        snippet: "Rebuses were popular in 16th-century France.",
        domain: "britannica.com",
        tier: "reference",
      },
    ],
    claims: [
      {
        statement: "Rebuses were popular in 16th-century France.",
        kind: "history",
        sourceIds: ["S1"],
        support: "verified",
        confidence: 0.7,
        notes: [],
      },
      {
        statement: "Invented in 1066.",
        kind: "origin",
        sourceIds: [],
        support: "unsupported",
        confidence: 0,
        notes: [],
      },
    ],
    summary: "",
    gaps: [],
    droppedCitations: 0,
    researchedAt: "2026-10-25T00:00:00.000Z",
    durationMs: 1,
  });
});

describe("gatherBlogResearch", () => {
  it("reuses stored answer research and adds verified format history", async () => {
    const pack = await gatherBlogResearch({
      answer: "under the weather",
      typeName: "Rebus",
      storedAnswerResearch: stored,
    });

    // Only the format-history search runs; the answer research is reused.
    expect(runWebResearch).toHaveBeenCalledTimes(1);
    expect(pack.status).toBe("researched");
    expect(pack.facts.map((f) => [f.id, f.scope])).toEqual([
      ["F1", "answer"],
      ["F2", "answer"],
      ["F3", "format"],
    ]);
    expect(pack.facts.map((f) => f.statement)).not.toContain("Invented in 1066.");

    const prompt = formatBlogResearchForPrompt(pack);
    expect(prompt).toContain("SPOILERS");
    expect(prompt).toContain("[F3] Rebuses were popular in 16th-century France.");
  });
});

describe("getBlogResearchIssues", () => {
  const pack: BlogResearchPack = {
    status: "researched",
    facts: [
      {
        id: "F1",
        statement: "Recorded from 1827 in nautical use.",
        scope: "answer",
        kind: "origin",
        support: "verified",
        sources: [],
      },
    ],
  };

  it("flags years no fact supports and exempts the puzzle date", () => {
    expect(
      getBlogResearchIssues(
        "Rebuses first appeared in 1843. The phrase dates to the 1820s and 1827. Played 2025-03-01.",
        pack,
        "2025-03-01"
      )
    ).toEqual([
      'mentions "1843" but no researched fact supports that date',
      'mentions "1820s" but no researched fact supports that date',
    ]);
  });

  it("accepts a decade when its base year is verified", () => {
    expect(getBlogResearchIssues("since the 1827s", pack, "yesterday")).toEqual([]);
  });
});

describe("formatBlogResearchNotes", () => {
  it("lists facts with links and warnings for the reviewer", () => {
    const lines = formatBlogResearchNotes({
      status: "partial",
      facts: [
        {
          id: "F1",
          statement: "Means ill.",
          scope: "answer",
          kind: "meaning",
          support: "verified",
          sources: [{ url: "https://m-w.com/x", title: "x", domain: "m-w.com" }],
        },
      ],
      warnings: ['mentions "1843" but no researched fact supports that date'],
    }).join("\n");
    expect(lines).toContain("## Research notes");
    expect(lines).toContain("**F1** (answer, verified): Means ill. — [m-w.com](https://m-w.com/x)");
    expect(lines).toContain("Unverified claims in the draft");
  });

  it("returns nothing without notes", () => {
    expect(formatBlogResearchNotes(undefined)).toEqual([]);
  });
});
