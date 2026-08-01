import {
  extractPhraseSeeds,
  formatCulturalPulseForPrompt,
  type CulturalPulse,
  type CulturalSignal,
} from "../cultural-pulse";

describe("cultural pulse helpers", () => {
  const signals: CulturalSignal[] = [
    {
      title: 'Community loves "spill the tea" again',
      source: "reddit",
      score: 400,
    },
    {
      title: "Hit the ground running — founders debate the idiom",
      source: "hackernews",
      score: 220,
    },
    {
      title: "Kraken IPO by ___ ?",
      source: "polymarket",
      score: 30,
    },
  ];

  it("extracts quoted and idiom-shaped phrase seeds", () => {
    const seeds = extractPhraseSeeds(signals, 6);
    expect(seeds.some((s) => s.includes("spill the tea"))).toBe(true);
    expect(seeds.length).toBeGreaterThan(0);
  });

  it("formats a prompt block for Eve", () => {
    const pulse: CulturalPulse = {
      query: "idioms",
      windowDays: 30,
      engine: "hybrid",
      sourcesUsed: ["last30days", "hackernews"],
      signals,
      phraseSeeds: ["spill the tea", "hit the ground running"],
      promptBlock: "",
    };
    pulse.promptBlock = formatCulturalPulseForPrompt(pulse);
    expect(pulse.promptBlock).toContain("Cultural pulse");
    expect(pulse.promptBlock).toContain("spill the tea");
    expect(pulse.promptBlock).toContain("INSPIRATION");
  });

  it("handles empty signals", () => {
    const block = formatCulturalPulseForPrompt({
      query: "x",
      windowDays: 30,
      engine: "builtin",
      sourcesUsed: [],
      signals: [],
      phraseSeeds: [],
      promptBlock: "",
    });
    expect(block).toMatch(/no fresh people-signals/i);
  });
});
