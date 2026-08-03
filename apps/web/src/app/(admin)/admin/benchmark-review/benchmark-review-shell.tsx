"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileUp,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldX,
  SkipForward,
  X,
} from "lucide-react";
import { AppLink } from "@/components/AppLink";
import { useEffect, useState } from "react";
import type { ExternalCorpusReadinessReport } from "@/ai/puzzle-agent/benchmark/external-corpus";
import { AuthGate } from "@/components/AuthGate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  BenchmarkReviewDecision,
  BenchmarkReviewFixture,
  BenchmarkReviewStatus,
} from "@/db/models";
import { useToast } from "@/hooks/use-toast";
import { safeJsonParse } from "@/lib/utils";
import { fail } from "@/lib/fail";
import { withLoadingFlag } from "@/lib/with-loading-flag";

type Queue = {
  items: BenchmarkReviewFixture[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  progress: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    readiness: ExternalCorpusReadinessReport;
  };
};

type FilterStatus = BenchmarkReviewStatus | "all";
type DecisionAction = "approve" | "reject-rights" | "reject-answer" | "reset";

const DATASET_ID = "re-bus-hf-v1";

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "source";
  }
}

function decisionFor(
  item: BenchmarkReviewFixture,
  action: DecisionAction
): { rights: BenchmarkReviewDecision; answer: BenchmarkReviewDecision } {
  switch (action) {
    case "approve":
      return { rights: "approved", answer: "approved" };
    case "reject-rights":
      return { rights: "rejected", answer: item.answerDecision };
    case "reject-answer":
      return { rights: item.rightsDecision, answer: "rejected" };
    case "reset":
      return { rights: "pending", answer: "pending" };
  }
}

function decisionBadge(value: BenchmarkReviewDecision) {
  const variant =
    value === "approved" ? "default" : value === "rejected" ? "destructive" : "secondary";
  return <Badge variant={variant}>{value}</Badge>;
}

export default function BenchmarkReviewPage() {
  return (
    <AuthGate>
      <BenchmarkReviewPageInner />
    </AuthGate>
  );
}


import { BenchmarkReviewShellLower } from "./benchmark-review-shell-lower";

export function BenchmarkReviewShell(props: Record<string, any>) {
  const {
    approvalPercent,
    artifact,
    current,
    data,
    decisions,
    importArtifact,
    importing,
    loadQueue,
    loading,
    notImported,
    note,
    onKeyDown,
    page,
    params,
    progress,
    queue,
    response,
    saving,
    setImporting,
    setLoading,
    setNotImported,
    setNote,
    setPage,
    setQueue,
    setSaving,
    setStatus,
    skipCurrent,
    status,
    submitDecision,
    target
  } = props;
    return (
    <>

    <div className="mx-auto min-h-[calc(100vh-120px)] max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
            Human calibration
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">Benchmark review</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Verify source rights, visible quality, and intended answers before a public puzzle can
            calibrate the blind evaluators. Reviews never become generation material.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <AppLink href="/api/admin/ai/benchmark-reviews/export" prefetch={false}>
              <Download className="mr-2 h-4 w-4" data-icon="inline-start" /> Export reviews
            </AppLink>
          </Button>
          <Button asChild variant="outline">
            <label className="cursor-pointer">
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" data-icon="inline-start" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" data-icon="inline-start" />
              )}
              Import pinned artifact
              <input
                accept="application/json,.json"
                className="sr-only"
                disabled={importing}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importArtifact(file);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
          </Button>
        </div>
      </div>

      {progress && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Approved", progress.approved, "text-emerald-600"],
            ["Pending", progress.pending, "text-amber-600"],
            ["Rejected", progress.rejected, "text-rose-600"],
            ["Total originals", progress.total, "text-foreground"],
          ].map(([label, value, color]) => (
            <Card key={String(label)}>
              <CardContent className="pt-5">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
                <p className={`mt-1 font-semibold text-3xl ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {progress && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">External readiness</CardTitle>
                <CardDescription>
                  {progress.approved}/100 minimum human-approved originals
                </CardDescription>
              </div>
              <Badge variant={progress.readiness.promotion.passed ? "default" : "secondary"}>
                {progress.readiness.promotion.passed ? "Ready" : "Evidence incomplete"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={Math.min(100, approvalPercent)} />
            {!progress.readiness.promotion.passed && (
              <div className="grid gap-1 text-muted-foreground text-xs md:grid-cols-2">
                {progress.readiness.promotion.failures.slice(0, 8).map((failure) => (
                  <p className="flex gap-2" key={failure}>
                    <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" /> {failure}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <BenchmarkReviewShellLower {...props} />
    </>
  );
}
