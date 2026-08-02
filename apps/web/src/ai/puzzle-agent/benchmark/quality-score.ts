import {
  comparePuzzleEditorialBenchmarkReports,
  scorePuzzleEditorialBenchmark,
} from "./editorial-score";
import { comparePuzzleSolveBenchmarkReports, scorePuzzleSolveBenchmark } from "./puzzle-score";
import type {
  PuzzleEditorialBenchmarkCase,
  PuzzleEditorialBenchmarkObservation,
  PuzzleQualityBenchmarkReport,
  PuzzleSolveBenchmarkCase,
  PuzzleSolveBenchmarkObservation,
} from "./types";
import { PUZZLE_GENERATOR_BENCHMARK_VERSION } from "./types";

/** One authoritative promotion interface for full-board generator quality. */
export function scorePuzzleQualityBenchmark(input: {
  solveCases: PuzzleSolveBenchmarkCase[];
  solveObservations: PuzzleSolveBenchmarkObservation[];
  editorialCases: PuzzleEditorialBenchmarkCase[];
  editorialObservations: PuzzleEditorialBenchmarkObservation[];
}): PuzzleQualityBenchmarkReport {
  const solve = scorePuzzleSolveBenchmark({
    cases: input.solveCases,
    observations: input.solveObservations,
  });
  const editorial = scorePuzzleEditorialBenchmark({
    cases: input.editorialCases,
    observations: input.editorialObservations,
  });
  const failures = Array.from(
    new Set([...solve.promotion.failures, ...editorial.promotion.failures])
  );
  return {
    version: PUZZLE_GENERATOR_BENCHMARK_VERSION,
    solve,
    editorial,
    promotion: { passed: failures.length === 0, failures },
  };
}

export function comparePuzzleQualityBenchmarkReports(input: {
  candidate: PuzzleQualityBenchmarkReport;
  baseline?: PuzzleQualityBenchmarkReport;
}): { passed: boolean; failures: string[] } {
  if (input.baseline && input.candidate.version !== input.baseline.version) {
    return {
      passed: false,
      failures: [
        `Quality baseline version ${input.baseline.version} is incompatible with candidate ${input.candidate.version}`,
      ],
    };
  }
  const solve = comparePuzzleSolveBenchmarkReports({
    candidate: input.candidate.solve,
    baseline: input.baseline?.solve,
  });
  const editorial = comparePuzzleEditorialBenchmarkReports({
    candidate: input.candidate.editorial,
    baseline: input.baseline?.editorial,
  });
  const failures = Array.from(new Set([...solve.failures, ...editorial.failures]));
  return { passed: failures.length === 0, failures };
}
