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


import { PuzzlePlaytestsShellLower } from "./puzzle-playtests-shell-lower";

export function PuzzlePlaytestsShell(props: Record<string, any>) {
  const {
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
  } = props;
  if (loading) {
      return (
    <>

      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const completion = progress ? (progress.completed / Math.max(1, progress.available)) * 100 : 0;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-6">      <PuzzlePlaytestsShellLower {...props} />
    </>
  );
}
