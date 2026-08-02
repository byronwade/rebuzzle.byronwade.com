import { mkdir, writeFile } from "node:fs/promises";
import { setServers } from "node:dns";
import path from "node:path";
import { config } from "dotenv";
import type { LiveGeneratorCanaryObservation } from "../src/ai/puzzle-agent/benchmark/generator-canary";

function numberArg(name: string, fallback: number): number {
  const raw = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split("=")[1];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function stringArg(name: string, fallback: string): string {
  return (
    process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3) ??
    fallback
  );
}

function answerKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, " ").slice(0, 800);
}

function rejectedPuzzle(error: unknown): {
  answer: string;
  techniqueId: string;
  explanation: string;
  hints: string[];
  visual: {
    layers: Array<{ kind: string; source?: string }>;
  };
} | null {
  if (!error || typeof error !== "object") return null;
  const puzzle = (error as { puzzle?: unknown }).puzzle;
  if (!puzzle || typeof puzzle !== "object") return null;
  const candidate = puzzle as ReturnType<typeof rejectedPuzzle>;
  return candidate?.visual && Array.isArray(candidate.visual.layers) ? candidate : null;
}

async function main(): Promise<void> {
  const explicitEnvFile = process.argv.some((argument) => argument.startsWith("--env-file="));
  config({
    path: stringArg("env-file", ".env.local"),
    quiet: true,
    // A stale parent-shell placeholder must not mask a freshly pulled,
    // explicitly selected Vercel environment file.
    override: explicitEnvFile,
  });
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error(
      "Live generator canary requires AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN"
    );
  }

  const { probeGatewayAuth } = await import("../src/ai/client");
  const auth = await probeGatewayAuth();
  if (!auth.ok) {
    throw new Error(
      `${auth.error} Pass --env-file=.vercel/.env.development.local after pulling the linked development environment.`
    );
  }

  // A benchmark is read-only and must not fan out hundreds of index mutations
  // while measuring generation latency or archive lookups.
  process.env.REBUZZLE_SKIP_AUTO_INDEXES = "1";
  const benchmarkDnsServers = process.env.REBUZZLE_BENCHMARK_DNS_SERVERS
    ?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (benchmarkDnsServers?.length) setServers(benchmarkDnsServers);

  const [{ generateMasterPuzzle }, { renderPuzzleVisualProfiles }, benchmark, difficulty] =
    await Promise.all([
      import("../src/ai/services/master-puzzle-orchestrator"),
      import("../src/ai/puzzle-agent/visual/render-board"),
      import("../src/ai/puzzle-agent/benchmark/generator-canary"),
      import("../src/ai/puzzle-agent/difficulty-levels"),
    ]);
  const attempts = numberArg("attempts", benchmark.LIVE_GENERATOR_CANARY_MIN_ATTEMPTS);
  const candidates = Math.max(1, Math.min(5, numberArg("candidates", 2)));
  const maxAttempts = Math.max(1, Math.min(4, numberArg("max-attempts", 2)));
  const preferredTechnique = stringArg("preferred-technique", "").trim();
  const archiveMode = stringArg("archive-mode", "live") === "fixture" ? "fixture" : "live";
  process.env.REBUZZLE_GENERATOR_ARCHIVE_MODE = archiveMode;
  const outputDirectory = path.resolve(
    stringArg("output", "artifacts/puzzle-generator/live-canary")
  );
  await mkdir(outputDirectory, { recursive: true });
  const observations: LiveGeneratorCanaryObservation[] = [];

  for (let index = 0; index < attempts; index += 1) {
    const tier = difficulty.DIFFICULTY_LEVELS[index % difficulty.DIFFICULTY_LEVELS.length]!;
    const id = `attempt-${String(index + 1).padStart(2, "0")}-${tier.tier}`;
    const started = Date.now();
    try {
      const result = await generateMasterPuzzle({
        targetDifficulty: tier.target,
        puzzleType: "rebus",
        requireNovelty: true,
        qualityThreshold: 74,
        maxAttempts,
        candidateCount: candidates,
        useLearningFeedback: true,
        preferredTechniques: preferredTechnique ? [preferredTechnique] : undefined,
      });
      const rendered = await renderPuzzleVisualProfiles(result.puzzle.visual);
      await Promise.all(
        rendered.map((profile) =>
          writeFile(path.join(outputDirectory, `${id}-${profile.profileId}.png`), profile.pixels)
        )
      );
      const assets = result.puzzle.visual.layers.flatMap((layer) =>
        layer.kind === "pictogram" ? [layer.source ?? "unproven"] : []
      );
      const boardProfiles = result.metadata.boardRecognitionProfiles ?? [];
      const blind = result.metadata.playabilityEvidence?.blind;
      const editorial = result.metadata.playabilityEvidence?.editorial;
      observations.push({
        id,
        targetDifficulty: tier.target,
        tierLabel: tier.label,
        status: "accepted",
        durationMs: Date.now() - started,
        answer: result.puzzle.answer,
        answerKey: answerKey(result.puzzle.answer),
        fingerprint: result.metadata.fingerprint,
        techniqueId: result.puzzle.techniqueId,
        qualityScore: result.metadata.qualityMetrics.scores.overall,
        funScore: result.metadata.qualityMetrics.scores.fun,
        uniquenessScore: result.metadata.uniquenessScore,
        assetSources: assets,
        boardProfileCount: boardProfiles.length,
        boardDistinctModels: new Set(boardProfiles.flatMap((profile) => profile.models)).size,
        blindProfileCount: blind?.profileCount ?? 0,
        blindCompleteProfileCount:
          blind?.profiles.filter(
            (profile) =>
              profile.judgeCount >= blind.requiredVotes &&
              profile.topTargetFoundBy >= blind.requiredVotes &&
              profile.dominantTargetFoundBy >= blind.requiredVotes
          ).length ?? 0,
        editorialProfileCount: editorial?.profileCount ?? 0,
        editorialAcceptedProfiles: editorial?.acceptedProfiles ?? 0,
        renderedProfileCount: rendered.length,
      });
      console.log(`[live-canary] ${index + 1}/${attempts} ${id}: accepted`);
    } catch (error) {
      const candidate = rejectedPuzzle(error);
      let rejectedRenderedProfileCount = 0;
      if (candidate) {
        try {
          const rendered = await renderPuzzleVisualProfiles(candidate.visual as never);
          rejectedRenderedProfileCount = rendered.length;
          await Promise.all(
            rendered.map((profile) =>
              writeFile(
                path.join(outputDirectory, `${id}-rejected-${profile.profileId}.png`),
                profile.pixels
              )
            )
          );
          await writeFile(
            path.join(outputDirectory, `${id}-rejected.json`),
            `${JSON.stringify(candidate, null, 2)}\n`,
            "utf8"
          );
        } catch {
          rejectedRenderedProfileCount = 0;
        }
      }
      observations.push({
        id,
        targetDifficulty: tier.target,
        tierLabel: tier.label,
        status: "rejected",
        durationMs: Date.now() - started,
        answer: candidate?.answer,
        answerKey: candidate?.answer ? answerKey(candidate.answer) : undefined,
        techniqueId: candidate?.techniqueId,
        assetSources:
          candidate?.visual.layers.flatMap((layer) =>
            layer.kind === "pictogram" ? [layer.source ?? "unproven"] : []
          ) ?? [],
        boardProfileCount: 0,
        boardDistinctModels: 0,
        blindProfileCount: 0,
        blindCompleteProfileCount: 0,
        editorialProfileCount: 0,
        editorialAcceptedProfiles: 0,
        renderedProfileCount: rejectedRenderedProfileCount,
        error: safeError(error),
      });
      console.log(`[live-canary] ${index + 1}/${attempts} ${id}: rejected`);
    }
  }

  const report = benchmark.scoreLiveGeneratorCanary(observations, { archiveMode });
  const artifact = {
    generatedAt: new Date().toISOString(),
    candidatesPerAttempt: candidates,
    report,
    observations,
  };
  const reportPath = path.join(outputDirectory, "report.json");
  await writeFile(reportPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(
    `[live-canary] promotion=${report.promotion.passed} accepted=${report.accepted}/${report.attempted} evidence=${(report.evidenceCompleteRate * 100).toFixed(1)}% assets=${(report.approvedAssetRate * 100).toFixed(1)}%`
  );
  console.log(`[live-canary] report: ${reportPath}`);
  if (!report.promotion.passed) {
    report.promotion.failures.forEach((failure) => console.error(`[live-canary] ${failure}`));
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(safeError(error));
  process.exitCode = 1;
});
