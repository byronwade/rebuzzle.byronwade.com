jest.mock("@/ai/client", () => ({
  generateAIObject: jest.fn(),
}));

import { type GeneratedBlogPost, getBlogEditorialIssues } from "@/ai/services/blog-generator";

function validPost(overrides: Partial<GeneratedBlogPost> = {}): GeneratedBlogPost {
  return {
    title: "A Sound-Based Rebus Challenge",
    slug: "a-sound-based-rebus-challenge",
    excerpt: "Learn a practical, spoiler-free method for approaching today's visual word puzzle.",
    content: [
      "# A Sound-Based Rebus Challenge",
      "",
      "## Introduction",
      "Listen closely to the symbols without jumping to a conclusion.",
      "",
      "## Puzzle Analysis",
      "The two compact clues reward phonetic thinking.",
      "",
      "## The Solution",
      "The answer is **before**: bee supplies the sound ‘be,’ while four supplies ‘fore.’",
      "",
      "## Frequently Asked Questions",
      "Practice by listing the literal and spoken meaning of each clue.",
    ].join("\n"),
    sections: {
      introduction: "Listen closely to the symbols without jumping to a conclusion.",
      puzzleAnalysis: "The two compact clues reward phonetic thinking.",
      solvingStrategy: "Name each symbol, say each name aloud, and combine likely homophones.",
      puzzleHistory: "Rebuses have long combined pictures and sounds to encode language.",
      solution: "The answer is before: bee gives ‘be,’ while four gives ‘fore.’",
      callToAction: "Try another daily puzzle and reuse the same sound-first process.",
      faq: [
        {
          question: "What should I inspect first?",
          answer: "Start with the literal name and spoken sound of every symbol.",
        },
      ],
    },
    seoMetadata: {
      focusKeyword: "rebus puzzle strategy",
      secondaryKeywords: ["phonetic rebus"],
      metaDescription:
        "Learn a practical, spoiler-free method for approaching today's visual word puzzle.",
      readingTime: 4,
      wordCount: 800,
    },
    ...overrides,
  };
}

describe("getBlogEditorialIssues", () => {
  it("accepts an answer that appears only in the dedicated solution section", () => {
    expect(getBlogEditorialIssues(validPost(), "before")).toEqual([]);
  });

  it("rejects answer leakage in metadata, structured sections, FAQs, and markdown", () => {
    const post = validPost({
      excerpt: "Discover how the symbols spell before.",
      content: "## Introduction\nThe answer is before.\n\n## The Solution\nThe answer is before.",
      sections: {
        ...validPost().sections,
        introduction: "This introduction reveals before.",
        faq: [{ question: "Is it before?", answer: "Yes." }],
      },
    });

    expect(getBlogEditorialIssues(post, "before")).toEqual(
      expect.arrayContaining([
        "excerpt reveals the answer",
        "introduction reveals the answer",
        "FAQ 1 reveals the answer",
        "full content reveals the answer outside the Solution section",
      ])
    );
  });

  it("requires a solution heading and the answer inside that section", () => {
    const missingHeading = validPost({ content: "# Puzzle\nA completely spoiler-free article." });
    expect(getBlogEditorialIssues(missingHeading, "before")).toContain(
      "full content is missing a dedicated Solution heading"
    );

    const missingAnswer = validPost({
      content: "## Introduction\nSpoiler-free setup.\n\n## The Solution\nCombine the two sounds.",
    });
    expect(getBlogEditorialIssues(missingAnswer, "before")).toContain(
      "Solution section does not contain the answer"
    );
  });

  it("uses answer word boundaries and rejects obvious repeated copy", () => {
    expect(
      getBlogEditorialIssues(
        validPost({
          excerpt: "Think beforehand about how each visual clue could sound when spoken aloud.",
        }),
        "before"
      )
    ).toEqual([]);

    expect(
      getBlogEditorialIssues(
        validPost({ content: `${validPost().content}\nA rebus puzzle puzzle should be revised.` }),
        "before"
      )
    ).toContain('full content contains the repeated phrase "puzzle puzzle"');
  });
});
