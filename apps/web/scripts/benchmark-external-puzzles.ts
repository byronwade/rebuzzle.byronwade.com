import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type {
  ExternalCorpusArtifact,
  ExternalDatasetManifest,
  ExternalPuzzleFixture,
} from "../src/ai/puzzle-agent/benchmark/external-corpus";
import { assertExternalCorpusArtifact } from "../src/ai/puzzle-agent/benchmark/external-corpus";
import type { ExternalPuzzleBenchmarkReport } from "../src/ai/puzzle-agent/benchmark/external-score";

config({ path: ".env.local", quiet: true });

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SUPPORTED_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function numberArg(name: string, fallback: number): number {
  const parsed = Number(arg(name));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let cursor = 0;
  async function consume(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()));
  return results;
}

function allowedImageUrl(value: string, manifest: ExternalDatasetManifest): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !manifest.allowedImageHosts.includes(url.hostname.toLowerCase())
  ) {
    throw new Error("External image URL is outside the pinned dataset allowlist");
  }
  return url;
}

async function fetchExternalImage(
  fixture: ExternalPuzzleFixture,
  manifest: ExternalDatasetManifest
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  if (!fixture.eligibleForEvaluation || fixture.isAugmented) {
    throw new Error("External image has not passed row-level rights and answer review");
  }
  const url = allowedImageUrl(fixture.imageUrl, manifest);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: { "user-agent": "rebuzzle-external-blind-benchmark/1.0" },
  });
  if (!response.ok) throw new Error(`Image download failed with ${response.status}`);
  allowedImageUrl(response.url, manifest);
  const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (!mediaType || !SUPPORTED_MEDIA_TYPES.has(mediaType)) {
    throw new Error(`Unsupported external image media type ${mediaType ?? "missing"}`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error(`External image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`External image exceeds ${MAX_IMAGE_BYTES} bytes`);
  }
  return { bytes, mediaType };
}

async function main(): Promise<void> {
  const benchmark = await import("../src/ai/puzzle-agent/benchmark");
  const playerSim = await import("../src/ai/puzzle-agent/apex/player-sim");
  const blindConsensus = await import("../src/ai/puzzle-agent/apex/blind-solve-consensus");
  const { AI_CONFIG } = await import("../src/ai/config");
  const corpusPath = path.resolve(
    arg("corpus") ??
      path.join(
        REPOSITORY_ROOT,
        "artifacts",
        "puzzle-generator",
        "external",
        "re-bus-hf-v1.json"
      )
  );
  const raw: unknown = JSON.parse(await readFile(corpusPath, "utf8"));
  assertExternalCorpusArtifact(raw);
  const manifest = benchmark.getExternalDatasetManifest(raw.dataset.id);
  if (raw.dataset.revision !== manifest.revision) {
    throw new Error("External corpus artifact is not at the currently pinned dataset revision");
  }
  const eligible = raw.rows.filter((entry) => entry.eligibleForEvaluation && !entry.isAugmented);
  if (!eligible.length) {
    throw new Error(
      "External corpus has no eligible rows. Complete row-level source-rights and answer review first."
    );
  }
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error(
      "Live external benchmark requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN. Pull the linked Vercel environment first."
    );
  }
  const limit = Math.min(numberArg("limit", eligible.length), eligible.length);
  const cases = eligible.slice(0, limit);
  const concurrency = Math.min(numberArg("concurrency", 1), 3);
  const outputPath = path.resolve(
    arg("output") ??
      path.join(
        REPOSITORY_ROOT,
        "artifacts",
        "puzzle-generator",
        "external",
        `${manifest.id}-solve-report.json`
      )
  );
  const baselinePath = arg("baseline");

  console.log(
    `[external-benchmark] ${manifest.id}@${manifest.revision}: ${cases.length} human-vetted original puzzles`
  );
  const observations = await mapWithConcurrency(cases, concurrency, async (entry, index) => {
    try {
      const image = await fetchExternalImage(entry, manifest);
      const attempts = await playerSim.runBlindSolveImageTournament({
        image: image.bytes,
        mediaType: image.mediaType,
        tierLabel: entry.difficulty,
        profileId: "external-source",
        presentation: "external source image; no answer, hint, or metadata shown",
      });
      const summary = blindConsensus.summarizeBlindSolveAttempts({
        answer: entry.answer,
        attempts,
      });
      console.log(`[external-benchmark] ${index + 1}/${cases.length} ${entry.id}`);
      return {
        caseId: entry.id,
        targetFoundBy: summary.targetFoundBy,
        topTargetFoundBy: summary.topTargetFoundBy,
        dominantTargetFoundBy: summary.dominantTargetFoundBy,
        judgeCount: summary.judgeCount,
        targetConfidence: summary.estimatedSolveRate,
        strongestWrongConfidence: summary.strongestWrongConfidence,
        meanReciprocalRank: summary.meanReciprocalRank,
        wrongParses: summary.wrongParses,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[external-benchmark] ${entry.id}: ${message}`);
      return {
        caseId: entry.id,
        targetFoundBy: 0,
        topTargetFoundBy: 0,
        dominantTargetFoundBy: 0,
        judgeCount: 0,
        targetConfidence: 0,
        strongestWrongConfidence: 0,
        meanReciprocalRank: 0,
        wrongParses: [],
        error: message,
      };
    }
  });
  const report = benchmark.scoreExternalPuzzleBenchmark({
    cases,
    observations,
    revision: manifest.revision!,
  });
  const baseline = baselinePath
    ? (JSON.parse(await readFile(path.resolve(baselinePath), "utf8")) as {
        report?: ExternalPuzzleBenchmarkReport;
      })
    : undefined;
  const comparison = benchmark.compareExternalPuzzleBenchmarkReports({
    candidate: report,
    baseline: baseline?.report,
  });
  if (baseline && !baseline.report) {
    comparison.passed = false;
    comparison.failures.push("External baseline artifact is missing its report");
  }
  if (limit !== eligible.length) {
    comparison.passed = false;
    comparison.failures.push("Partial external corpus runs are diagnostic and cannot promote");
  }
  const artifact = {
    generatedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.PUZZLE_GENERATOR_BENCHMARK_VERSION,
    datasetId: manifest.id,
    revision: manifest.revision,
    metadataSha256: raw.metadataSha256,
    fullCorpus: limit === eligible.length,
    models: [...AI_CONFIG.visualRecognition.models],
    report,
    comparison,
    observations,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`[external-benchmark] report=${outputPath}`);
  console.log(
    `[external-benchmark] promotion=${comparison.passed} target=${(report.targetDetectionRate * 100).toFixed(1)}% top1=${(report.topTargetDetectionRate * 100).toFixed(1)}% dominant=${(report.dominantTargetDetectionRate * 100).toFixed(1)}% mrr=${report.meanReciprocalRank.toFixed(3)}`
  );
  if (!comparison.passed) {
    comparison.failures.forEach((failure) => console.error(`[external-benchmark] ${failure}`));
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
