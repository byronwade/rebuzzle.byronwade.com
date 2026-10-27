jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn().mockResolvedValue("UTC") }));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/journey-timezone", () => ({ resolveStableJourneyTimeZone: jest.fn() }));
jest.mock("@/app/actions/puzzleGenerationActions", () => ({ getTodaysPuzzle: jest.fn() }));

import { getTodaysPuzzle } from "@/app/actions/puzzleGenerationActions";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { GET } from "../route";

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-26T03:30:00.000Z"));
  jest.mocked(getAuthenticatedUser).mockResolvedValue(null);
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("UTC");
});
afterEach(() => jest.useRealTimers());

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

it("selects the official puzzle by the authenticated account's stable reset zone", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "user-1" } as never);
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("America/Los_Angeles");
  jest.mocked(getTodaysPuzzle).mockResolvedValue({
    success: true,
    puzzle: { id: "daily", visual: { layers: [] } },
  } as never);

  const response = await GET(new Request("https://rebuzzle.test/api/puzzle/today"));

  expect(response.status).toBe(200);
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("user-1", "UTC");
  expect(getTodaysPuzzle).toHaveBeenCalledWith(undefined, "2026-10-25", { allowAiGenerate: false });
  expect((await response.json()).timeZone).toBe("America/Los_Angeles");
});
