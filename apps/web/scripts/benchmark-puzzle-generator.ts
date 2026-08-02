import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import type {
  IconBenchmarkObservation,
  IconBenchmarkReport,
} from "../src/ai/puzzle-agent/benchmark/types";

config({ path: ".env.local", quiet: true });

function numberArg(name: string, fallback: number): number {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function stringArg(name: string, fallback: string): string {
  return (
    process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback
  );
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

async function main(): Promise<void> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error(
      "Live benchmark requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN. Pull the linked Vercel environment first."
    );
  }

  const [{ AI_CONFIG }, benchmark, { recognizePictogramIcon }] = await Promise.all([
    import("../src/ai/config"),
    import("../src/ai/puzzle-agent/benchmark"),
    import("../src/ai/puzzle-agent/visual/critique-pictogram"),
  ]);
  const fullCorpus = benchmark.buildIconBenchmarkCorpus();
  const limit = Math.min(numberArg("limit", fullCorpus.length), fullCorpus.length);
  const concurrency = Math.min(numberArg("concurrency", 2), 4);
  const corpus = fullCorpus.slice(0, limit);
  const outputPath = path.resolve(
    stringArg("output", "artifacts/puzzle-generator/icon-recognition-report.json")
  );
  const baselineArg = process.argv.find((arg) => arg.startsWith("--baseline="));

  console.log(
    `[benchmark] ${benchmark.PUZZLE_GENERATOR_BENCHMARK_VERSION}: ${corpus.length} specimens, ${corpus.length * benchmark.ICON_BENCHMARK_TILE_SIZES.length} decisions`
  );
  const nested = await mapWithConcurrency(corpus, concurrency, async (entry, index) => {
    const result = await recognizePictogramIcon({
      svg: entry.svg,
      concept: entry.intendedConcept,
    });
    console.log(`[benchmark] ${index + 1}/${corpus.length} ${entry.id}: ${result.ok}`);
    return benchmark.ICON_BENCHMARK_TILE_SIZES.map((tileSize) => {
      const profile = result.profileResults?.find((candidate) => candidate.tileSize === tileSize);
      return {
        caseId: entry.id,
        tileSize,
        expected: entry.expected,
        accepted: profile?.ok ?? false,
        confidence: profile?.confidence ?? 0,
        judgeCount: profile?.judges.length ?? 0,
        seenAs: profile?.seenLabel ?? "unavailable",
        error: profile ? undefined : "profile_unavailable",
      } satisfies IconBenchmarkObservation;
    });
  });
  const observations = nested.flat();
  const report = benchmark.scoreIconBenchmark({ cases: corpus, observations });
  const baseline = baselineArg
    ? (JSON.parse(await readFile(path.resolve(baselineArg.slice(11)), "utf8")) as {
        report: IconBenchmarkReport;
      }).report
    : undefined;
  const comparison = benchmark.compareIconBenchmarkReports({ candidate: report, baseline });
  if (limit !== fullCorpus.length) {
    comparison.passed = false;
    comparison.failures.push("Partial corpus runs are diagnostic and cannot promote an evaluator");
  }
  const artifact = {
    generatedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.PUZZLE_GENERATOR_BENCHMARK_VERSION,
    fullCorpus: limit === fullCorpus.length,
    models: [...AI_CONFIG.visualRecognition.models],
    thresholds: {
      minConfidence: AI_CONFIG.visualRecognition.minConfidence,
      requiredVotes: AI_CONFIG.visualRecognition.requiredVotes,
    },
    report,
    comparison,
    observations,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`[benchmark] report: ${outputPath}`);
  console.log(
    `[benchmark] promotion=${comparison.passed} positive=${(report.positiveRecall * 100).toFixed(1)}% rejection=${(report.negativeRecall * 100).toFixed(1)}%`
  );
  if (!comparison.passed) {
    comparison.failures.forEach((failure) => console.error(`[benchmark] ${failure}`));
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
