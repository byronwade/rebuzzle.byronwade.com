import {
  assertExternalCorpusArtifact,
  buildExternalCorpusArtifact,
  EXTERNAL_REVIEW_SCHEMA_VERSION,
  type ExternalPuzzleReviewFile,
  getExternalDatasetManifest,
  parseExternalCsv,
  scoreExternalCorpusReadiness,
} from "../external-corpus";

const HEADER = [
  "img_url",
  "Difficulty",
  "answer",
  "hint",
  "source",
  "number of units of reasoning need to solve the rebus puzzle",
  "POSITION of objects/text in image needed for answering?",
  "NUMBER of objects/text in image needed for answering?",
  "is_augmented",
].join(",");

function csvRow(input: { image: string; answer: string; augmented?: boolean }): string {
  return [
    `https://raw.githubusercontent.com/abhi1nandy2/Re-Bus/master/images/${input.image}`,
    "HARD",
    `"${input.answer}"`,
    '"A hint, with comma"',
    "https://example.com/source",
    "3.0",
    "1.0",
    "1.0",
    input.augmented ? "True" : "False",
  ].join(",");
}

describe("external puzzle corpus", () => {
  it("parses quoted CSV fields without a production dependency", () => {
    const parsed = parseExternalCsv(
      `${HEADER}\r\n${csvRow({ image: "1.png", answer: "Once, twice" })}\r\n`
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.answer).toBe("Once, twice");
    expect(parsed[0]?.hint).toBe("A hint, with comma");
  });

  it("imports pinned metadata but fails closed before row-level review", () => {
    const manifest = getExternalDatasetManifest("re-bus-hf-v1");
    const artifact = buildExternalCorpusArtifact({
      manifest,
      csv: `${HEADER}\n${csvRow({ image: "1.png", answer: "For once in my life" })}`,
      importedAt: "2026-08-01T00:00:00.000Z",
    });
    expect(artifact.rows).toHaveLength(1);
    expect(artifact.rows[0]?.reviewStatus).toBe("pending");
    expect(artifact.rows[0]?.eligibleForEvaluation).toBe(false);
    expect(artifact.summary.promotion.passed).toBe(false);
    expect(artifact.summary.promotion.failures.join(" ")).toContain("0/100");
  });

  it("requires both rights and answer approval and excludes augmented variants", () => {
    const manifest = getExternalDatasetManifest("re-bus-hf-v1");
    const initial = buildExternalCorpusArtifact({
      manifest,
      csv: `${HEADER}\n${csvRow({ image: "1.png", answer: "First answer" })}\n${csvRow({ image: "2.png", answer: "Second answer", augmented: true })}`,
    });
    const reviews = Object.fromEntries(
      initial.rows.map((row) => [
        row.id,
        {
          rights: "approved" as const,
          answer: "approved" as const,
          reviewer: "editor@example.com",
          reviewedAt: "2026-08-01T00:00:00.000Z",
        },
      ])
    );
    const reviewFile: ExternalPuzzleReviewFile = {
      schemaVersion: EXTERNAL_REVIEW_SCHEMA_VERSION,
      datasetId: manifest.id,
      revision: manifest.revision!,
      reviews,
    };
    const artifact = buildExternalCorpusArtifact({
      manifest,
      csv: `${HEADER}\n${csvRow({ image: "1.png", answer: "First answer" })}\n${csvRow({ image: "2.png", answer: "Second answer", augmented: true })}`,
      reviewFile,
    });
    expect(artifact.rows[0]?.eligibleForEvaluation).toBe(true);
    expect(artifact.rows[1]?.eligibleForEvaluation).toBe(false);
    expect(artifact.summary.eligibleRows).toBe(1);
    expect(artifact.summary.augmentedRows).toBe(1);
  });

  it("quarantines unlicensed sources and rejects changed review revisions", () => {
    const quarantined = getExternalDatasetManifest("rebus-333");
    expect(() => buildExternalCorpusArtifact({ manifest: quarantined, csv: HEADER })).toThrow(
      "quarantined"
    );

    const manifest = getExternalDatasetManifest("re-bus-hf-v1");
    expect(() =>
      buildExternalCorpusArtifact({
        manifest,
        csv: `${HEADER}\n${csvRow({ image: "1.png", answer: "Answer" })}`,
        reviewFile: {
          schemaVersion: EXTERNAL_REVIEW_SCHEMA_VERSION,
          datasetId: manifest.id,
          revision: "changed",
          reviews: {},
        },
      })
    ).toThrow("does not match");
  });

  it("rejects a self-consistent artifact that is not the code-pinned fixture set", () => {
    const manifest = getExternalDatasetManifest("re-bus-hf-v1");
    const artifact = buildExternalCorpusArtifact({
      manifest,
      csv: `${HEADER}\n${csvRow({ image: "1.png", answer: "Substituted answer" })}`,
    });
    artifact.metadataSha256 = manifest.metadataSha256!;
    expect(() => assertExternalCorpusArtifact(artifact)).toThrow("approved pinned fixture set");
  });

  it("cannot pass readiness with invalid rows even when coverage counts are high", () => {
    const manifest = getExternalDatasetManifest("re-bus-hf-v1");
    const rows = Array.from({ length: 100 }, (_, index) => ({
      id: `row-${index}`,
      datasetId: manifest.id,
      datasetRow: index + 2,
      imageUrl: `https://raw.githubusercontent.com/a/b/main/${index}.png`,
      sourceUrl: `https://source-${index % 3}.example.com/puzzle`,
      answer: `answer ${index}`,
      difficulty: ["EASY", "MEDIUM", "HARD"][index % 3]!,
      reasoningFeatures: [
        "spelling",
        "color",
        "position",
        "orientation",
        "aspect_ratio",
        "size",
        "style_texture",
        "number",
      ] as const,
      isAugmented: false,
      reviewStatus: "approved" as const,
      eligibleForEvaluation: true,
    }));
    const report = scoreExternalCorpusReadiness({ manifest, rows, invalidRows: 1 });
    expect(report.eligibleRows).toBe(100);
    expect(report.promotion.passed).toBe(false);
    expect(report.promotion.failures.join(" ")).toContain("invalid rows");
  });
});
