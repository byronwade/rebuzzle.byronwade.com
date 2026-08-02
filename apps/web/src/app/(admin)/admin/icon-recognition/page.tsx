"use client";

import { AlertCircle, CheckCircle2, Eye, Loader2, SkipForward } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type {
  BlindIconRecognitionSpecimen,
  IconRecognitionCalibrationReport,
  IconRecognitionProgress,
} from "@/ai/puzzle-agent/review/icon-recognition-service";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { safeJsonParse } from "@/lib/utils";

type NextResponse = {
  success?: boolean;
  specimen?: BlindIconRecognitionSpecimen | null;
  progress?: IconRecognitionProgress;
  error?: string;
};

type ReportResponse = {
  success?: boolean;
  report?: IconRecognitionCalibrationReport;
  reviewerProgress?: IconRecognitionProgress;
  error?: string;
};

function percent(value: number | null): string {
  return value === null ? "No data" : `${(value * 100).toFixed(1)}%`;
}

export default function IconRecognitionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [specimen, setSpecimen] = useState<BlindIconRecognitionSpecimen | null>(null);
  const [progress, setProgress] = useState<IconRecognitionProgress | null>(null);
  const [report, setReport] = useState<IconRecognitionCalibrationReport | null>(null);
  const [guess, setGuess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const response = await fetch("/api/admin/ai/icon-recognition?mode=report", {
      cache: "no-store",
    });
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    const data = await safeJsonParse<ReportResponse>(response);
    if (!response.ok || !data?.report) {
      throw new Error(data?.error || "Failed to load calibration report");
    }
    setReport(data.report);
    if (data.reviewerProgress) setProgress(data.reviewerProgress);
  }, [router]);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/ai/icon-recognition", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await safeJsonParse<NextResponse>(response);
      if (!response.ok || !data?.progress) {
        throw new Error(data?.error || "Failed to load recognition specimen");
      }
      setSpecimen(data.specimen ?? null);
      setProgress(data.progress);
      if (data.progress.complete) await loadReport();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load recognition panel");
    } finally {
      setLoading(false);
    }
  }, [loadReport, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    void loadNext();
  }, [authLoading, isAuthenticated, loadNext, router]);

  const submit = async (input: { uncertain: boolean }) => {
    if (!specimen || saving) return;
    if (!input.uncertain && !guess.trim()) {
      toast({ title: "Enter the object name or choose I don't know", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/ai/icon-recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtureId: specimen.fixtureId,
          guess: input.uncertain ? "" : guess,
          uncertain: input.uncertain,
        }),
      });
      const data = await safeJsonParse<NextResponse>(response);
      if (!response.ok) throw new Error(data?.error || "Failed to save response");
      setGuess("");
      await loadNext();
    } catch (saveError) {
      toast({
        title: "Response not saved",
        description: saveError instanceof Error ? saveError.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit({ uncertain: false });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completion = progress ? (progress.completed / Math.max(1, progress.total)) * 100 : 0;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Eye className="h-6 w-6 text-primary" />
          <h1 className="font-semibold text-2xl">Blind icon recognition panel</h1>
        </div>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Name only what you can see. Intended labels, aliases, and correctness are withheld until
          your full panel is complete so later answers cannot be coached.
        </p>
      </div>

      {progress && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex justify-between text-sm">
              <span>Personal progress</span>
              <span>
                {progress.completed} / {progress.total}
              </span>
            </div>
            <Progress value={completion} />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Panel unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {specimen && !report && (
        <Card>
          <CardHeader>
            <CardTitle>What object is this?</CardTitle>
            <CardDescription>
              Rendered at the exact {specimen.sizePx}px player size. Use a short, ordinary noun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex min-h-48 items-center justify-center rounded-xl border bg-[#fffdf7]">
              {/* The payload intentionally has no intended label or asset identifier. */}
              <Image
                alt="Unlabeled pictogram for blind recognition"
                height={specimen.sizePx}
                src={`data:image/svg+xml,${encodeURIComponent(specimen.svg)}`}
                style={{ width: specimen.sizePx, height: specimen.sizePx }}
                unoptimized
                width={specimen.sizePx}
              />
            </div>
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input
                aria-label="Object name"
                autoComplete="off"
                autoFocus
                disabled={saving}
                maxLength={100}
                onChange={(event) => setGuess(event.target.value)}
                placeholder="e.g. bicycle"
                spellCheck={false}
                value={guess}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="sm:flex-1" disabled={saving} type="submit">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record answer
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void submit({ uncertain: true })}
                  type="button"
                  variant="outline"
                >
                  <SkipForward className="mr-2 h-4 w-4" /> I don't know
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="space-y-6">
          <Alert variant={report.marketLeadingReady ? "default" : "destructive"}>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Blind panel complete</AlertTitle>
            <AlertDescription>
              Aggregate status: {report.status}. This report includes all independent reviewer
              decisions for catalog {report.catalogVersion}.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Fixture coverage</CardDescription>
                <CardTitle>{percent(report.coverageRate)}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {report.coveredFixtures}/{report.fixtureCount} have at least{" "}
                {report.requiredReviewersPerFixture} reviewers
              </CardContent>
            </Card>
            {report.sizeScores.map((score) => (
              <Card key={score.sizePx}>
                <CardHeader>
                  <CardDescription>{score.sizePx}px top-1 naming</CardDescription>
                  <CardTitle>{percent(score.accuracy)}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {score.correct}/{score.decisions} correct decisions
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Readiness gates</CardTitle>
              <CardDescription>
                Both sizes require complete three-reviewer coverage. Release is 90%; market-leading
                is 97%.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant={report.releaseReady ? "default" : "secondary"}>
                Release {report.releaseReady ? "passed" : "not proven"}
              </Badge>
              <Badge variant={report.marketLeadingReady ? "default" : "secondary"}>
                Market-leading {report.marketLeadingReady ? "passed" : "not proven"}
              </Badge>
              <Badge variant="outline">{report.reviewerCount} reviewers</Badge>
              <Badge variant="outline">{report.decisionCount} decisions</Badge>
            </CardContent>
          </Card>

          {report.weakFixtures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quarantine candidates</CardTitle>
                <CardDescription>
                  These individual player-size specimens are below the{" "}
                  {percent(report.specimenAccuracyFloor)} hard floor and block promotion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.weakFixtures.slice(0, 20).map((fixture) => (
                  <div
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    key={fixture.fixtureId}
                  >
                    <span>
                      {fixture.conceptId} at {fixture.sizePx}px
                    </span>
                    <Badge variant="destructive">{percent(fixture.accuracy)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.conceptScores.some((score) => score.decisions > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Weakest concepts</CardTitle>
                <CardDescription>
                  Lowest aggregate human naming accuracy, including unknown answers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.conceptScores
                  .filter((score) => score.decisions > 0)
                  .slice(0, 12)
                  .map((score) => (
                    <div
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      key={score.conceptId}
                    >
                      <span>{score.conceptId}</span>
                      <Badge variant="secondary">
                        {percent(score.accuracy)} ({score.correct}/{score.decisions})
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {report.topConfusions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top semantic confusions</CardTitle>
                <CardDescription>
                  Use these pairs to replace or redraw weak catalog assets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.topConfusions.map((confusion) => (
                  <div
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    key={`${confusion.intendedConcept}:${confusion.guessedConcept}`}
                  >
                    <span>
                      {confusion.intendedConcept} → {confusion.guessedConcept}
                    </span>
                    <Badge variant="secondary">{confusion.count}</Badge>
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
