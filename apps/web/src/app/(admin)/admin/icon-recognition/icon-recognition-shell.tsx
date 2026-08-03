"use client";

import { Eye, Loader2, SkipForward } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useState } from "react";
import type {
  BlindIconRecognitionSpecimen,
  IconRecognitionCalibrationReport,
  IconRecognitionPanelId,
  IconRecognitionProgress,
} from "@/ai/puzzle-agent/review/icon-recognition-service";
import { AuthGate } from "@/components/AuthGate";
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
  return (
    <AuthGate>
      <IconRecognitionPageInner />
    </AuthGate>
  );
}


import { IconRecognitionShellLower } from "./icon-recognition-shell-lower";

export function IconRecognitionShell(props: Record<string, any>) {
  const {
    data,
    error,
    guess,
    isSubmitting,
    loadNext,
    loadReport,
    loading,
    onSubmit,
    panelId,
    progress,
    report,
    response,
    selectPanel,
    setError,
    setGuess,
    setIsSubmitting,
    setLoading,
    setPanelId,
    setProgress,
    setReport,
    setSpecimen,
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

  const completion = progress ? (progress.completed / Math.max(1, progress.total)) * 100 : 0;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:px-6">      <IconRecognitionShellLower {...props} />
    </>
  );
}
