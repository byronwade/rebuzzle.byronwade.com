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


export function useIconRecognition(props: any = {}) {

  const { toast } = useToast();
  const [panelId, setPanelId] = useState<IconRecognitionPanelId>("publication");
  const [specimen, setSpecimen] = useState<BlindIconRecognitionSpecimen | null>(null);
  const [progress, setProgress] = useState<IconRecognitionProgress | null>(null);
  const [report, setReport] = useState<IconRecognitionCalibrationReport | null>(null);
  const [guess, setGuess] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    const response = await fetch(`/api/admin/ai/icon-recognition?mode=report&panel=${panelId}`, {
      cache: "no-store",
    });
    if (response.status === 401) {
      window.location.assign("/login");
      return;
    }
    const data = await safeJsonParse<ReportResponse>(response);
    if (!response.ok || !data?.report) {
      fail(data?.error || "Failed to load calibration report");
    }
    setReport(data.report);
    if (data.reviewerProgress) setProgress(data.reviewerProgress);
  };

  const loadNext = async () => {
    await withLoadingFlag(setLoading, async () => {
      setError(null);
      setReport(null);
      try {
        const response = await fetch(`/api/admin/ai/icon-recognition?panel=${panelId}`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        const data = await safeJsonParse<NextResponse>(response);
        if (!response.ok || !data?.progress) {
          fail(data?.error || "Failed to load recognition specimen");
        }
        setSpecimen(data.specimen ?? null);
        setProgress(data.progress);
        if (data.progress.complete) await loadReport();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load recognition panel");
      }
    });

  };

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  const submit = async (input: { uncertain: boolean }) => {
    if (!specimen || isSubmitting) return;
    if (!input.uncertain && !guess.trim()) {
      toast({ title: "Enter the object name or choose I don't know", variant: "destructive" });
      return;
    }
    await withLoadingFlag(setIsSubmitting, async () => {
      try {
        const response = await fetch("/api/admin/ai/icon-recognition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panelId,
            fixtureId: specimen.fixtureId,
            guess: input.uncertain ? "" : guess,
            uncertain: input.uncertain,
          }),
        });
        const data = await safeJsonParse<NextResponse>(response);
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
    void submit({ uncertain: false });
  };

  const selectPanel = (nextPanelId: IconRecognitionPanelId) => {
    if (nextPanelId === panelId) return;
    setSpecimen(null);
    setProgress(null);
    setReport(null);
    setGuess("");
    setPanelId(nextPanelId);
  };


  return {
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
  };
}
