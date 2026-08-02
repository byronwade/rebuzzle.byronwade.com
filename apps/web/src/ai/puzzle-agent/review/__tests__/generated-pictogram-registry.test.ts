import { createHash } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import type { GeneratedPictogramCandidate, GeneratedPictogramReview } from "@/db/models";
import { resolveCuratedPictogram } from "../../visual/curated-pictograms";
import {
  createGeneratedPictogramRegistry,
  GENERATED_PICTOGRAM_REGISTRY_VERSION,
  type GeneratedPictogramRepository,
  GeneratedPictogramReviewConflictError,
  matchesGeneratedPictogramConcept,
} from "../generated-pictogram-registry";

function memoryRepository() {
  const candidates: GeneratedPictogramCandidate[] = [];
  const reviews: GeneratedPictogramReview[] = [];
  const repository: GeneratedPictogramRepository = {
    async findCandidateByAssetSha256(assetSha256) {
      return candidates.find((row) => row.assetSha256 === assetSha256) ?? null;
    },
    async findCandidateById(id) {
      return candidates.find((row) => row.id === id) ?? null;
    },
    async findApproved(input) {
      return (
        candidates.find(
          (row) =>
            row.registryVersion === input.registryVersion &&
            row.styleId === input.styleId &&
            row.conceptKey === input.conceptKey &&
            row.status === "approved"
        ) ?? null
      );
    },
    async countPendingForConcept(input) {
      return candidates.filter(
        (row) =>
          row.registryVersion === input.registryVersion &&
          row.styleId === input.styleId &&
          row.conceptKey === input.conceptKey &&
          row.status === "pending"
      ).length;
    },
    async insertCandidate(candidate) {
      if (candidates.some((row) => row.id === candidate.id)) return false;
      candidates.push(candidate);
      return true;
    },
    async listCandidates(input) {
      return candidates
        .filter(
          (row) =>
            row.registryVersion === input.registryVersion &&
            (!input.statuses?.length || input.statuses.includes(row.status))
        )
        .slice(0, input.limit ?? 200);
    },
    async listReviewerReviews(input) {
      return reviews.filter(
        (row) =>
          row.registryVersion === input.registryVersion && row.reviewerId === input.reviewerId
      );
    },
    async listCandidateReviews(input) {
      return reviews.filter(
        (row) =>
          row.registryVersion === input.registryVersion && row.candidateId === input.candidateId
      );
    },
    async insertReview(review) {
      if (
        reviews.some(
          (row) =>
            row.candidateId === review.candidateId &&
            row.sizePx === review.sizePx &&
            row.reviewerId === review.reviewerId
        )
      ) {
        return false;
      }
      reviews.push(review);
      return true;
    },
    async transitionCandidate(input) {
      const index = candidates.findIndex(
        (row) =>
          row.id === input.id &&
          row.statusVersion === input.expectedStatusVersion &&
          input.fromStatuses.includes(row.status)
      );
      if (index < 0) return null;
      const current = candidates[index]!;
      const updated: GeneratedPictogramCandidate = {
        ...current,
        status: input.status,
        statusVersion: current.statusVersion + 1,
        humanEvidence: input.humanEvidence,
        auditHistory: [...current.auditHistory, input.event],
        updatedAt: input.updatedAt,
      };
      candidates[index] = updated;
      return updated;
    },
  };
  return { candidates, reviews, repository };
}

function automatedInput(concept = "lighthouse") {
  return {
    concept,
    svg: resolveCuratedPictogram("house")!.svg,
    clarityScore: 90,
    seenAs: concept,
    recognitionConfidence: 0.95,
    recognitionProfiles: [
      { tileSize: 36, seenAs: concept, confidence: 0.94 },
      { tileSize: 72, seenAs: concept, confidence: 0.97 },
    ],
    now: new Date("2026-08-01T12:00:00.000Z"),
  };
}

const OFF_CANVAS_SVG =
  '<svg viewBox="0 0 64 64"><path d="M 96 96 L 110 96 L 110 110 L 96 110 Z" fill="#1a1f1c" stroke="#1a1f1c"/><path d="M 112 96 L 126 96 L 126 110 L 112 110 Z" fill="#1a1f1c" stroke="#1a1f1c"/><path d="M 96 112 L 110 112 L 110 126 L 96 126 Z" fill="#1a1f1c" stroke="#1a1f1c"/></svg>';

async function completeReviewer(
  registry: ReturnType<typeof createGeneratedPictogramRegistry>,
  reviewerId: string,
  guess: string
) {
  for (;;) {
    const next = await registry.getNext(reviewerId);
    if (!next.specimen) return;
    await registry.submitReview({
      reviewerId,
      fixtureId: next.specimen.fixtureId,
      guess,
    });
  }
}

