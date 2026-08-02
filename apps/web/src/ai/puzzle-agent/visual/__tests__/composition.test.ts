import { buildUnicodeFallback, countVisualParts, PuzzleVisualSchema } from "../composition";
import { sanitizePictogramSvg } from "../sanitize-svg";

describe("puzzle visual composition", () => {
  it("counts non-operator layers as parts", () => {
    const visual = PuzzleVisualSchema.parse({
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "🐝 + FORE",
      layers: [
        { kind: "pictogram", concept: "bee", emojiFallback: "🐝" },
        { kind: "operator", symbol: "+" },
        { kind: "text", content: "FORE", emphasis: "normal" },
      ],
    });
    expect(countVisualParts(visual)).toBe(2);
  });

  it("builds unicode fallback from mixed layers", () => {
    const fallback = buildUnicodeFallback([
      { kind: "pictogram", concept: "sun", emojiFallback: "☀️" },
      { kind: "operator", symbol: "+" },
      { kind: "text", content: "FLOWER", emphasis: "large" },
      { kind: "image", concept: "flowers", prompt: "a daisy field", alt: "flowers" },
    ]);
    expect(fallback).toContain("☀️");
    expect(fallback).toContain("FLOWER");
    expect(fallback).toContain("+");
  });

  it("stacks text characters in fallback", () => {
    const fallback = buildUnicodeFallback([{ kind: "text", content: "HI", emphasis: "stacked" }]);
    expect(fallback).toBe("H\nI");
  });
});

describe("sanitizePictogramSvg", () => {
  it("accepts a clean ink pictogram", () => {
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="none" stroke="#1a1f1c" stroke-width="2.25"/></svg>`;
    const out = sanitizePictogramSvg(raw);
    expect(out).toContain("<svg");
    expect(out).toContain('viewBox="0 0 64 64"');
  });

  it("strips scripts and event handlers", () => {
    const raw = `<svg viewBox="0 0 64 64" onclick="alert(1)"><script>alert(1)</script><circle cx="10" cy="10" r="5"/></svg>`;
    const out = sanitizePictogramSvg(raw);
    expect(out).not.toBeNull();
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it("rejects non-svg payloads", () => {
    expect(sanitizePictogramSvg("just text")).toBeNull();
    expect(sanitizePictogramSvg("<div>nope</div>")).toBeNull();
  });

  it("unwraps fenced markdown svg", () => {
    const raw = '```svg\n<svg viewBox="0 0 64 64"><rect width="10" height="10"/></svg>\n```';
    const out = sanitizePictogramSvg(raw);
    expect(out).toContain("<rect");
  });
});
