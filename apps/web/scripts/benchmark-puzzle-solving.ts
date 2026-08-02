import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import type { PuzzleQualityBenchmarkReport } from "../src/ai/puzzle-agent/benchmark/types";

function numberArg(name: string, fallback: number): number {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function stringArg(name: string, fallback: string): string {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
}

const explicitEnvFile = process.argv.some((arg) => arg.startsWith("--env-file="));
config({
  path: stringArg("env-file", ".env.local"),
  quiet: true,
  override: explicitEnvFile,
});

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
      "Live solve benchmark requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN. Pull the linked Vercel environment first."
    );
  }

  const { probeGatewayAuth } = await import("../src/ai/client");
  const auth = await probeGatewayAuth();
  if (!auth.ok) {
    throw new Error(
      `${auth.error} Pass --env-file=.vercel/.env.development.local after pulling the linked development environment.`
    );
  }

  const [
    benchmark,
    playerSim,
    blindConsensus,
    presentation,
    editorialReview,
    editorialConsensus,
    { AI_CONFIG },
  ] = await Promise.all([
    import("../src/ai/puzzle-agent/benchmark"),
    import("../src/ai/puzzle-agent/apex/player-sim"),
    import("../src/ai/puzzle-agent/apex/blind-solve-consensus"),
    import("../src/ai/puzzle-agent/visual/presentation"),
    import("../src/ai/puzzle-agent/visual/editorial-review"),
    import("../src/ai/puzzle-agent/visual/editorial-consensus"),
    import("../src/ai/config"),
  ]);
  const fullCorpus = benchmark.buildPuzzleSolveBenchmarkCorpus();
  const fullEditorialCorpus = benchmark.buildPuzzleEditorialBenchmarkCorpus();
  const fullFailureCorpus = benchmark.buildPuzzleFailureBenchmarkCorpus();
  const limit = Math.min(numberArg("limit", fullCorpus.length), fullCorpus.length);
  const failureLimit = Math.min(
    numberArg("failure-limit", fullFailureCorpus.length),
    fullFailureCorpus.length
  );
  const corpus = fullCorpus.slice(0, limit);
  const selectedPositiveIds = new Set(corpus.map((entry) => `editorial:${entry.id}`));
  const selectedFailureIds = new Set(
    fullFailureCorpus.slice(0, failureLimit).map((entry) => entry.id)
  );
  const editorialCorpus = fullEditorialCorpus.filter(
    (entry) => selectedPositiveIds.has(entry.id) || selectedFailureIds.has(entry.id)
  );
  const concurrency = Math.min(numberArg("concurrency", 1), 3);
  const outputPath = path.resolve(
    stringArg("output", "artifacts/puzzle-generator/puzzle-solving-report.json")
  );
  const baselineArg = process.argv.find((arg) => arg.startsWith("--baseline="));

  console.log(
    `[solve-benchmark] ${benchmark.PUZZLE_GENERATOR_BENCHMARK_VERSION}: ${corpus.length} solve puzzles + ${editorialCorpus.length} editorial cases across ${presentation.PUZZLE_BOARD_RECOGNITION_PROFILES.length} profiles`
  );
  const nested = await mapWithConcurrency(corpus, concurrency, async (entry, index) => {
    const attempts = await playerSim.runBlindSolveTournament({
      visual: entry.visual,
      tierLabel: entry.tierLabel,
    });
    console.log(`[solve-benchmark] ${index + 1}/${corpus.length} ${entry.id}`);
    return presentation.PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => {
      const profileAttempts = attempts.filter((attempt) => attempt.profileId === profile.id);
      const summary = blindConsensus.summarizeBlindSolveAttempts({
        answer: entry.answer,
        attempts: profileAttempts,
      });
      return {
        caseId: entry.id,
        profileId: profile.id,
        targetFoundBy: summary.targetFoundBy,
        topTargetFoundBy: summary.topTargetFoundBy,
        dominantTargetFoundBy: summary.dominantTargetFoundBy,
        judgeCount: summary.judgeCount,
        targetConfidence: summary.estimatedSolveRate,
        strongestWrongConfidence: summary.strongestWrongConfidence,
        meanReciprocalRank: summary.meanReciprocalRank,
        wrongParses: summary.wrongParses,
      };
    });
  });
  const observations = nested.flat();
  const editorialNested = await mapWithConcurrency(
    editorialCorpus,
    concurrency,
    async (entry, index) => {
      const attempts = await editorialReview.runPuzzleEditorialTournament({
        visual: entry.visual,
        answer: entry.answer,
      });
      console.log(
        `[editorial-benchmark] ${index + 1}/${editorialCorpus.length} ${entry.id}`
      );
      return presentation.PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) =>
        editorialConsensus.editorialAttemptsToObservation({
          caseId: entry.id,
          profileId: profile.id,
          attempts,
          minConfidence: AI_CONFIG.visualRecognition.minConfidence,
        })
      );
    }
  );
  const editorialObservations = editorialNested.flat();
  const qualityReport = benchmark.scorePuzzleQualityBenchmark({
    solveCases: corpus,
    solveObservations: observations,
    editorialCases: editorialCorpus,
    editorialObservations,
  });
  const report = qualityReport.solve;
  const editorialReport = qualityReport.editorial;
  const baselineArtifact = baselineArg
    ? (JSON.parse(await readFile(path.resolve(baselineArg.slice(11)), "utf8")) as {
        qualityReport?: PuzzleQualityBenchmarkReport;
      })
    : undefined;
  const comparison = benchmark.comparePuzzleQualityBenchmarkReports({
    candidate: qualityReport,
    baseline: baselineArtifact?.qualityReport,
  });
  if (baselineArtifact && !baselineArtifact.qualityReport) {
    comparison.passed = false;
    comparison.failures.push("Baseline artifact is missing the unified quality report");
  }
  if (limit !== fullCorpus.length || failureLimit !== fullFailureCorpus.length) {
    comparison.passed = false;
    comparison.failures.push("Partial corpus runs are diagnostic and cannot promote an evaluator");
  }
  const artifact = {
    generatedAt: new Date().toISOString(),
    benchmarkVersion: benchmark.PUZZLE_GENERATOR_BENCHMARK_VERSION,
    fullCorpus: limit === fullCorpus.length,
    models: [...AI_CONFIG.visualRecognition.models],
    qualityReport,
    report,
    editorialReport,
    comparison,
    observations,
    editorialObservations,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`[solve-benchmark] report: ${outputPath}`);
  console.log(
    `[solve-benchmark] promotion=${comparison.passed} target=${(report.targetDetectionRate * 100).toFixed(1)}% top1=${(report.topTargetDetectionRate * 100).toFixed(1)}% dominant=${(report.dominantTargetDetectionRate * 100).toFixed(1)}% editorial-good=${(editorialReport.positiveAcceptanceRate * 100).toFixed(1)}% editorial-bad=${(editorialReport.failureDetectionRate * 100).toFixed(1)}%`
  );
  if (!comparison.passed) {
    comparison.failures.forEach((failure) =>
      console.error(`[solve-benchmark] ${failure}`)
    );
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
