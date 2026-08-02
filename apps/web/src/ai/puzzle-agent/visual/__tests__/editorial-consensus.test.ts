import {
  type EditorialReviewAttempt,
  editorialReviewPublishBlockers,
  summarizeEditorialReviewAttempts,
} from "../editorial-consensus";

const PROFILES = ["compact-320", "mobile-375", "desktop-768"] as const;

function acceptedAttempts(): EditorialReviewAttempt[] {
  return PROFILES.flatMap((profileId) =>
    ["vision-a", "vision-b"].map((model) => ({
      model,
      profileId,
      verdict: "publish" as const,
      confidence: 0.9,
      cueCoverage: 0.95,
      answerVisibleVerbatim: false,
      failureKinds: [],
      reason: "Every answer element is fairly encoded",
    }))
  );
}

describe("answer-aware screenshot editorial consensus", () => {
  it("accepts a confident independent majority across every profile", () => {
    const summary = summarizeEditorialReviewAttempts({
      attempts: acceptedAttempts(),
      expectedProfileIds: PROFILES,
      requiredVotes: 2,
      minConfidence: 0.68,
    });
    expect(summary.ok).toBe(true);
    expect(summary.acceptedProfiles).toBe(3);
    expect(
      editorialReviewPublishBlockers({
        editorialProfileCount: summary.profileCount,
        editorialAcceptedProfiles: summary.acceptedProfiles,
        editorialFailureKinds: summary.failureKinds,
        editorialReasons: summary.reasons,
      })
    ).toEqual([]);
  });

  it("does not let one stochastic outlier veto two independent approvals", () => {
    const attempts = PROFILES.flatMap((profileId) =>
      ["vision-a", "vision-b", "vision-c"].map((model, index) => ({
        model,
        profileId,
        verdict: index === 2 ? ("reject" as const) : ("publish" as const),
        confidence: 0.9,
        cueCoverage: index === 2 ? 0.65 : 0.95,
        answerVisibleVerbatim: false,
        failureKinds: index === 2 ? (["ambiguous"] as const) : [],
        reason:
          index === 2 ? "A weaker alternate may exist" : "Every answer element is fairly encoded",
      }))
    );
    const summary = summarizeEditorialReviewAttempts({
      attempts,
      expectedProfileIds: PROFILES,
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(summary.ok).toBe(true);
    expect(summary.acceptedProfiles).toBe(3);
    expect(summary.failureKinds).toEqual([]);
    expect(summary.reasons).toEqual([]);
  });

  it("rejects when two confident judges report a stronger alternate reading", () => {
    const attempts = acceptedAttempts();
    attempts[0] = {
      ...attempts[0]!,
      verdict: "reject",
      failureKinds: ["ambiguous"],
      strongestAlternate: "turn key",
      reason: "Turn key is a stronger reading than car key",
    };
    attempts.push({ ...attempts[0]!, model: "vision-c" });
    const summary = summarizeEditorialReviewAttempts({
      attempts,
      expectedProfileIds: PROFILES,
      requiredVotes: 2,
      minConfidence: 0.68,
    });
    expect(summary.ok).toBe(false);
    expect(summary.acceptedProfiles).toBe(2);
    expect(summary.failureKinds).toEqual(["ambiguous"]);
    const blockers = editorialReviewPublishBlockers({
      editorialProfileCount: summary.profileCount,
      editorialAcceptedProfiles: summary.acceptedProfiles,
      editorialFailureKinds: summary.failureKinds,
      editorialReasons: summary.reasons,
    });
    expect(blockers.join(" ")).toContain("ambiguous");
    expect(blockers.join(" ")).toContain("stronger reading");
  });

  it("fails closed when a model or responsive profile is unavailable", () => {
    const attempts = acceptedAttempts().filter(
      (attempt) =>
        attempt.profileId !== "compact-320" &&
        !(attempt.profileId === "mobile-375" && attempt.model === "vision-b")
    );
    const summary = summarizeEditorialReviewAttempts({
      attempts,
      expectedProfileIds: PROFILES,
      requiredVotes: 2,
      minConfidence: 0.68,
    });
    expect(summary.ok).toBe(false);
    expect(summary.missingProfiles).toEqual(["compact-320"]);
    expect(summary.rejectedProfiles).toEqual(["compact-320", "mobile-375"]);
    expect(summary.reasons.join(" ")).toContain("not enough independent");
  });

  it("does not treat duplicate editorial responses as independent judges", () => {
    const duplicated = acceptedAttempts()
      .filter((attempt) => attempt.model === "vision-a")
      .flatMap((attempt) => [attempt, { ...attempt }]);
    const summary = summarizeEditorialReviewAttempts({
      attempts: duplicated,
      expectedProfileIds: PROFILES,
      requiredVotes: 2,
      minConfidence: 0.68,
    });

    expect(summary.ok).toBe(false);
    expect(summary.acceptedProfiles).toBe(0);
    expect(summary.reasons.every((reason) => reason.includes("not enough independent"))).toBe(true);
  });
});
