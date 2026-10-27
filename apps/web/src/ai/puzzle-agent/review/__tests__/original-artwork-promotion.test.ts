import type { IconRecognitionReview } from "@/db/models";
import {
  buildIconRecognitionFixtures,
  HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
  scoreIconRecognitionCalibration,
} from "../icon-recognition-service";
import {
  createOriginalArtworkPromotionService,
  type OriginalArtworkPromotion,
  type OriginalArtworkPromotionRepository,
} from "../original-artwork-promotion";

function setup() {
  let saved: OriginalArtworkPromotion | null = null;
  const repository: OriginalArtworkPromotionRepository = {
    async find() {
      return saved;
    },
    async save(record, expectedVersion) {
      if ((saved?.statusVersion ?? 0) !== expectedVersion) return false;
      saved = record;
      return true;
    },
  };
  const fixtures = buildIconRecognitionFixtures("originals");
  const catalogVersion = scoreIconRecognitionCalibration({
    panelId: "originals",
    reviews: [],
  }).catalogVersion;
  const reviews: IconRecognitionReview[] = ["one", "two", "three", "four", "five"].flatMap(
    (reviewerId) =>
      fixtures.map((fixture) => ({
        id: `${reviewerId}:${fixture.fixtureId}`,
        contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
        catalogVersion,
        fixtureId: fixture.fixtureId,
        assetId: fixture.assetId,
        conceptId: fixture.conceptId,
        sizePx: fixture.sizePx,
        reviewerId,
        rawGuess: fixture.conceptId,
        normalizedGuess: fixture.conceptId,
        matchedConceptId: fixture.conceptId,
        correct: true,
        uncertain: false,
        createdAt: new Date(),
      }))
  );
  const report = () => scoreIconRecognitionCalibration({ panelId: "originals", reviews });
  const service = createOriginalArtworkPromotionService(repository, async () => report());
  return { service, reviews, report, saved: () => saved };
}
const assetId = "rebuzzle-ink:clock:v1";

describe("audited original artwork promotion", () => {
  it("does not treat qualifying recognition evidence alone as approval", async () => {
    const { service } = setup();
    await expect(service.findEligible(assetId)).resolves.toBeNull();
  });
  it("promotes an exact reviewed version and includes control evidence in its audit", async () => {
    const { service, report, saved } = setup();
    const record = await service.promote({
      assetId,
      actorId: "editor",
      expectedCatalogVersion: report().catalogVersion,
      expectedStatusVersion: 0,
    });
    expect(record.status).toBe("approved");
    expect(record.qualificationEvidenceIds).toHaveLength(430);
    expect(record.auditHistory[0]).toMatchObject({ actorId: "editor", action: "approved" });
    expect(saved()?.assetSha256).toMatch(/^[a-f0-9]{64}$/);
    await expect(service.findEligible(assetId)).resolves.toMatchObject({ assetId });
  });
  it("rejects incomplete evidence, stale review previews and racing edits", async () => {
    const state = setup();
    const input = {
      assetId,
      actorId: "editor",
      expectedCatalogVersion: state.report().catalogVersion,
      expectedStatusVersion: 0,
    };
    await expect(
      state.service.promote({ ...input, expectedCatalogVersion: "stale" })
    ).rejects.toThrow(/changed/);
    state.reviews.pop();
    await expect(state.service.promote(input)).rejects.toThrow(/qualifying/);
    expect(state.saved()).toBeNull();
    const fresh = setup();
    await fresh.service.promote(input);
    await expect(fresh.service.promote(input)).rejects.toThrow(/changed/);
  });
  it("rejects stale policies and altered hashes after approval", async () => {
    const state = setup();
    await state.service.promote({
      assetId,
      actorId: "editor",
      expectedCatalogVersion: state.report().catalogVersion,
      expectedStatusVersion: 0,
    });
    const saved = state.saved()!;
    const hash = saved.assetSha256;
    saved.assetSha256 = "wrong";
    await expect(state.service.findEligible(assetId)).resolves.toBeNull();
    saved.assetSha256 = hash;
    saved.promotionPolicy = "stale";
    await expect(state.service.findEligible(assetId)).resolves.toBeNull();
  });

  it("allows only one competing approval transition", async () => {
    const state = setup();
    const input = {
      assetId,
      actorId: "editor",
      expectedCatalogVersion: state.report().catalogVersion,
      expectedStatusVersion: 0,
    };
    const results = await Promise.allSettled([
      state.service.promote(input),
      state.service.promote(input),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(state.saved()?.auditHistory).toHaveLength(1);
  });

  it("excludes quarantined artwork and evidence that no longer qualifies", async () => {
    const state = setup();
    const input = {
      assetId,
      actorId: "editor",
      expectedCatalogVersion: state.report().catalogVersion,
      expectedStatusVersion: 0,
    };
    await state.service.promote(input);
    const control = state.reviews.find((row) => row.conceptId === "bicycle")!;
    control.rawGuess = "unknown";
    // One control miss leaves four perfect reviewers and one below the screen threshold.
    await expect(state.service.findEligible(assetId)).resolves.toBeNull();
    control.rawGuess = "bicycle";
    await state.service.quarantine({
      assetId,
      actorId: "editor",
      reason: "Ambiguous in playtest",
      expectedStatusVersion: 1,
    });
    await expect(state.service.findEligible(assetId)).resolves.toBeNull();
    expect(state.saved()?.auditHistory).toHaveLength(2);
  });
});
