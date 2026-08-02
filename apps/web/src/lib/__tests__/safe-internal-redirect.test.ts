import { safeInternalRedirect } from "../safe-internal-redirect";

describe("safeInternalRedirect", () => {
  it("keeps local paths and their query string", () => {
    expect(safeInternalRedirect("/playtest?from=panel")).toBe("/playtest?from=panel");
  });

  it.each([
    "https://evil.test",
    "//evil.test/path",
    "/\\evil.test",
    "javascript:alert(1)",
  ])("rejects unsafe redirect %s", (value) => {
    expect(safeInternalRedirect(value)).toBe("/");
  });

  it("uses the requested fallback when no destination exists", () => {
    expect(safeInternalRedirect(null, "/archive")).toBe("/archive");
  });
});
