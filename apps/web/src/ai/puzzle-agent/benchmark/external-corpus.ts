import { createHash } from "node:crypto";

export const EXTERNAL_CORPUS_SCHEMA_VERSION = 2 as const;
export const EXTERNAL_REVIEW_SCHEMA_VERSION = 1 as const;

export const EXTERNAL_REASONING_FEATURES = [
  "spelling",
  "color",
  "position",
  "orientation",
  "aspect_ratio",
  "size",
  "style_texture",
  "number",
] as const;

export type ExternalReasoningFeature = (typeof EXTERNAL_REASONING_FEATURES)[number];

export type ExternalDatasetManifest = {
  id: string;
  title: string;
  datasetPageUrl: string;
  revision?: string;
  metadataUrl?: string;
  metadataSha256?: string;
  fixtureMetadataSha256?: string;
  declaredLicense?: string;
  licenseEvidenceUrl?: string;
  metadataAccess: "pinned-import" | "quarantined";
  redistribution: "reference-only";
  allowedImageHosts: readonly string[];
  sourceRights: "row-review-required" | "unknown";
  notes: readonly string[];
};

const RE_BUS_REVISION = "12233c6790bb2edc929ad7822ae428483b5c842a";

/**
 * Public datasets are evaluation inputs only. They are never phrase banks,
 * prompt examples, or generation seeds. A declared dataset license does not
 * erase the provenance of images collected from third-party source sites.
 */
export const EXTERNAL_DATASET_MANIFESTS = [
  {
    id: "re-bus-hf-v1",
    title: "RE-BUS",
    datasetPageUrl: "https://huggingface.co/datasets/TrishanuDas/rebus-dataset",
    revision: RE_BUS_REVISION,
    metadataUrl: `https://huggingface.co/datasets/TrishanuDas/rebus-dataset/resolve/${RE_BUS_REVISION}/RebusPuzzlesFullDataset.csv?download=true`,
    metadataSha256: "b3bf8ff2c43ec87f2a799d266393c174f2b19141870c966863484ba4e231b8d2",
    fixtureMetadataSha256: "a0e9c3ae5ccfe20436d248e63098e497126ebb0f44bcc17f854f7f9d845b0e29",
    declaredLicense: "Apache-2.0",
    licenseEvidenceUrl: "https://huggingface.co/datasets/TrishanuDas/rebus-dataset",
    metadataAccess: "pinned-import",
    redistribution: "reference-only",
    allowedImageHosts: ["raw.githubusercontent.com"],
    sourceRights: "row-review-required",
    notes: [
      "Import metadata from the pinned revision only.",
      "Do not redistribute source images.",
      "Each original row needs answer and source-rights review before evaluation.",
      "Augmented variants cannot count as independent benchmark cases.",
    ],
  },
  {
    id: "rebus-333",
    title: "REBUS: A Robust Evaluation Benchmark for Understanding Symbols",
    datasetPageUrl: "https://github.com/cvndsh/rebus",
    metadataAccess: "quarantined",
    redistribution: "reference-only",
    allowedImageHosts: [],
    sourceRights: "unknown",
    notes: ["No repository license was published when this manifest was reviewed."],
  },
  {
    id: "puzzled-by-puzzles-432",
    title: "Puzzled by Puzzles",
    datasetPageUrl: "https://github.com/Kyunnilee/visual_puzzles",
    metadataAccess: "quarantined",
    redistribution: "reference-only",
    allowedImageHosts: [],
    sourceRights: "unknown",
    notes: ["No repository license was published when this manifest was reviewed."],
  },
] as const satisfies readonly ExternalDatasetManifest[];

export type ExternalPuzzleReview = {
  rights: "pending" | "approved" | "rejected";
  answer: "pending" | "approved" | "rejected";
  reviewer?: string;
  reviewedAt?: string;
  note?: string;
};

export type ExternalPuzzleReviewFile = {
  schemaVersion: typeof EXTERNAL_REVIEW_SCHEMA_VERSION;
  datasetId: string;
  revision: string;
  reviews: Record<string, ExternalPuzzleReview>;
};

export type ExternalPuzzleFixture = {
  id: string;
  datasetId: string;
  datasetRow: number;
  imageUrl: string;
  sourceUrl: string;
  answer: string;
  hint?: string;
  difficulty: string;
  reasoningUnits?: number;
  reasoningFeatures: ExternalReasoningFeature[];
  isAugmented: boolean;
  reviewStatus: "pending" | "approved" | "rejected";
  review?: ExternalPuzzleReview;
  eligibleForEvaluation: boolean;
};

