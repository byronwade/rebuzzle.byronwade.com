import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioPuzzleGenerator } from "../studio-puzzle-generator-client";

describe("StudioPuzzleGenerator initial form", () => {
  it("shows the brief, optional answer, difficulty, shared credits, and stable action", () => {
    const markup = renderToStaticMarkup(
      createElement(StudioPuzzleGenerator, {
        quota: { used: 1, limit: 3, remaining: 2 },
        onQuotaChange: jest.fn(),
        onUseDraft: jest.fn(),
      })
    );

    expect(markup).toContain("Topic or brief");
    expect(markup).toContain("Fixed answer (optional)");
    expect(markup).toContain("Difficulty");
    expect(markup).toContain("Credits are shared with image tiles");
    expect(markup).toContain("One credit drafts two ideas");
    expect(markup).toContain("Generate 2 ideas");
  });
});
