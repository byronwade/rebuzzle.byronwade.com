jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/app/actions/puzzleGenerationActions", () => ({ getTodaysPuzzle: jest.fn() }));

import { getTodaysPuzzle } from "@/app/actions/puzzleGenerationActions";
import { GET } from "../route";

it("publishes rendering fields without solution or authoring metadata", async () => {
  jest.mocked(getTodaysPuzzle).mockResolvedValue({
    success: true,
    puzzle: {
      id: "p",
      puzzle: "clue",
      answer: "secret",
      visual: {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        unicodeFallback: "clue",
        caption: "secret",
        layers: [
          {
            kind: "pictogram",
            svg: "<svg/>",
            emojiFallback: "🔑",
            concept: "secret",
            role: "secret",
            x: 20,
            y: 30,
          },
          { kind: "text", content: "HI", emphasis: "large" },
        ],
      },
    },
  } as never);
  const body = await (await GET()).json();
  expect(body.puzzle.visual).toEqual({
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout: "row",
    unicodeFallback: "clue",
    layers: [
      { kind: "pictogram", svg: "<svg/>", emojiFallback: "🔑", x: 20, y: 30 },
      { kind: "text", content: "HI", emphasis: "large" },
    ],
  });
  expect(JSON.stringify(body)).not.toContain("secret");
});
