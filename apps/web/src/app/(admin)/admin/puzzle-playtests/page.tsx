"use client";

import {
  ArchiveRestore,
  Gamepad2,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { AppLink as Link } from "@/components/AppLink";
import { type FormEvent, useEffect, useState } from "react";
import type { PuzzlePlaytestBackfillReport } from "@/ai/puzzle-agent/review/puzzle-playtest-backfill";
import type {
  BlindPuzzlePlaytestSpecimen,
  PuzzlePlaytestProgress,
  PuzzlePlaytestReport,
} from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import { AuthGate } from "@/components/AuthGate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { PuzzlePlaytestFailureReason } from "@/db/models";
import { useToast } from "@/hooks/use-toast";
import { safeJsonParse } from "@/lib/utils";
import { fail } from "@/lib/fail";
import { withLoadingFlag } from "@/lib/with-loading-flag";

type QueueResponse = {
  success?: boolean;
  specimen?: BlindPuzzlePlaytestSpecimen | null;
  progress?: PuzzlePlaytestProgress;
  error?: string;
};

type ReportResponse = { success?: boolean; report?: PuzzlePlaytestReport; error?: string };
type BackfillResponse = {
  success?: boolean;
  report?: PuzzlePlaytestBackfillReport;
  error?: string;
};

const FAILURE_OPTIONS: Array<{ value: PuzzlePlaytestFailureReason; label: string }> = [
  { value: "unrecognizable-artwork", label: "Artwork is unrecognizable" },
  { value: "unreadable-layout", label: "Layout or text is unreadable" },
  { value: "missing-cue", label: "A necessary clue is missing" },
  { value: "multiple-answers", label: "Several answers seem equally valid" },
  { value: "too-hard", label: "I cannot solve it, but the board is readable" },
  { value: "other", label: "Another reason" },
];

function percent(value: number | null): string {
  return value === null ? "No evidence" : `${(value * 100).toFixed(1)}%`;
}

export default function PuzzlePlaytestsPage() {
  return (
    <AuthGate>
      <PuzzlePlaytestsPageInner />
    </AuthGate>
  );
}

function PuzzlePlaytestsPageInner() {
  const { toast } = useToast();
  const [specimen, setSpecimen] = useState<BlindPuzzlePlaytestSpecimen | null>(null);
  const [progress, setProgress] = useState<PuzzlePlaytestProgress | null>(null);
  const [report, setReport] = useState<PuzzlePlaytestReport | null>(null);
  const [backfillReport, setBackfillReport] = useState<PuzzlePlaytestBackfillReport | null>(null);
  const [guess, setGuess] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [failureReason, setFailureReason] = useState<PuzzlePlaytestFailureReason | "">("");
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    const response = await fetch("/api/admin/ai/puzzle-playtests?mode=report", {
      cache: "no-store",
    });
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    const data = await safeJsonParse<ReportResponse>(response);
    if (!response.ok || !data?.report)
      fail(data?.error || "Failed to load playtest report");
    setReport(data.report);
  };

  const loadNext = async () => {
    await withLoadingFlag(setLoading, async () => {
      setError(null);
      try {
        const response = await fetch("/api/admin/ai/puzzle-playtests", { cache: "no-store" });
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        const data = await safeJsonParse<QueueResponse>(response);
        if (!response.ok || !data?.progress)
          fail(data?.error || "Failed to load playtest");
        setSpecimen(data.specimen ?? null);
        setProgress(data.progress);
        setShownAt(Date.now());
        await loadReport();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load puzzle playtests");
      }
    });

  };

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const submit = async (gaveUp: boolean) => {
    if (!specimen || isSubmitting) return;
    if (!gaveUp && !guess.trim()) {
      toast({ title: "Enter your answer", variant: "destructive" });
      return;
    }
    if (gaveUp && !failureReason) {
      toast({ title: "Choose why the puzzle was not playable", variant: "destructive" });
      return;
    }
    await withLoadingFlag(setIsSubmitting, async () => {
      try {
        const response = await fetch("/api/admin/ai/puzzle-playtests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fixtureId: specimen.fixtureId,
            guess: gaveUp ? "" : guess,
            gaveUp,
            failureReason: gaveUp ? failureReason : undefined,
            confidence,
            elapsedMs: Date.now() - shownAt,
          }),
        });
        const data = await safeJsonParse<QueueResponse>(response);
        if (!response.ok) fail(data?.error || "Failed to save playtest");
        setGuess("");
        setConfidence(3);
        setFailureReason("");
        await loadNext();
      } catch (saveError) {
        toast({
          title: "Playtest not saved",
          description: saveError instanceof Error ? saveError.message : "Try again",
          variant: "destructive",
        });
      }
    });

  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(false);
  };

  const runBackfill = async (dryRun: boolean) => {
    if (backfillLoading) return;
    await withLoadingFlag(setBackfillLoading, async () => {
      try {
        const response = await fetch("/api/admin/ai/puzzle-playtests/backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun, limit: 100 }),
        });
        const data = await safeJsonParse<BackfillResponse>(response);
        if (!response.ok || !data?.report) {
          fail(data?.error || "Failed to inspect historical puzzles");
        }
        setBackfillReport(data.report);
        if (!dryRun) {
          toast({
            title: "Historical calibration queue updated",
            description: `${data.report.queued} current-pipeline puzzles added.`,
          });
          await loadNext();
        }
      } catch (backfillError) {
        toast({
          title: dryRun ? "Historical audit failed" : "Historical backfill failed",
          description: backfillError instanceof Error ? backfillError.message : "Try again",
          variant: "destructive",
        });
      }
    });

  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completion = progress ? (progress.completed / Math.max(1, progress.available)) * 100 : 0;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-primary" />
          <h1 className="font-semibold text-2xl">Blind puzzle playtests</h1>
        </div>
        <p className="max-w-3xl text-muted-foreground text-sm">
          Solve only what the rendered board communicates. Every reviewer sees one responsive
          profile per generated puzzle, and the answer remains hidden until that review is final.
        </p>
        <Button asChild className="mt-3" size="sm" variant="outline">
          <Link href="/playtest">Open registered-player panel</Link>
        </Button>
      </div>

      {progress && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex justify-between text-sm">
              <span>Current generated-puzzle queue</span>
              <span>
                {progress.completed} / {progress.available}
              </span>
            </div>
            <Progress value={completion} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArchiveRestore className="h-5 w-5" /> Historical current-pipeline sample
          </CardTitle>
          <CardDescription>
            Audit recent AI rebuses and queue only boards that already carry complete responsive,
            editorial, novelty, and solve-estimate evidence. The audit is non-mutating.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={backfillLoading}
              onClick={() => void runBackfill(true)}
              type="button"
              variant="outline"
            >
              {backfillLoading && <Loader2 data-icon="inline-start" className="mr-2 h-4 w-4 animate-spin" />}
              Audit historical sample
            </Button>
            {backfillReport?.dryRun && backfillReport.eligibleUnqueued > 0 && (
              <Button
                disabled={backfillLoading}
                onClick={() => void runBackfill(false)}
                type="button"
              >
                Queue up to {Math.min(100, backfillReport.eligibleUnqueued)} eligible puzzles
              </Button>
            )}
          </div>
          {backfillReport && (
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">{backfillReport.scanned} scanned</Badge>
              <Badge variant="secondary">{backfillReport.eligible} eligible</Badge>
              <Badge variant="outline">{backfillReport.alreadyQueued} already queued</Badge>
              <Badge>{backfillReport.queued} added</Badge>
              <Badge variant="outline">{backfillReport.excluded} excluded</Badge>
              {backfillReport.truncated && <Badge variant="secondary">More rows available</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Playtest unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {specimen ? (
        <Card>
          <CardHeader>
            <CardTitle>What is the answer?</CardTitle>
            <CardDescription>
              No hints, intended answer, difficulty, or evaluator score are shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex min-h-52 items-center justify-center overflow-hidden rounded-xl border bg-[#f4f6f3] p-2">
              <Image
                alt="Unlabeled puzzle board for blind playtesting"
                height={specimen.height}
                src={specimen.imageDataUrl}
                style={{ height: "auto", maxWidth: "100%" }}
                unoptimized
                width={specimen.width}
              />
            </div>
            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                aria-label="Puzzle answer"
                autoComplete="off"
                autoFocus
                disabled={isSubmitting}
                maxLength={160}
                onChange={(event) => setGuess(event.target.value)}
                placeholder="Enter the phrase or word"
                spellCheck={false}
                value={guess}
              />
              <div>
                <div className="mb-2 text-sm">Confidence</div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Button
                      aria-label={`Confidence ${value}`}
                      key={value}
                      onClick={() => setConfidence(value)}
                      size="sm"
                      type="button"
                      variant={confidence === value ? "default" : "outline"}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <select
                  aria-label="Reason puzzle was not playable"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setFailureReason(event.target.value as PuzzlePlaytestFailureReason | "")
                  }
                  value={failureReason}
                >
                  <option value="">If giving up, choose why...</option>
                  {FAILURE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={isSubmitting}
                  onClick={() => void submit(true)}
                  type="button"
                  variant="outline"
                >
                  I cannot solve this
                </Button>
              </div>
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2 data-icon="inline-start" className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send data-icon="inline-start" className="mr-2 h-4 w-4" />
                )}
                Submit final answer
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        !error && (
          <Alert>
            <AlertTitle>No generated puzzles awaiting your review</AlertTitle>
            <AlertDescription>
              New AI-generated rebus boards are sampled automatically after successful publication.
            </AlertDescription>
          </Alert>
        )
      )}

      {report && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Human playability evidence
              </CardTitle>
              <CardDescription>
                Release requires 30 fully covered generated puzzles; market-leading evidence
                requires 100, with five reviewers on every responsive profile plus representative
                reviewer, difficulty, and technique coverage. Only reviewers who pass the blinded
                known-answer controls contribute generated-puzzle evidence. Readiness combines
                one-sided 95% Wilson bounds with a deterministic reviewer-by-puzzle crossed-cluster
                bootstrap, so repeated ratings do not masquerade as independent evidence.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-muted-foreground text-xs">Completed puzzles</div>
                <div className="font-semibold text-xl">{report.completedCandidates}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Solve rate</div>
                <div className="font-semibold text-xl">{percent(report.overallSolveRate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Ambiguity</div>
                <div className="font-semibold text-xl">{percent(report.ambiguityRate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Visual failures</div>
                <div className="font-semibold text-xl">{percent(report.visualFailureRate)}</div>
                <div className="text-muted-foreground text-xs">
                  {percent(report.conservativeEvidence.visualFailureUpperBound)} conservative upper
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Candidate floor pass</div>
                <div className="font-semibold text-xl">
                  {percent(report.candidateFloorPassRate)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {percent(report.conservativeEvidence.candidateFloorPassLowerBound)} conservative
                  lower
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Ambiguity safety bound</div>
                <div className="font-semibold text-xl">
                  {percent(report.conservativeEvidence.ambiguityUpperBound)}
                </div>
                <div className="text-muted-foreground text-xs">Conservative 95% upper</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">High-confidence wrong bound</div>
                <div className="font-semibold text-xl">
                  {percent(report.conservativeEvidence.highConfidenceWrongUpperBound)}
                </div>
                <div className="text-muted-foreground text-xs">Conservative 95% upper</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Solve estimate MAE</div>
                <div className="font-semibold text-xl">
                  {percent(report.solveCalibrationMeanAbsoluteError)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {percent(report.conservativeEvidence.solveCalibrationMeanAbsoluteErrorUpperBound)}{" "}
                  cluster upper
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Responsive solve gap</div>
                <div className="font-semibold text-xl">{percent(report.responsiveSolveGap)}</div>
                <div className="text-muted-foreground text-xs">
                  {percent(report.conservativeEvidence.responsiveSolveGapUpperBound)} cluster upper
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Crossed bootstrap</div>
                <div className="font-semibold text-xl">
                  {report.clusteredEvidence.sufficient ? "Ready" : "Insufficient"}
                </div>
                <div className="text-muted-foreground text-xs">
                  {report.clusteredEvidence.rowClusters} reviewers ×{" "}
                  {report.clusteredEvidence.columnClusters} puzzles ·{" "}
                  {report.clusteredEvidence.replicates} resamples
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Independent reviewers</div>
                <div className="font-semibold text-xl">{report.reviewerCoverage.reviewers}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Largest reviewer share</div>
                <div className="font-semibold text-xl">
                  {percent(report.reviewerCoverage.maximumDecisionShare)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Techniques represented</div>
                <div className="font-semibold text-xl">{report.techniqueScores.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Reviewer qualification</div>
                <div className="font-semibold text-xl">
                  {percent(report.reviewerQuality.qualificationRate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Qualified / excluded</div>
                <div className="font-semibold text-xl">
                  {report.reviewerQuality.qualifiedReviewers} /{" "}
                  {report.reviewerQuality.excludedReviewers}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Control decisions</div>
                <div className="font-semibold text-xl">
                  {report.reviewerQuality.controlDecisions}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Generated decisions held out</div>
                <div className="font-semibold text-xl">
                  {report.reviewerQuality.unscoredGeneratedDecisions}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Readiness gates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={report.releaseReady ? "default" : "secondary"}>
                  Release {report.releaseReady ? "proven" : "not proven"}
                </Badge>
                <Badge variant={report.marketLeadingReady ? "default" : "secondary"}>
                  Market-leading {report.marketLeadingReady ? "proven" : "not proven"}
                </Badge>
                <Badge variant="outline">{report.reviewerCount} reviewers</Badge>
                <Badge variant="outline">{report.decisionCount} generated decisions</Badge>
                <Badge variant="outline">{report.controlCandidateCount} blinded controls</Badge>
              </div>
              {!report.releaseReady && (
                <div className="space-y-1 text-muted-foreground text-sm">
                  <div>Release: {report.releaseFailures.slice(0, 7).join(" · ")}</div>
                  <div>Market: {report.marketLeadingFailures.slice(0, 7).join(" · ")}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {report.profileScores.map((profile) => (
              <Card key={profile.profileId}>
                <CardHeader>
                  <CardDescription>{profile.profileId}</CardDescription>
                  <CardTitle>{percent(profile.solveRate)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {profile.correct}/{profile.decisions} solved · median{" "}
                  {profile.medianSolveMs === null
                    ? "n/a"
                    : `${Math.round(profile.medianSolveMs / 1000)}s`}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Difficulty strata</CardTitle>
                <CardDescription>
                  Completed current-contract puzzles by canonical tier
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.difficultyTierScores.map((score) => (
                  <div className="flex items-center justify-between text-sm" key={score.id}>
                    <span className="capitalize">{score.id}</span>
                    <span>
                      {score.candidates} puzzles · {percent(score.solveRate)} solved
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Technique coverage</CardTitle>
                <CardDescription>Dominant techniques appear first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.techniqueScores.slice(0, 12).map((score) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={score.id}>
                    <span className="truncate">{score.id}</span>
                    <span className="shrink-0">
                      {score.candidates} · {percent(score.share)}
                    </span>
                  </div>
                ))}
                {report.techniqueScores.length === 0 && (
                  <div className="text-muted-foreground text-sm">
                    No completed technique evidence
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {report.visibleCandidates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your reviewed puzzles</CardTitle>
                <CardDescription>
                  Answers become visible only after your immutable decision for that puzzle.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.visibleCandidates.slice(0, 30).map((candidate) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    key={candidate.candidateId}
                  >
                    <span>
                      {candidate.answer} · difficulty {candidate.difficultyScore}
                    </span>
                    <Badge
                      variant={
                        candidate.solveRateLowerBound >= candidate.expectedSolveFloor
                          ? "default"
                          : "secondary"
                      }
                    >
                      {percent(candidate.solveRate)} solve ·{" "}
                      {percent(candidate.solveRateLowerBound)}
                      95% lower
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
