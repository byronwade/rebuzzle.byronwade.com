import {
  fitBrandSvgToBoard,
  matchBrandInCatalog,
  resetSvglCache,
} from "../svgl";
import { SVGL_BRAND_SEED } from "../svgl-brands";

describe("SVGL brand catalog", () => {
  beforeEach(() => {
    resetSvglCache();
  });

  it("loads a substantial offline catalog", () => {
    expect(SVGL_BRAND_SEED.length).toBeGreaterThan(500);
  });

  it("matches exact brand titles without substring traps", () => {
    expect(matchBrandInCatalog("spotify", SVGL_BRAND_SEED)?.title).toMatch(/spotify/i);
    expect(matchBrandInCatalog("discord", SVGL_BRAND_SEED)?.title).toMatch(/discord/i);
    expect(matchBrandInCatalog("github", SVGL_BRAND_SEED)?.title).toMatch(/github/i);
    // "react" must not become Preact
    const react = matchBrandInCatalog("react", SVGL_BRAND_SEED);
    expect(react?.title.toLowerCase()).toBe("react");
  });

  it("returns null for unknown concepts", () => {
    expect(matchBrandInCatalog("zzznonsensebrand99", SVGL_BRAND_SEED)).toBeNull();
    expect(matchBrandInCatalog("a", SVGL_BRAND_SEED)).toBeNull();
  });

  it("fits brand SVG into 64×64 board while keeping fills", () => {
    const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <path d="M10 10h80v80H10z" fill="#1DB954"/>
    </svg>`;
    const fitted = fitBrandSvgToBoard(raw);
    expect(fitted).toBeTruthy();
    expect(fitted).toContain('viewBox="0 0 64 64"');
    expect(fitted).toContain("#1DB954");
    expect(fitted).toContain("scale(");
  });
});