export type ExternalCorpusArtifact = {
  schemaVersion: typeof EXTERNAL_CORPUS_SCHEMA_VERSION;
  importedAt: string;
  dataset: ExternalDatasetManifest;
  metadataSha256: string;
  fixtureSha256: string;
  rows: ExternalPuzzleFixture[];
  invalidRows: Array<{ row: number; reason: string }>;
  summary: ExternalCorpusReadinessReport;
};

export type ExternalCorpusReadinessReport = {
  datasetId: string;
  revision: string;
  totalRows: number;
  originalRows: number;
  augmentedRows: number;
  pendingRows: number;
  approvedRows: number;
  rejectedRows: number;
  eligibleRows: number;
  distinctSourceDomains: number;
  representedDifficulties: string[];
  representedFeatures: ExternalReasoningFeature[];
  invalidRows: number;
  promotion: { passed: boolean; failures: string[] };
};

const COLUMN_TO_FEATURE = {
  "spelling of individual objects/components DIFFERENT from that in the final caption?": "spelling",
  "COLOR of objects/text in image needed for answering?": "color",
  "POSITION of objects/text in image needed for answering?": "position",
  "ORIENTATION of objects/text in image needed for answering?": "orientation",
  "ASPECT RATIO of objects/text in image needed for answering?": "aspect_ratio",
  "SIZE of objects/text in image needed for answering?": "size",
  "STYLE/TEXTURE of objects/text in image needed for answering?": "style_texture",
  "NUMBER of objects/text in image needed for answering?": "number",
} as const satisfies Record<string, ExternalReasoningFeature>;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureDigestPayload(row: ExternalPuzzleFixture): Record<string, unknown> {
  return {
    id: row.id,
    datasetId: row.datasetId,
    datasetRow: row.datasetRow,
    imageUrl: row.imageUrl,
    sourceUrl: row.sourceUrl,
    answer: row.answer,
    hint: row.hint ?? null,
    difficulty: row.difficulty,
    reasoningUnits: row.reasoningUnits ?? null,
    reasoningFeatures: [...row.reasoningFeatures].sort(),
    isAugmented: row.isAugmented,
  };
}

/** Stable digest of immutable fixture metadata; review fields are intentionally excluded. */
export function computeExternalFixtureSha256(rows: ExternalPuzzleFixture[]): string {
  return sha256(
    JSON.stringify(
      [...rows].sort((left, right) => left.id.localeCompare(right.id)).map(fixtureDigestPayload)
    )
  );
}

export function assertExternalCorpusArtifact(
  value: unknown
): asserts value is ExternalCorpusArtifact {
  if (!value || typeof value !== "object") throw new Error("External corpus artifact is invalid");
  const artifact = value as Partial<ExternalCorpusArtifact>;
  if (
    artifact.schemaVersion !== EXTERNAL_CORPUS_SCHEMA_VERSION ||
    !artifact.dataset ||
    typeof artifact.metadataSha256 !== "string" ||
    typeof artifact.fixtureSha256 !== "string" ||
    !Array.isArray(artifact.rows) ||
    !Array.isArray(artifact.invalidRows)
  ) {
    throw new Error("External corpus artifact does not match schema v1");
  }
  const manifest = getExternalDatasetManifest(artifact.dataset.id);
  if (
    manifest.metadataAccess !== "pinned-import" ||
    artifact.dataset.revision !== manifest.revision ||
    artifact.metadataSha256 !== manifest.metadataSha256
  ) {
    throw new Error("External corpus artifact does not match the approved pinned dataset");
  }
  if (artifact.invalidRows.length > 0) {
    throw new Error("External corpus artifact contains invalid source rows");
  }
  if (computeExternalFixtureSha256(artifact.rows) !== artifact.fixtureSha256) {
    throw new Error("External corpus fixture digest does not match its immutable metadata");
  }
  if (artifact.fixtureSha256 !== manifest.fixtureMetadataSha256) {
    throw new Error("External corpus does not match the approved pinned fixture set");
  }
}

function parseFlag(value: string | undefined): boolean {
  return /^(1(?:\.0)?|true|yes)$/i.test(value?.trim() ?? "");
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDomain(
  value: string | undefined,
  allowedProtocols: readonly string[] = ["https:"]
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return allowedProtocols.includes(url.protocol) && !url.username && !url.password
      ? url.hostname.toLowerCase()
      : undefined;
  } catch {
    return undefined;
  }
}

