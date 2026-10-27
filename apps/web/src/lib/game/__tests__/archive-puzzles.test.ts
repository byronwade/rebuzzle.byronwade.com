import { isPublishedPastPuzzle } from "../archive-puzzles";

it("accepts a published puzzle only when its UTC publication date is before the viewer's daily date", () => {
  expect(
    isPublishedPastPuzzle(
      { active: true, publishedAt: new Date("2026-10-25T23:59:59.999Z") },
      "2026-10-26"
    )
  ).toBe(true);

  expect(
    isPublishedPastPuzzle(
      { active: true, publishedAt: new Date("2026-10-26T00:00:00.000Z") },
      "2026-10-26"
    )
  ).toBe(false);

  expect(
    isPublishedPastPuzzle(
      { active: true, publishedAt: new Date("2026-10-27T00:00:00.000Z") },
      "2026-10-26"
    )
  ).toBe(false);
});

it("excludes inactive, unpublished, invalid-date, and malformed-puzzle records", () => {
  expect(
    isPublishedPastPuzzle({ active: false, publishedAt: new Date("2026-10-25Z") }, "2026-10-26")
  ).toBe(false);
  expect(isPublishedPastPuzzle({ active: true, publishedAt: null }, "2026-10-26")).toBe(false);
  expect(
    isPublishedPastPuzzle({ active: true, publishedAt: new Date("not-a-date") }, "2026-10-26")
  ).toBe(false);
  expect(
    isPublishedPastPuzzle({ active: true, publishedAt: new Date("2026-10-25Z") }, "2026-02-30")
  ).toBe(false);
});
