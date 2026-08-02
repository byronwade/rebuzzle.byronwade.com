import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildExternalCorpusArtifact,
  getExternalDatasetManifest,
  type ExternalPuzzleReviewFile,
} from "../src/ai/puzzle-agent/benchmark/external-corpus";

const MAX_METADATA_BYTES = 10 * 1024 * 1024;
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function assertReviewShape(value: unknown): asserts value is ExternalPuzzleReviewFile {
  if (!value || typeof value !== "object") throw new Error("Review file must contain an object");
  const review = value as Partial<ExternalPuzzleReviewFile>;
  if (
    review.schemaVersion !== 1 ||
    typeof review.datasetId !== "string" ||
    typeof review.revision !== "string" ||
    !review.reviews ||
    typeof review.reviews !== "object"
  ) {
    throw new Error("Review file does not match external corpus review schema v1");
  }
}

async function readReviewFile(filePath: string | undefined): Promise<ExternalPuzzleReviewFile | undefined> {
  if (!filePath) return undefined;
  const value: unknown = JSON.parse(await readFile(path.resolve(filePath), "utf8"));
  assertReviewShape(value);
  return value;
}

async function fetchPinnedMetadata(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
    headers: { "user-agent": "rebuzzle-external-benchmark-import/1.0" },
  });
  if (!response.ok) throw new Error(`External metadata download failed with ${response.status}`);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_METADATA_BYTES) {
    throw new Error(`External metadata exceeds ${MAX_METADATA_BYTES} bytes`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_METADATA_BYTES) {
    throw new Error(`External metadata exceeds ${MAX_METADATA_BYTES} bytes`);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function main(): Promise<void> {
  const datasetId = arg("dataset") ?? "re-bus-hf-v1";
  const output = path.resolve(
    arg("output") ??
      path.join(REPOSITORY_ROOT, "artifacts", "puzzle-generator", "external", `${datasetId}.json`)
  );
  const manifest = getExternalDatasetManifest(datasetId);
  if (manifest.metadataAccess !== "pinned-import" || !manifest.metadataUrl) {
    throw new Error(`Dataset ${datasetId} is quarantined and cannot be imported`);
  }
  const reviewFile = await readReviewFile(arg("review"));
  const csv = await fetchPinnedMetadata(manifest.metadataUrl);
  const artifact = buildExternalCorpusArtifact({ manifest, csv, reviewFile });
  if (manifest.metadataSha256 && artifact.metadataSha256 !== manifest.metadataSha256) {
    throw new Error("Downloaded metadata does not match the pinned SHA-256 digest");
  }
  if (
    manifest.fixtureMetadataSha256 &&
    artifact.fixtureSha256 !== manifest.fixtureMetadataSha256
  ) {
    throw new Error("Parsed fixtures do not match the pinned fixture SHA-256 digest");
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  console.log(`[external-corpus] dataset=${datasetId} revision=${manifest.revision}`);
  console.log(
    `[external-corpus] rows=${artifact.summary.totalRows} originals=${artifact.summary.originalRows} augmented=${artifact.summary.augmentedRows} eligible=${artifact.summary.eligibleRows}`
  );
  console.log(`[external-corpus] metadata-sha256=${artifact.metadataSha256}`);
  console.log(`[external-corpus] artifact=${output}`);
  if (!artifact.summary.promotion.passed) {
    for (const failure of artifact.summary.promotion.failures) {
      console.warn(`[external-corpus] readiness: ${failure}`);
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
