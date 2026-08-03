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


export function BenchmarkReviewShellLower(props: Record<string, any>) {
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

      <div className="flex items-center justify-between gap-3">
        <Select
          onValueChange={(value: FilterStatus) => {
            setStatus(value);
            setPage(1);
          }}
          value={status}
        >
          <SelectTrigger aria-label="Filter reviews by status" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All reviews</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button disabled={loading} onClick={() => void loadQueue()} size="sm" variant="ghost">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            data-icon="inline-start"
          />{" "}
          Refresh
        </Button>
      </div>

      {notImported && (
        <Alert>
          <AlertTitle>
            <AlertTriangle className="h-4 w-4" data-icon="inline-start" aria-hidden />
            No benchmark imported
          </AlertTitle>
          <AlertDescription>
            Run the pinned metadata importer, then upload its ignored JSON artifact here. Tampered,
            unpinned, or invalid corpora are rejected before persistence.
          </AlertDescription>
        </Alert>
      )}

      {loading && !queue ? (
        <Card>
          <CardContent className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      ) : current ? (
        <Card className="overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex min-h-[420px] items-center justify-center bg-[#f4f6f3] p-8">
              {/* biome-ignore lint/performance/noImgElement: Pinned benchmark images are reference-only and must not be transformed or cached by Next Image. */}
              <img
                alt="External rebus benchmark under review"
                className="max-h-[520px] max-w-full rounded-md object-contain shadow-sm"
                loading="eager"
                referrerPolicy="no-referrer"
                src={current.imageUrl}
              />
            </div>
            <div className="space-y-5 p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Row {current.datasetRow}</Badge>
                <Badge variant="outline">{current.difficulty}</Badge>
                <span className="ml-auto text-muted-foreground text-xs">v{current.version}</span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                  Intended answer
                </p>
                <p className="mt-1 font-semibold text-2xl">{current.answer}</p>
                {current.hint && (
                  <p className="mt-2 text-muted-foreground text-sm">Hint: {current.hint}</p>
                )}
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                <p className="font-medium">Review both claims</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>The source permits this reference-only evaluation use.</li>
                  <li>The image is legible, fair, and actually maps to the stated answer.</li>
                  <li>No generated or duplicate variant is being counted independently.</li>
                </ul>
                <a
                  className="mt-3 inline-flex items-center text-primary text-sm hover:underline"
                  href={current.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Check {sourceHost(current.sourceUrl)} <ExternalLink data-icon="inline-end" className="ml-1 h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>Rights {decisionBadge(current.rightsDecision)}</span>
                <span>Answer {decisionBadge(current.answerDecision)}</span>
              </div>
              <div>
                <label className="font-medium text-sm" htmlFor="review-note">
                  Audit note
                </label>
                <Textarea
                  className="mt-2 min-h-20"
                  id="review-note"
                  maxLength={500}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Permission reference, correction, or rejection reason"
                  value={note}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button disabled={saving} onClick={() => void submitDecision("approve")}>
                  <Check className="mr-2 h-4 w-4" data-icon="inline-start" /> Approve both{" "}
                  <kbd className="ml-auto text-xs opacity-60">A</kbd>
                </Button>
                <Button disabled={saving} onClick={skipCurrent} variant="outline">
                  <SkipForward className="mr-2 h-4 w-4" data-icon="inline-start" /> Skip{" "}
                  <kbd className="ml-auto text-xs opacity-60">S</kbd>
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void submitDecision("reject-rights")}
                  variant="destructive"
                >
                  <ShieldX className="mr-2 h-4 w-4" data-icon="inline-start" /> Reject rights{" "}
                  <kbd className="ml-auto text-xs opacity-70">R</kbd>
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void submitDecision("reject-answer")}
                  variant="destructive"
                >
                  <X className="mr-2 h-4 w-4" data-icon="inline-start" /> Wrong answer{" "}
                  <kbd className="ml-auto text-xs opacity-70">W</kbd>
                </Button>
              </div>
              {current.reviewStatus !== "pending" && (
                <Button
                  disabled={saving}
                  onClick={() => void submitDecision("reset")}
                  size="sm"
                  variant="ghost"
                >
                  <RotateCcw className="mr-2 h-4 w-4" data-icon="inline-start" /> Return to pending
                </Button>
              )}
              <p className="text-center text-muted-foreground text-xs">
                Showing {queue.total ? 1 : 0} of {queue.total} {status} reviews · page {queue.page}/
                {queue.totalPages}
              </p>
            </div>
          </div>
        </Card>
      ) : queue ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Check className="mb-3 h-10 w-10 text-emerald-600" />
            <p className="font-medium text-lg">
              No {status === "all" ? "" : status} reviews in this queue
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Change the filter or import the pinned artifact.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {queue && queue.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            disabled={loading || queue.page <= 1}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            variant="outline"
          >
            Previous page
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {queue.page} of {queue.totalPages}
          </span>
          <Button
            disabled={loading || queue.page >= queue.totalPages}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            variant="outline"
          >
            Next page
          </Button>
        </div>
      )}
    </div>    </>
  );
}
