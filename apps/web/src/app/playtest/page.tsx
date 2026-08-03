"use client";

import { AlertCircle, CheckCircle2, FlaskConical, Loader2, Send, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { AppLink as Link } from "@/components/AppLink";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type {
  BlindPuzzlePlaytestSpecimen,
  PuzzlePlaytestProgress,
} from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import { useAuth } from "@/components/AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { PuzzlePlaytestFailureReason } from "@/db/models";
import { useToast } from "@/hooks/use-toast";
import { safeJsonParse } from "@/lib/utils";
import { fail } from "@/lib/fail";

type QueueResponse = {
  success?: boolean;
  specimen?: BlindPuzzlePlaytestSpecimen | null;
  progress?: PuzzlePlaytestProgress;
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

export default function PlaytestPage() {
  const router = useRouter();
  const { isAuthenticated, isGuest, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [specimen, setSpecimen] = useState<BlindPuzzlePlaytestSpecimen | null>(null);
  const [progress, setProgress] = useState<PuzzlePlaytestProgress | null>(null);
  const [guess, setGuess] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [failureReason, setFailureReason] = useState<PuzzlePlaytestFailureReason | "">("");
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/puzzle-playtests", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login?next=/playtest");
        setLoading(false);
        return;
      }
      const data = await safeJsonParse<QueueResponse>(response);
      if (!response.ok || !data?.progress) {
        fail(data?.error || "Failed to load a playtest puzzle");
      }
      setSpecimen(data.specimen ?? null);
      setProgress(data.progress);
      setShownAt(Date.now());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load a playtest puzzle");
    }
    setLoading(false);

  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!(isAuthenticated && !isGuest)) {
      setLoading(false);
      return;
    }
    void loadNext();
  }, [authLoading, isAuthenticated, isGuest, loadNext]);

  const submit = async (gaveUp: boolean) => {
    if (!specimen || isSubmitting) return;
    if (!gaveUp && !guess.trim()) {
      toast({ title: "Enter your answer", variant: "destructive" });
      return;
    }
    if (gaveUp && !failureReason) {
      toast({ title: "Choose why you could not solve it", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/puzzle-playtests", {
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
      if (!response.ok) fail(data?.error || "Failed to save your response");
      setGuess("");
      setConfidence(3);
      setFailureReason("");
      await loadNext();
    } catch (saveError) {
      toast({
        title: "Response not saved",
        description: saveError instanceof Error ? saveError.message : "Try again",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);

  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(false);
  };

  if (authLoading || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!isAuthenticated || isGuest) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Join the blind puzzle panel</CardTitle>
            <CardDescription>
              An account at least 24 hours old with three completed puzzles keeps the panel tied to
              experienced players. Guest and fresh accounts are excluded from quality evidence. A
              small set of known-answer calibration boards is mixed into early assignments;
              individual calibration boards are never labeled.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild>
              <Link href="/signup?next=/playtest">Create an account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login?next=/playtest">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const completion = progress ? (progress.completed / Math.max(1, progress.available)) * 100 : 0;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="font-semibold text-2xl">Blind puzzle playtest</h1>
        </div>
        <p className="max-w-2xl text-muted-foreground text-sm">
          Solve only what the board communicates. You will not see hints, difficulty, intended
          answers, or other players&apos; results, and your first answer is final.
        </p>
      </header>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Independent quality evidence</AlertTitle>
        <AlertDescription>
          Responses are stored under your account ID for duplicate prevention and used only in
          aggregate generator-quality measurements. Eligible accounts are at least 24 hours old and
          have completed three normal puzzles. A small set of known-answer calibration boards is
          mixed into early assignments to validate attention and task understanding; individual
          calibration boards are never labeled.
        </AlertDescription>
      </Alert>

      {progress && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex justify-between text-sm">
              <span>Your available sample</span>
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
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Playtest unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {specimen ? (
        <Card>
          <CardHeader>
            <CardTitle>What word or phrase does this mean?</CardTitle>
            <CardDescription>
              Say what you genuinely see; do not search for the answer.
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
                placeholder="Enter the word or phrase"
                spellCheck={false}
                value={guess}
              />
              <fieldset>
                <legend className="mb-2 text-sm">How confident are you?</legend>
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
              </fieldset>
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
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>You completed every available puzzle</AlertTitle>
            <AlertDescription>
              Thank you. New AI-generated boards enter the blind queue after passing automated
              publication checks.
            </AlertDescription>
          </Alert>
        )
      )}
    </main>
  );
}
