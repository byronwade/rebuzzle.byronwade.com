import { shouldAutoInitializeIndexes } from "../mongodb";

describe("MongoDB automatic index bootstrap boundary", () => {
  it("is enabled in local development", () => {
    expect(shouldAutoInitializeIndexes({ NODE_ENV: "development" })).toBe(true);
  });

  it("is disabled in production unless explicitly opted in", () => {
    expect(shouldAutoInitializeIndexes({ NODE_ENV: "production" })).toBe(false);
    expect(
      shouldAutoInitializeIndexes({ NODE_ENV: "production", REBUZZLE_AUTO_INDEXES: "1" })
    ).toBe(true);
  });

  it("is disabled for explicit read-only operations", () => {
    expect(shouldAutoInitializeIndexes({ REBUZZLE_SKIP_AUTO_INDEXES: "1" })).toBe(false);
  });

  it("is disabled in Next production builds", () => {
    expect(shouldAutoInitializeIndexes({ NEXT_PHASE: "phase-production-build" })).toBe(false);
    expect(shouldAutoInitializeIndexes({ npm_lifecycle_event: "build" })).toBe(false);
  });
});
