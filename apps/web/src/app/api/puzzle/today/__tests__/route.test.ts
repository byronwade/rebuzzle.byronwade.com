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

it("requires a capable client before exposing a canonical clue", async () => {
  jest.mocked(getTodaysPuzzle).mockResolvedValue({
    success: true,
    puzzle: { id: "canonical", visual: { layers: [], canonicalBoard: { version: 1 } } },
  } as never);
  const response = await GET();
  expect(response.status).toBe(426);
  const body = await response.json();
  expect(body.updateRequired).toBe(true);
  expect(body.puzzle).toBeUndefined();
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});

it("allows a capable client to retrieve the daily puzzle", async () => {
  jest.mocked(getTodaysPuzzle).mockResolvedValue({
    success: true,
    puzzle: { id: "canonical", visual: { layers: [], canonicalBoard: { version: 1 } } },
  } as never);
  const response = await GET(
    new Request("https://rebuzzle.test/api/puzzle/today", {
      headers: { "X-Rebuzzle-Canonical-Board": "1" },
    })
  );
  expect(response.status).toBe(200);
  expect((await response.json()).puzzle.id).toBe("canonical");
});
