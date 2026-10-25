const generateText = jest.fn();
const generateAIObject = jest.fn();
const perplexitySearch = jest.fn(() => ({ type: "provider", id: "gateway.perplexity_search" }));

jest.mock("ai", () => ({ generateText, stepCountIs: jest.fn(() => "stop") }), { virtual: true });
jest.mock("../../quota-manager", () => ({ enforceQuota: jest.fn(async () => undefined) }));
jest.mock("../../client", () => {
  const gateway = Object.assign(
    jest.fn((id: string) => ({ modelId: id })),
    {
      tools: {
        perplexitySearch,
        exaSearch: jest.fn(),
        parallelSearch: jest.fn(),
      },
    }
  );
  return {
    getAiGateway: () => gateway,
    getGatewayModelChain: () => ["google/gemini-2.5-flash", "google/gemini-2.5-pro"],
    ensureGatewayKey: jest.fn(),
    assertGatewayAuthConfigured: jest.fn(),
    generateAIObject,
  };
});
jest.mock("../../config", () => {
  const actual = jest.requireActual("../../config");
  return {
    ...actual,
    AI_CONFIG: {
      ...actual.AI_CONFIG,
      research: { ...actual.AI_CONFIG.research, enabled: true, provider: "perplexity" },
    },
  };
});

import { z } from "zod";
import { AIBudgetExceededError } from "../../errors";
import { clearResearchCache, runWebResearch } from "../web-research";

const request = {
  subject: "under the weather",
  kind: "answer-phrase",
  objective: "verify",
  questions: ["What does it mean?"],
  seedQueries: ["under the weather meaning"],
  claimKinds: ["meaning", "origin"] as const,
  assessmentSchema: z.object({ familiarity: z.string() }),
  assessmentInstructions: "rate familiarity",
  operation: "research-test",
};

function searchSteps() {
  return {
    steps: [
      {
        toolResults: [
          {
            toolName: "web_search",
            input: { query: ["under the weather meaning"] },
            output: {
              id: "1",
              results: [
                {
                  url: "https://www.merriam-webster.com/dictionary/under%20the%20weather",
                  title: "Under the weather",
                  snippet: "under the weather: somewhat ill, recorded 1827",
                },
                {
                  url: "https://www.reddit.com/r/x",
                  title: "thread",
                  snippet: "under the weather lol",
                },
              ],
            },
          },
        ],
        sources: [],
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearResearchCache();
});

describe("runWebResearch", () => {
  it("searches, ranks, synthesizes, and corroborates", async () => {
    generateText.mockResolvedValue(searchSteps());
    generateAIObject.mockResolvedValue({
      summary: "It means ill.",
      claims: [
        { statement: "Under the weather means somewhat ill.", kind: "meaning", sourceIds: ["S1"] },
        { statement: "First used in 1700 by sailors.", kind: "origin", sourceIds: ["S1", "S7"] },
      ],
      gaps: [],
      assessment: { familiarity: "everyday" },
    });

    const dossier = await runWebResearch(request);

    expect(dossier.status).toBe("researched");
    expect(dossier.sources.map((s) => [s.id, s.tier])).toEqual([
      ["S1", "reference"],
      ["S2", "low"],
    ]);
    expect(dossier.claims.map((c) => c.support)).toEqual(["verified", "unsupported"]);
    expect(dossier.droppedCitations).toBe(1);
    expect(dossier.queries).toEqual(["under the weather meaning"]);
    expect(perplexitySearch).toHaveBeenCalledWith(
      expect.objectContaining({ searchLanguageFilter: ["en"] })
    );
    const synthesisPrompt = generateAIObject.mock.calls[0]?.[0]?.prompt as string;
    expect(synthesisPrompt).toContain("[S1] (reference · merriam-webster.com)");
  });

  it("caches research per subject", async () => {
    generateText.mockResolvedValue(searchSteps());
    generateAIObject.mockResolvedValue({
      summary: "s",
      claims: [],
      gaps: [],
      assessment: { familiarity: "common" },
    });
    await runWebResearch(request);
    await runWebResearch({ ...request, subject: "  Under the  WEATHER " });
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("fails soft when nothing is retrieved", async () => {
    generateText.mockResolvedValue({ steps: [] });
    const dossier = await runWebResearch(request);
    expect(dossier.status).toBe("failed");
    expect(dossier.reason).toBe("no sources retrieved");
    expect(generateAIObject).not.toHaveBeenCalled();
  });

  it("falls back to the next model, then fails soft", async () => {
    generateText.mockRejectedValue(new Error("tool not supported"));
    const dossier = await runWebResearch(request);
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(dossier.status).toBe("failed");
  });

  it("propagates hard budget errors", async () => {
    generateText.mockRejectedValue(new AIBudgetExceededError());
    await expect(runWebResearch(request)).rejects.toBeInstanceOf(AIBudgetExceededError);
  });

  it("skips empty subjects", async () => {
    const dossier = await runWebResearch({ ...request, subject: " " });
    expect(dossier.status).toBe("skipped");
  });
});
