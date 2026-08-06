/**
 * Merge human icon-naming + playtest readiness into the daily reserve breaker.
 *
 * Insufficient human samples remain "watch" / "insufficient" (do not halt AI).
 * Only complete, failing human cohorts force reserve publication.
 */

export type HumanCalibrationStatus = "insufficient" | "watch" | "healthy" | "halt";

export type HumanCalibrationGate = {
  version: "human-calibration-gate-v1";
  status: HumanCalibrationStatus;
  shouldUseReserve: boolean;
  reasons: string[];
  icon?: {
    contractVersion: string;
    releaseReady: boolean;
    coverageRate: number;
    weakFixtureCount: number;
  };
  playtest?: {
    contractVersion: string;
    completedCandidates: number;
    releaseReady: boolean;
    visualFailureRate: number | null;
    ambiguityRate: number | null;
  };
  generatedAt: string;
};

/** Playtest release sample floor from HUMAN_PUZZLE_PLAYTESTING.md */
const PLAYTEST_RELEASE_COMPLETED_FLOOR = 30;

export function assessHumanCalibrationGate(input: {
  icon?: {
    contractVersion: string;
    releaseReady: boolean;
    coverageRate: number;
    weakFixtureCount: number;
    status?: string;
  } | null;
  playtest?: {
    contractVersion: string;
    completedCandidates: number;
    releaseReady: boolean;
    releaseFailures?: string[];
    visualFailureRate: number | null;
    ambiguityRate: number | null;
  } | null;
  /** Technique-family drift from playtest strata (watch/halt signals). */
  techniqueDriftIssues?: string[] | null;
  now?: Date;
}): HumanCalibrationGate {
  const reasons: string[] = [];
  let status: HumanCalibrationStatus = "insufficient";

  const icon = input.icon;
  const playtest = input.playtest;
  const techniqueDriftIssues = (input.techniqueDriftIssues ?? []).filter(Boolean);

  if (icon) {
    if (icon.coverageRate >= 1) {
      if (!icon.releaseReady) {
        status = "halt";
        reasons.push(
          icon.weakFixtureCount > 0
            ? `Human icon panel failed release (${icon.weakFixtureCount} weak specimens)`
            : "Human icon recognition release gate failed"
        );
      } else if (status === "insufficient" || status === "watch") {
        status = "healthy";
      }
    } else if (icon.coverageRate > 0) {
      if (status === "insufficient") status = "watch";
      reasons.push(
        `Human icon panel collecting (${Math.round(icon.coverageRate * 100)}% specimen coverage)`
      );
    }
  }

  if (playtest) {
    if (playtest.completedCandidates >= PLAYTEST_RELEASE_COMPLETED_FLOOR) {
      if (!playtest.releaseReady) {
        status = "halt";
        reasons.push(
          ...(playtest.releaseFailures?.length
            ? playtest.releaseFailures.slice(0, 3)
            : ["Human playtest release gate failed"])
        );
      } else if (status === "insufficient" || status === "watch") {
        status = "healthy";
      }
    } else if (playtest.completedCandidates > 0) {
      if (status === "insufficient") status = "watch";
      reasons.push(
        `Human playtest collecting (${playtest.completedCandidates}/${PLAYTEST_RELEASE_COMPLETED_FLOOR} completed puzzles)`
      );
    }
  }

  // Playtest technique drift feeds the breaker once release samples exist.
  // Crush/miss drift while collecting stays watch; after the release floor it
  // can force reserve when paired with a failing release cohort, otherwise watch.
  if (techniqueDriftIssues.length) {
    reasons.push(...techniqueDriftIssues.slice(0, 3));
    if (status === "insufficient") {
      status = "watch";
    } else if (
      status === "healthy" &&
      playtest &&
      playtest.completedCandidates >= PLAYTEST_RELEASE_COMPLETED_FLOOR
    ) {
      status = "watch";
    }
  }

  if (!icon && !playtest) {
    reasons.push("No human calibration reports available");
  } else if (status === "insufficient" && reasons.length === 0) {
    reasons.push("Human calibration evidence below release sample floors");
  }

  return {
    version: "human-calibration-gate-v1",
    status,
    shouldUseReserve: status === "halt",
    reasons,
    icon: icon
      ? {
          contractVersion: icon.contractVersion,
          releaseReady: icon.releaseReady,
          coverageRate: icon.coverageRate,
          weakFixtureCount: icon.weakFixtureCount,
        }
      : undefined,
    playtest: playtest
      ? {
          contractVersion: playtest.contractVersion,
          completedCandidates: playtest.completedCandidates,
          releaseReady: playtest.releaseReady,
          visualFailureRate: playtest.visualFailureRate,
          ambiguityRate: playtest.ambiguityRate,
        }
      : undefined,
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}

/**
 * Load live human reports when Mongo/services are available.
 * Failures are non-fatal — caller treats missing reports as insufficient.
 */
export async function loadHumanCalibrationGate(): Promise<HumanCalibrationGate> {
  let icon: Parameters<typeof assessHumanCalibrationGate>[0]["icon"] = null;
  let playtest: Parameters<typeof assessHumanCalibrationGate>[0]["playtest"] = null;
  let techniqueDriftIssues: string[] = [];

  try {
    const [
      {
        HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
        buildIconRecognitionFixtures,
        scoreIconRecognitionCalibration,
      },
      { CURATED_PICTOGRAM_CATALOG_VERSION },
      { createMongoIconRecognitionRepository },
    ] = await Promise.all([
      import("@/ai/puzzle-agent/review/icon-recognition-service"),
      import("@/ai/puzzle-agent/visual/curated-pictograms"),
      import("@/ai/puzzle-agent/review/mongo-icon-recognition-repository"),
    ]);
    const fixtures = buildIconRecognitionFixtures("publication");
    const reviews = await createMongoIconRecognitionRepository().listCalibrationDecisions({
      contractVersion: HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
      catalogVersion: CURATED_PICTOGRAM_CATALOG_VERSION,
    });
    const report = scoreIconRecognitionCalibration({
      fixtures,
      reviews,
      panelId: "publication",
    });
    icon = {
      contractVersion: report.contractVersion,
      releaseReady: report.releaseReady,
      coverageRate: report.coverageRate,
      weakFixtureCount: report.weakFixtures.length,
      status: report.status,
    };
  } catch {
    icon = null;
  }

  try {
    const { puzzlePlaytestService } = await import(
      "@/ai/puzzle-agent/review/puzzle-playtest-server"
    );
    const report = await puzzlePlaytestService.getReport("operational-audit", new Date(), {
      readOnly: true,
    });
    playtest = {
      contractVersion: report.contractVersion,
      completedCandidates: report.completedCandidates,
      releaseReady: report.releaseReady,
      releaseFailures: report.releaseFailures,
      visualFailureRate: report.visualFailureRate,
      ambiguityRate: report.ambiguityRate,
    };

    try {
      const [
        { techniqueRatesFromPlaytestStrata, playtestTechniqueDriftIssues },
        { loadLearningDigest },
      ] = await Promise.all([
        import("@/ai/puzzle-agent/apex/playtest-calibration"),
        import("@/ai/puzzle-agent/apex/learning-context"),
      ]);
      const rates = techniqueRatesFromPlaytestStrata(report.techniqueScores);
      const learning = await loadLearningDigest();
      techniqueDriftIssues = playtestTechniqueDriftIssues({
        rates,
        tooEasy: learning.tooEasy,
        tooHard: learning.tooHard,
      });
    } catch {
      techniqueDriftIssues = [];
    }
  } catch {
    playtest = null;
  }

  return assessHumanCalibrationGate({ icon, playtest, techniqueDriftIssues });
}
