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
import { type FormEvent, useEffect, useRef, useState } from "react";
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


export function usePuzzlePlaytests(props: any = {}) {

  const { toast } = useToast();
  const [specimen, setSpecimen] = useState<BlindPuzzlePlaytestSpecimen | null>(null);
  const [progress, setProgress] = useState<PuzzlePlaytestProgress | null>(null);
  const [report, setReport] = useState<PuzzlePlaytestReport | null>(null);
  const [backfillReport, setBackfillReport] = useState<PuzzlePlaytestBackfillReport | null>(null);
  const [guess, setGuess] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [failureReason, setFailureReason] = useState<PuzzlePlaytestFailureReason | "">("");
  const shownAtRef = useRef(0);
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
        shownAtRef.current = Date.now();
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
            elapsedMs: Date.now() - shownAtRef.current,
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


  return {
    backfillLoading,
    backfillReport,
    confidence,
    data,
    error,
    failureReason,
    guess,
    isSubmitting,
    loadNext,
    loadReport,
    loading,
    onSubmit,
    progress,
    report,
    response,
    runBackfill,
    setBackfillLoading,
    setBackfillReport,
    setConfidence,
    setError,
    setFailureReason,
    setGuess,
    setIsSubmitting,
    setLoading,
    setProgress,
    setReport,
    setSpecimen,
    shownAtRef,
    specimen,
    submit
  };
}
