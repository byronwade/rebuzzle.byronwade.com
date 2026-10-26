import {
  assertPilotDailyAdmission,
  parseLivePilotTarget,
  safeDiagnosticError,
} from "../live-options";

describe("parseLivePilotTarget", () => {
  it("preserves four-tier canary mode by default", () => {
    expect(parseLivePilotTarget([])).toEqual({ mode: "tier-canary", targets: [] });
  });

  it("supports an explicit daily-only target or 7..9 sweep", () => {
    expect(parseLivePilotTarget(["--target-difficulty=8"])).toEqual({
      mode: "daily-pilot",
      targets: [8],
    });
    expect(parseLivePilotTarget(["--target-difficulty=7..9"])).toEqual({
      mode: "daily-pilot",
      targets: [7, 8, 9],
    });
  });

  it("rejects non-daily or malformed targets", () => {
    expect(() => parseLivePilotTarget(["--target-difficulty=6"])).toThrow(/7.*9/);
    expect(() => parseLivePilotTarget(["--target-difficulty=7.5"])).toThrow(/7.*9/);
    expect(() => parseLivePilotTarget(["--target-difficulty=7..10"])).toThrow(/7.*9/);
  });
});

it("redacts configured credentials from rejection diagnostics", () => {
  expect(
    safeDiagnosticError(new Error("Gateway failed for secret-token\nretry"), ["secret-token"])
  ).toBe("Gateway failed for [redacted] retry");
});

it("redacts a credential that crosses the diagnostic length boundary", () => {
  const prefix = "x".repeat(795);
  const error = new Error(`${prefix}secret-token and more detail`);
  expect(safeDiagnosticError(error, ["secret-token"])).toBe(`${prefix}[reda`);
  expect(safeDiagnosticError(error, ["secret-token"])).not.toContain("secre");
});

it("redacts a long credential before truncating the diagnostic", () => {
  const token = `token-${"s".repeat(900)}`;
  expect(safeDiagnosticError(new Error(`Gateway failed: ${token}`), [token])).toBe(
    "Gateway failed: [redacted]"
  );
});

it("rejects policy-blocked daily pilot results but preserves tier canary semantics", () => {
  const admission = { id: "attempt-01-evil", admitted: false, blockers: ["Needs layered cues"] };
  expect(() => assertPilotDailyAdmission("daily-pilot", admission)).toThrow(/Needs layered cues/);
  expect(() => assertPilotDailyAdmission("tier-canary", admission)).not.toThrow();
});
