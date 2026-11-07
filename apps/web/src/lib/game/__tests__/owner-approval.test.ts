import {
  computeOwnerContentHash,
  hasValidOwnerApproval,
  isOwnerApprovalRequired,
  normalizeAcceptedAnswers,
} from "../owner-approval";

const visual = {
  mode: "composed" as const,
  styleId: "ink-pictogram-v1",
  layout: "row" as const,
  unicodeFallback: "T E E F",
  layers: [{ kind: "text" as const, content: "TEEF", emphasis: "normal" as const }],
};

describe("normalizeAcceptedAnswers", () => {
  it("always includes the canonical answer, trims, lowercases, de-duplicates and sorts", () => {
    expect(
      normalizeAcceptedAnswers("Two Left Feet", ["  two  left feet", "2 left feet", ""])
    ).toEqual(["2 left feet", "two left feet"]);
  });
});

describe("computeOwnerContentHash", () => {
  const base = { answer: "two left feet", acceptedAnswers: ["2 left feet"], visual };

  it("is stable regardless of key order and accepted-answer order", () => {
    const reordered = {
      visual: {
        layers: visual.layers,
        unicodeFallback: "T E E F",
        layout: "row" as const,
        styleId: "ink-pictogram-v1",
        mode: "composed" as const,
      },
      acceptedAnswers: ["2 LEFT FEET", "two left feet"],
      answer: "two left feet",
    };
    expect(computeOwnerContentHash(reordered)).toBe(computeOwnerContentHash(base));
  });

  it("changes when the answer, accepted answers or board change", () => {
    const hash = computeOwnerContentHash(base);
    expect(computeOwnerContentHash({ ...base, answer: "two right feet" })).not.toBe(hash);
    expect(computeOwnerContentHash({ ...base, acceptedAnswers: [] })).not.toBe(hash);
    expect(
      computeOwnerContentHash({
        ...base,
        visual: { ...visual, layers: [{ kind: "text", content: "FEET", emphasis: "normal" }] },
      })
    ).not.toBe(hash);
  });
});

describe("hasValidOwnerApproval", () => {
  const payload = { answer: "two left feet", acceptedAnswers: ["2 left feet"], visual };

  it("accepts an approval whose hash matches the current content", () => {
    const approval = {
      approvedBy: "owner",
      approvedAt: new Date(),
      role: "backup" as const,
      contentHash: computeOwnerContentHash(payload),
    };
    expect(hasValidOwnerApproval(payload, approval)).toBe(true);
  });

  it("rejects a missing or stale approval", () => {
    expect(hasValidOwnerApproval(payload, undefined)).toBe(false);
    expect(
      hasValidOwnerApproval(payload, {
        approvedBy: "owner",
        approvedAt: new Date(),
        role: "backup",
        contentHash: "stale",
      })
    ).toBe(false);
  });
});

describe("isOwnerApprovalRequired", () => {
  const original = process.env.OWNER_APPROVAL_REQUIRED_FROM;
  afterEach(() => {
    if (original === undefined) delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    else process.env.OWNER_APPROVAL_REQUIRED_FROM = original;
  });

  it("is off when the variable is unset or malformed", () => {
    delete process.env.OWNER_APPROVAL_REQUIRED_FROM;
    expect(isOwnerApprovalRequired("2026-12-01")).toBe(false);
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "soon";
    expect(isOwnerApprovalRequired("2026-12-01")).toBe(false);
  });

  it("applies to the configured date key and later only", () => {
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "2026-12-01";
    expect(isOwnerApprovalRequired("2026-11-30")).toBe(false);
    expect(isOwnerApprovalRequired("2026-12-01")).toBe(true);
    expect(isOwnerApprovalRequired("2027-01-05")).toBe(true);
  });
});