describe("human-governed generated pictogram registry", () => {
  it("matches exact long-tail concepts and simple plural forms without fuzzy credit", () => {
    expect(matchesGeneratedPictogramConcept("a lighthouse icon", "lighthouse")).toBe(true);
    expect(matchesGeneratedPictogramConcept("lighthouses", "lighthouse")).toBe(true);
    expect(matchesGeneratedPictogramConcept("tower", "lighthouse")).toBe(false);
  });

  it("requires structural and both player-size automated evidence before queuing", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);

    await expect(
      registry.submitCandidate({ ...automatedInput(), recognitionProfiles: [] })
    ).rejects.toThrow("both player-size");
    expect(store.candidates).toHaveLength(0);
  });

  it("rejects source-valid candidates that disappear at player size", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);

    await expect(
      registry.submitCandidate({
        ...automatedInput(),
        svg: OFF_CANVAS_SVG,
      })
    ).rejects.toThrow("player-pixel integrity");
    expect(store.candidates).toHaveLength(0);
  });

  it("keeps one pending candidate per concept and emits a blind payload", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    const candidate = await registry.submitCandidate(automatedInput());
    const duplicateConcept = await registry.submitCandidate({
      ...automatedInput(),
      svg: resolveCuratedPictogram("castle")!.svg,
    });
    const next = await registry.getNext("reviewer-1");

    expect(candidate?.status).toBe("pending");
    expect(duplicateConcept).toBeNull();
    expect(next.specimen).not.toBeNull();
    expect(Object.keys(next.specimen ?? {}).sort()).toEqual(["fixtureId", "sizePx", "svg"]);
    expect(JSON.stringify(next)).not.toContain("lighthouse");
    expect(JSON.stringify(next)).not.toContain("concept");
  });

  it("approves only after unanimous blind naming by three reviewers at both sizes", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    const candidate = await registry.submitCandidate(automatedInput());

    await completeReviewer(registry, "reviewer-1", "lighthouse");
    await completeReviewer(registry, "reviewer-2", "a lighthouse icon");
    await completeReviewer(registry, "reviewer-3", "lighthouses");

    expect(store.reviews).toHaveLength(6);
    expect(store.candidates[0]?.status).toBe("approved");
    expect(store.candidates[0]?.humanEvidence).toEqual({
      requiredReviewersPerSize: 3,
      size36: { decisions: 3, correct: 3 },
      size72: { decisions: 3, correct: 3 },
    });
    await expect(registry.findApproved("lighthouse")).resolves.toMatchObject({
      id: candidate?.id,
      status: "approved",
    });
  });

  it("rejects a candidate when a completed size includes a recognition miss", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    await registry.submitCandidate(automatedInput());

    await completeReviewer(registry, "reviewer-1", "tower");
    await completeReviewer(registry, "reviewer-2", "lighthouse");
    await completeReviewer(registry, "reviewer-3", "lighthouse");

    expect(store.candidates[0]?.status).toBe("rejected");
    await expect(registry.findApproved("lighthouse")).resolves.toBeNull();
  });

  it("does not reveal candidate labels in reports until that reviewer saw both sizes", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    await registry.submitCandidate(automatedInput());
    const first = await registry.getNext("reviewer-1");
    await registry.submitReview({
      reviewerId: "reviewer-1",
      fixtureId: first.specimen!.fixtureId,
      guess: "lighthouse",
    });

    const hidden = await registry.getReport("reviewer-1");
    expect(hidden.candidates).toEqual([]);

    const second = await registry.getNext("reviewer-1");
    await registry.submitReview({
      reviewerId: "reviewer-1",
      fixtureId: second.specimen!.fixtureId,
      guess: "lighthouse",
    });
    const visible = await registry.getReport("reviewer-1");
    expect(visible.candidates[0]?.conceptLabel).toBe("lighthouse");
  });

  it("enforces immutable reviewer decisions", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    await registry.submitCandidate(automatedInput());
    const next = await registry.getNext("reviewer-1");
    await registry.submitReview({
      reviewerId: "reviewer-1",
      fixtureId: next.specimen!.fixtureId,
      guess: "lighthouse",
    });

    await expect(
      registry.submitReview({
        reviewerId: "reviewer-1",
        fixtureId: next.specimen!.fixtureId,
        guess: "lighthouse",
      })
    ).rejects.toBeInstanceOf(GeneratedPictogramReviewConflictError);
  });

  it("quarantines an approved asset that fails integrity validation", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    await registry.submitCandidate(automatedInput());
    await completeReviewer(registry, "reviewer-1", "lighthouse");
    await completeReviewer(registry, "reviewer-2", "lighthouse");
    await completeReviewer(registry, "reviewer-3", "lighthouse");
    store.candidates[0]!.svg = `${store.candidates[0]!.svg}<!--tampered-->`;

    await expect(registry.findApproved("lighthouse")).resolves.toBeNull();
    expect(store.candidates[0]?.status).toBe("quarantined");
    expect(store.candidates[0]?.auditHistory.at(-1)?.actor).toBe("runtime-gate");
  });

  it("quarantines a hash-valid approved asset whose player raster regresses", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    await registry.submitCandidate(automatedInput());
    await completeReviewer(registry, "reviewer-1", "lighthouse");
    await completeReviewer(registry, "reviewer-2", "lighthouse");
    await completeReviewer(registry, "reviewer-3", "lighthouse");
    store.candidates[0]!.svg = OFF_CANVAS_SVG;
    store.candidates[0]!.assetSha256 = createHash("sha256").update(OFF_CANVAS_SVG).digest("hex");

    await expect(registry.findApproved("lighthouse")).resolves.toBeNull();
    expect(store.candidates[0]?.status).toBe("quarantined");
    expect(store.candidates[0]?.auditHistory.at(-1)?.reason).toContain("integrity validation");
  });

  it("ignores stale registry versions", async () => {
    const store = memoryRepository();
    const registry = createGeneratedPictogramRegistry(store.repository);
    const candidate = await registry.submitCandidate(automatedInput());
    expect(candidate?.registryVersion).toBe(GENERATED_PICTOGRAM_REGISTRY_VERSION);
  });
});
