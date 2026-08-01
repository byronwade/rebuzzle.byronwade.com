import { applyDifficultyDelta } from "../apex/curriculum";
import {
  MECHANISM_TEMPLATES,
  REBUS_CRAFT_RULES,
  mechanismTemplateBrief,
  rebusCraftBrief,
} from "../rebus-craft";

describe("rebus craft research pack", () => {
  it("exposes craft rules and mechanism templates", () => {
    expect(REBUS_CRAFT_RULES.length).toBeGreaterThanOrEqual(5);
    expect(MECHANISM_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    expect(rebusCraftBrief()).toMatch(/Backform/i);
    expect(mechanismTemplateBrief()).toMatch(/compound_pair/);
  });
});

describe("applyDifficultyDelta", () => {
  it("nudges difficulty within 1–10", () => {
    expect(applyDifficultyDelta(5, 1)).toBe(6);
    expect(applyDifficultyDelta(5, -2)).toBe(3);
    expect(applyDifficultyDelta(10, 3)).toBe(10);
    expect(applyDifficultyDelta(1, -5)).toBe(1);
  });
});
