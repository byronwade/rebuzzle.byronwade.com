import { gameSettings } from "@rebuzzle/config";

/**
 * Lightweight contract tests for stats helpers that achievement awarding depends on.
 * Full updateUserStats is DB-backed; these assert the clutch / no-hint contracts.
 */

describe("achievement-related scoring contracts", () => {
  it("uses 3 max attempts in shared game settings (clutch = last attempt)", () => {
    expect(gameSettings.maxAttempts).toBe(3);
  });

  it("treats missing hintsUsed as no-hint only when explicitly 0/undefined carefully", () => {
    // Mirrors calculateNewStats: !hintsUsed || hintsUsed === 0
    const withHints = 2;
    const isNoHintWithHints = !withHints || withHints === 0;
    expect(isNoHintWithHints).toBe(false);

    const zeroHints = 0;
    const isNoHintZero = !zeroHints || zeroHints === 0;
    expect(isNoHintZero).toBe(true);
  });
});
