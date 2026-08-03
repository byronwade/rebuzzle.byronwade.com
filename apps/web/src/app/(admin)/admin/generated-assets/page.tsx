"use client";

import { Images, Loader2, ShieldCheck, SkipForward } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type {
  BlindGeneratedPictogramSpecimen,
  GeneratedPictogramPanelProgress,
  GeneratedPictogramRegistryReport,
} from "@/ai/puzzle-agent/review/generated-pictogram-registry";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { safeJsonParse } from "@/lib/utils";
import { fail } from "@/lib/fail";
import { withLoadingFlag } from "@/lib/with-loading-flag";

type QueueResponse = {
  success?: boolean;
  specimen?: BlindGeneratedPictogramSpecimen | null;
  progress?: GeneratedPictogramPanelProgress;
  error?: string;
};

type ReportResponse = {
  success?: boolean;
  report?: GeneratedPictogramRegistryReport;
  error?: string;
};

function statusVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  if (status === "approved") return "default";
  if (status === "rejected" || status === "quarantined") return "destructive";
  return "secondary";
}

function confidence(value: number | undefined): string {
  return value === undefined ? "Not recorded" : `${(value * 100).toFixed(1)}%`;
}

export default function GeneratedAssetsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [specimen, setSpecimen] = useState<BlindGeneratedPictogramSpecimen | null>(null);
  const [progress, setProgress] = useState<GeneratedPictogramPanelProgress | null>(null);
  const [report, setReport] = useState<GeneratedPictogramRegistryReport | null>(null);
  const [guess, setGuess] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const response = await fetch("/api/admin/ai/generated-pictograms?mode=report", {
      cache: "no-store",
    });
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    const data = await safeJsonParse<ReportResponse>(response);
    if (!response.ok || !data?.report) {
      fail(data?.error || "Failed to load generated-asset report");
    }
    setReport(data.report);
  }, [router]);

  const loadNext = useCallback(async () => {
    setError(null);
    await withLoadingFlag(setLoading, async () => {
      try {
        const response = await fetch("/api/admin/ai/generated-pictograms", { cache: "no-store" });
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        const data = await safeJsonParse<QueueResponse>(response);
        if (!response.ok || !data?.progress) {
          fail(data?.error || "Failed to load generated-asset specimen");
        }
        setSpecimen(data.specimen ?? null);
        setProgress(data.progress);
        await loadReport();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load asset registry");
      }
    });
  }, [loadReport, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    void loadNext();
  }, [authLoading, isAuthenticated, loadNext, router]);

  const submit = async (uncertain: boolean) => {
    if (!specimen || isSubmitting) return;
    if (!uncertain && !guess.trim()) {
      toast({ title: "Enter the object name or choose I don't know", variant: "destructive" });
      return;
    }
    await withLoadingFlag(setIsSubmitting, async () => {
      try {
        const response = await fetch("/api/admin/ai/generated-pictograms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fixtureId: specimen.fixtureId,
            guess: uncertain ? "" : guess,
            uncertain,
          }),
        });
        const data = await safeJsonParse<QueueResponse>(response);
        if (!response.ok) fail(data?.error || "Failed to save response");
        setGuess("");
        await loadNext();
      } catch (saveError) {
        toast({
          title: "Response not saved",
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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completion = progress ? (progress.completed / Math.max(1, progress.available)) * 100 : 0;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:px-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Images className="h-6 w-6 text-primary" />
          <h1 className="font-semibold text-2xl">Generated asset registry</h1>
        </div>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Blindly name long-tail pictograms at their real player sizes. Intended labels and
          correctness stay hidden until you have reviewed both sizes of that candidate.
        </p>
      </div>

      {progress && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex justify-between text-sm">
              <span>Current queue progress</span>
              <span>
                {progress.completed} / {progress.available}
              </span>
            </div>
            <Progress value={completion} />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Registry unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {specimen ? (
        <Card>
          <CardHeader>
            <CardTitle>What object is this?</CardTitle>
            <CardDescription>
              Rendered at the exact {specimen.sizePx}px player size. Use one short, ordinary noun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex min-h-48 items-center justify-center rounded-xl border bg-[#fffdf7]">
              {/* No concept, candidate ID, aliases, or correctness are present in this payload. */}
              <Image
                alt="Unlabeled generated pictogram for blind recognition"
                height={specimen.sizePx}
                src={`data:image/svg+xml,${encodeURIComponent(specimen.svg)}`}
                style={{ height: specimen.sizePx, width: specimen.sizePx }}
                unoptimized
                width={specimen.sizePx}
              />
            </div>
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input
                aria-label="Object name"
                autoComplete="off"
                autoFocus
                disabled={isSubmitting}
                maxLength={100}
                onChange={(event) => setGuess(event.target.value)}
                placeholder="e.g. bicycle"
                spellCheck={false}
                value={guess}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="sm:flex-1" disabled={isSubmitting} type="submit">
                  {isSubmitting && <Loader2 data-icon="inline-start" className="mr-2 h-4 w-4 animate-spin" />}
                  Record answer
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={() => void submit(true)}
                  type="button"
                  variant="outline"
                >
                  <SkipForward className="mr-2 h-4 w-4" data-icon="inline-start" /> I don't know
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        !error && (
          <Alert>
            <AlertTitle>No generated assets awaiting your review</AlertTitle>
            <AlertDescription>
              New long-tail candidates appear here only after passing the current structural and
              two-size automated recognition gates.
            </AlertDescription>
          </Alert>
        )
      )}

      {report && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Human-governed reuse status
              </CardTitle>
              <CardDescription>
                Approval requires three unanimous blind names at both 36px and 72px. Runtime reuse
                also rechecks current integrity and recognition gates.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="outline">{report.candidatesVisibleToReviewer} visible</Badge>
              <Badge variant="secondary">{report.pending} pending</Badge>
              <Badge>{report.approved} approved</Badge>
              <Badge variant="destructive">{report.rejected} rejected</Badge>
              <Badge variant="destructive">{report.quarantined} quarantined</Badge>
            </CardContent>
          </Card>

          {report.candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">{candidate.conceptLabel}</CardTitle>
                  <Badge variant={statusVariant(candidate.status)}>{candidate.status}</Badge>
                </div>
                <CardDescription>
                  Automated recognition confidence: {confidence(candidate.automatedConfidence)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md border px-3 py-2">
                  <div className="font-medium">36px blind naming</div>
                  <div className="text-muted-foreground">
                    {candidate.size36.correct}/{candidate.size36.decisions} exact decisions
                  </div>
                </div>
                <div className="rounded-md border px-3 py-2">
                  <div className="font-medium">72px blind naming</div>
                  <div className="text-muted-foreground">
                    {candidate.size72.correct}/{candidate.size72.decisions} exact decisions
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
