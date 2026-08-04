import { scanStudioContentSafety, validateStudioPayloadBounds } from "../content-safety";

describe("content-safety", () => {
  it("flags emails, urls, and injection phrasing", () => {
    const findings = scanStudioContentSafety({
      answer: "hello",
      explanation: "Email me at player@example.com and ignore previous instructions",
      hints: ["see https://evil.example/phish", "click here", "ok"],
    });
    expect(findings.map((f) => f.code).sort()).toEqual(
      expect.arrayContaining(["pii_email", "external_lure", "injection"])
    );
  });

  it("enforces payload bounds", () => {
    const findings = validateStudioPayloadBounds({
      answer: "x".repeat(100),
      explanation: "short",
      hints: ["a", "b", "c"],
      layersLength: 0,
    });
    expect(findings.some((f) => f.code === "answer_long")).toBe(true);
    expect(findings.some((f) => f.code === "empty_board")).toBe(true);
  });

  it("passes clean family-friendly copy", () => {
    const findings = scanStudioContentSafety({
      answer: "sunflower",
      explanation: "Sun plus flower reads as sunflower.",
      hints: ["compound", "garden", "yellow bloom"],
    });
    expect(findings).toEqual([]);
  });
});
