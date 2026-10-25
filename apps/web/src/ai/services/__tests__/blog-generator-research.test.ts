const generateAIObject = jest.fn();
const gatherBlogResearch = jest.fn();

jest.mock("@/ai/client", () => ({ generateAIObject }));
jest.mock("@/ai/research/blog-research", () => {
  const actual = jest.requireActual("@/ai/research/blog-research");
  return { ...actual, gatherBlogResearch };
});

import { generateBlogPost, researchNotesForPost } from "@/ai/services/blog-generator";

function aiResponse(history: string) {
  return {
    title: "A Sound-Based Rebus Challenge",
    metaDescription:
      "A spoiler-free walkthrough of yesterday's visual word puzzle and how to read it.",
    focusKeyword: "rebus puzzle",
    secondaryKeywords: ["phonetic rebus"],
    sections: {
      introduction: "Listen to the symbols.",
      puzzleAnalysis: "Two compact clues.",
      solvingStrategy: "Say each name aloud.",
      puzzleHistory: history,
      solution: "The answer is before.",
      callToAction: "Play today's puzzle.",
    },
    faq: [
      { question: "Where do I start?", answer: "Name every symbol." },
      { question: "Is sound important?", answer: "Yes, say it aloud." },
      { question: "Any tips?", answer: "Look for homophones." },
    ],
    fullContent: [
      "## Introduction",
      "Listen to the symbols without jumping to a conclusion. ".repeat(4),
      "## History",
      history,
      "## The Solution",
      "The answer is before: bee gives be, four gives fore.",
      "## Frequently Asked Questions",
      "Name every symbol first.",
    ].join("\n"),
  };
}

const puzzle = {
  puzzle: "🐝 4",
  rebusPuzzle: "🐝 4",
  puzzleType: "rebus",
  answer: "before",
  difficulty: 5,
  publishedAt: "2026-10-24T00:00:00.000Z",
  metadata: { answerResearch: { version: 1 } },
};

const pack = {
  status: "researched",
  facts: [
    {
      id: "F1",
      statement: "Rebuses were popular in 16th-century France.",
      scope: "format",
      kind: "history",
      support: "verified",
      sources: [
        { url: "https://www.britannica.com/topic/rebus", title: "Rebus", domain: "britannica.com" },
      ],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  gatherBlogResearch.mockResolvedValue(pack);
});

describe("generateBlogPost research grounding", () => {
  it("passes stored research in and puts the verified brief in the prompt", async () => {
    generateAIObject.mockResolvedValue(aiResponse("Rebuses were popular in 16th-century France."));
    const post = await generateBlogPost(puzzle);

    expect(gatherBlogResearch).toHaveBeenCalledWith({
      answer: "before",
      typeName: "Rebus",
      storedAnswerResearch: { version: 1 },
    });
    expect(generateAIObject.mock.calls[0][0].prompt).toContain(
      "[F1] Rebuses were popular in 16th-century France."
    );
    expect(post.research).toEqual({ status: "researched", facts: pack.facts, warnings: [] });
  });

  it("rewrites unverified dates and reports any that survive", async () => {
    generateAIObject.mockResolvedValue(aiResponse("The first rebus appeared in 1843."));
    const post = await generateBlogPost(puzzle);

    expect(generateAIObject).toHaveBeenCalledTimes(3);
    expect(generateAIObject.mock.calls[1][0].prompt).toContain(
      'mentions "1843" but no researched fact supports that date'
    );
    expect(post.research?.warnings).toEqual([
      'mentions "1843" but no researched fact supports that date',
    ]);
  });

  it("checks the meta description for unverified dates", async () => {
    generateAIObject.mockResolvedValue({
      ...aiResponse("Rebuses mix pictures and sounds."),
      metaDescription:
        "Discover how rebuses began in 1843 and learn a spoiler-free way to read the board.",
    });
    const post = await generateBlogPost(puzzle);
    expect(generateAIObject).toHaveBeenCalledTimes(3);
    expect(post.research?.warnings).toEqual([
      'mentions "1843" but no researched fact supports that date',
    ]);
  });

  it("still writes the post when research is unavailable", async () => {
    gatherBlogResearch.mockRejectedValue(new Error("search down"));
    generateAIObject.mockResolvedValue(aiResponse("Rebuses mix pictures and sounds."));
    const post = await generateBlogPost(puzzle);
    expect(post.research?.status).toBe("unavailable");
    expect(generateAIObject.mock.calls[0][0].prompt).toContain("Format history: no verified facts");
  });

  it("rebuilds research notes for an admin-edited draft", async () => {
    const notes = await researchNotesForPost(
      {
        title: "Edited",
        slug: "edited",
        excerpt: "An edited post.",
        content: "## History\nThe first rebus appeared in 1843.\n## The Solution\nbefore",
      },
      puzzle
    );
    expect(notes.facts).toEqual(pack.facts);
    expect(notes.warnings).toEqual(['mentions "1843" but no researched fact supports that date']);
  });
});