function assertReviewFile(
  reviewFile: ExternalPuzzleReviewFile | undefined,
  manifest: ExternalDatasetManifest
): void {
  if (!reviewFile) return;
  if (reviewFile.schemaVersion !== EXTERNAL_REVIEW_SCHEMA_VERSION) {
    throw new Error(`Unsupported external review schema ${reviewFile.schemaVersion}`);
  }
  if (reviewFile.datasetId !== manifest.id || reviewFile.revision !== manifest.revision) {
    throw new Error("External review file does not match the pinned dataset id and revision");
  }
  for (const [id, review] of Object.entries(reviewFile.reviews)) {
    if (
      !["pending", "approved", "rejected"].includes(review.rights) ||
      !["pending", "approved", "rejected"].includes(review.answer)
    ) {
      throw new Error(`External review ${id} has an invalid decision`);
    }
    if (
      review.rights === "approved" &&
      review.answer === "approved" &&
      (!review.reviewer || !review.reviewedAt || Number.isNaN(Date.parse(review.reviewedAt)))
    ) {
      throw new Error(`Approved external review ${id} needs a reviewer and valid review date`);
    }
  }
}

/** RFC 4180-style parser kept local so imports do not add a runtime dependency. */
export function parseExternalCsv(csv: string): Array<Record<string, string>> {
  const matrix: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]!;
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((entry) => entry.length > 0)) matrix.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("External corpus CSV ends inside a quoted field");
  row.push(field.replace(/\r$/, ""));
  if (row.some((entry) => entry.length > 0)) matrix.push(row);
  const headers = matrix
    .shift()
    ?.map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, "") : header));
  if (!headers?.length) throw new Error("External corpus CSV has no header row");
  return matrix.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function reviewStatus(
  review: ExternalPuzzleReview | undefined
): "pending" | "approved" | "rejected" {
  if (!review) return "pending";
  if (review.rights === "rejected" || review.answer === "rejected") return "rejected";
  return review.rights === "approved" && review.answer === "approved" ? "approved" : "pending";
}

export function scoreExternalCorpusReadiness(input: {
  manifest: ExternalDatasetManifest;
  rows: ExternalPuzzleFixture[];
  invalidRows: number;
}): ExternalCorpusReadinessReport {
  const originals = input.rows.filter((row) => !row.isAugmented);
  const augmented = input.rows.filter((row) => row.isAugmented);
  const eligible = originals.filter((row) => row.eligibleForEvaluation);
  const sourceDomains = new Set(
    eligible.map((row) => normalizeDomain(row.sourceUrl, ["https:", "http:"])).filter(Boolean)
  );
  const representedDifficulties = Array.from(
    new Set(
      eligible
        .map((row) => row.difficulty.toUpperCase())
        .filter((difficulty) => difficulty && difficulty !== "UNKNOWN")
    )
  ).sort();
  const representedFeatures = EXTERNAL_REASONING_FEATURES.filter((feature) =>
    eligible.some((row) => row.reasoningFeatures.includes(feature))
  );
  const failures = [
    ...(input.manifest.metadataAccess !== "pinned-import"
      ? ["Dataset metadata is quarantined"]
      : []),
    ...(eligible.length < 100
      ? [`Human-vetted external corpus ${eligible.length}/100 original cases`]
      : []),
    ...(sourceDomains.size < 2
      ? [`Human-vetted corpus covers ${sourceDomains.size}/2 source domains`]
      : []),
    ...(representedDifficulties.length < 2
      ? [`Human-vetted corpus covers ${representedDifficulties.length}/2 difficulty bands`]
      : []),
    ...(representedFeatures.length < EXTERNAL_REASONING_FEATURES.length
      ? [
          `Human-vetted corpus covers ${representedFeatures.length}/${EXTERNAL_REASONING_FEATURES.length} reasoning features`,
        ]
      : []),
    ...EXTERNAL_REASONING_FEATURES.flatMap((feature) => {
      const count = eligible.filter((row) => row.reasoningFeatures.includes(feature)).length;
      return count < 5 ? [`Human-vetted feature ${feature} has ${count}/5 cases`] : [];
    }),
    ...(input.invalidRows > 0
      ? [`External import contains ${input.invalidRows} invalid rows`]
      : []),
  ];
  return {
    datasetId: input.manifest.id,
    revision: input.manifest.revision ?? "unversioned",
    totalRows: input.rows.length,
    originalRows: originals.length,
    augmentedRows: augmented.length,
    pendingRows: originals.filter((row) => row.reviewStatus === "pending").length,
    approvedRows: originals.filter((row) => row.reviewStatus === "approved").length,
    rejectedRows: originals.filter((row) => row.reviewStatus === "rejected").length,
    eligibleRows: eligible.length,
    distinctSourceDomains: sourceDomains.size,
    representedDifficulties,
    representedFeatures,
    invalidRows: input.invalidRows,
    promotion: { passed: failures.length === 0, failures },
  };
}

export function buildExternalCorpusArtifact(input: {
  manifest: ExternalDatasetManifest;
  csv: string;
  importedAt?: string;
  reviewFile?: ExternalPuzzleReviewFile;
}): ExternalCorpusArtifact {
  const { manifest } = input;
  if (manifest.metadataAccess !== "pinned-import" || !manifest.revision || !manifest.metadataUrl) {
    throw new Error(`Dataset ${manifest.id} is quarantined and cannot be imported`);
  }
  if (!manifest.metadataUrl.includes(`/resolve/${manifest.revision}/`)) {
    throw new Error(`Dataset ${manifest.id} metadata URL is not pinned to its declared revision`);
  }
  assertReviewFile(input.reviewFile, manifest);
  const records = parseExternalCsv(input.csv);
  const invalidRows: Array<{ row: number; reason: string }> = [];
  const seenIds = new Set<string>();
  const rows = records.flatMap((record, recordIndex): ExternalPuzzleFixture[] => {
    const datasetRow = recordIndex + 2;
    const imageUrl = record.img_url?.trim();
    const sourceUrl = record.source?.trim();
    const answer = record.answer?.trim();
    const imageDomain = normalizeDomain(imageUrl);
    const sourceDomain = normalizeDomain(sourceUrl, ["https:", "http:"]);
    if (!imageUrl || !sourceUrl || !answer) {
      invalidRows.push({ row: datasetRow, reason: "Missing image URL, source URL, or answer" });
      return [];
    }
    if (!imageDomain || !manifest.allowedImageHosts.includes(imageDomain)) {
      invalidRows.push({ row: datasetRow, reason: "Image URL is outside the manifest allowlist" });
      return [];
    }
    if (!sourceDomain) {
      invalidRows.push({
        row: datasetRow,
        reason: "Source URL must use HTTP(S) without credentials",
      });
      return [];
    }
    const id = `${manifest.id}:${sha256(`${imageUrl}\n${answer}`).slice(0, 16)}`;
    if (seenIds.has(id)) {
      invalidRows.push({ row: datasetRow, reason: `Duplicate external fixture ${id}` });
      return [];
    }
    seenIds.add(id);
    const review = input.reviewFile?.reviews[id];
    const status = reviewStatus(review);
    const isAugmented = parseFlag(record.is_augmented);
    return [
      {
        id,
        datasetId: manifest.id,
        datasetRow,
        imageUrl,
        sourceUrl,
        answer,
        hint: record.hint?.trim() || undefined,
        difficulty: record.Difficulty?.trim() || "UNKNOWN",
        reasoningUnits: parseOptionalNumber(
          record["number of units of reasoning need to solve the rebus puzzle"]
        ),
        reasoningFeatures: Object.entries(COLUMN_TO_FEATURE).flatMap(([column, feature]) =>
          parseFlag(record[column]) ? [feature] : []
        ),
        isAugmented,
        reviewStatus: status,
        review,
        eligibleForEvaluation: !isAugmented && status === "approved",
      },
    ];
  });
  const reviewedIds = new Set(rows.map((row) => row.id));
  const unknownReviewIds = Object.keys(input.reviewFile?.reviews ?? {}).filter(
    (id) => !reviewedIds.has(id)
  );
  if (unknownReviewIds.length) {
    throw new Error(
      `External review file contains unknown fixture ids: ${unknownReviewIds.slice(0, 5).join(", ")}`
    );
  }
  const summary = scoreExternalCorpusReadiness({
    manifest,
    rows,
    invalidRows: invalidRows.length,
  });
  return {
    schemaVersion: EXTERNAL_CORPUS_SCHEMA_VERSION,
    importedAt: input.importedAt ?? new Date().toISOString(),
    dataset: manifest,
    metadataSha256: sha256(input.csv),
    fixtureSha256: computeExternalFixtureSha256(rows),
    rows,
    invalidRows,
    summary,
  };
}

export function getExternalDatasetManifest(id: string): ExternalDatasetManifest {
  const manifest = EXTERNAL_DATASET_MANIFESTS.find((entry) => entry.id === id);
  if (!manifest) throw new Error(`Unknown external dataset ${id}`);
  return manifest;
}
