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
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ExternalCorpusReadinessReport } from "@/ai/puzzle-agent/benchmark/external-corpus";
import { useAuth } from "@/components/AuthProvider";
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
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [status, setStatus] = useState<FilterStatus>("pending");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notImported, setNotImported] = useState(false);
  const [note, setNote] = useState("");

  const loadQueue = useCallback(
    async (requestedPage = page) => {
      await withLoadingFlag(setLoading, async () => {
        try {
          const params = new URLSearchParams({
            datasetId: DATASET_ID,
            status,
            page: String(requestedPage),
            limit: "20",
          });
          const response = await fetch(`/api/admin/ai/benchmark-reviews?${params}`, {
            cache: "no-store",
          });
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          const data = await safeJsonParse<{ success: boolean; queue?: Queue; error?: string }>(
            response
          );
          if (response.status === 404) {
            setNotImported(true);
            setQueue(null);
            return;
          }
          if (!response.ok || !data?.queue)
            fail(data?.error || "Review queue unavailable");
          setQueue(data.queue);
          setPage(data.queue.page);
          setNotImported(false);
        } catch (error) {
          toast({
            title: "Review queue unavailable",
            description: error instanceof Error ? error.message : "Try again shortly",
            variant: "destructive",
          });
        }
      });

    },
    [page, router, status, toast]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    void loadQueue();
  }, [authLoading, isAuthenticated, loadQueue, router]);

  const current = queue?.items[0];

  const submitDecision = useCallback(
    async (action: DecisionAction) => {
      if (!current || saving) return;
      await withLoadingFlag(setSaving, async () => {
        try {
          const decisions = decisionFor(current, action);
          const response = await fetch("/api/admin/ai/benchmark-reviews", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: current.id,
              expectedVersion: current.version,
              ...decisions,
              note,
            }),
          });
          const data = await safeJsonParse<{ success: boolean; error?: string }>(response);
          if (!response.ok) fail(data?.error || "Decision was not saved");
          setNote("");
          await loadQueue(page);
        } catch (error) {
          toast({
            title: "Decision not saved",
            description: error instanceof Error ? error.message : "Refresh and try again",
            variant: "destructive",
          });
          if (error instanceof Error && error.message.includes("refresh")) await loadQueue(page);
        }
      });

    },
    [current, loadQueue, note, page, saving, toast]
  );

  const skipCurrent = useCallback(() => {
    setQueue((existing) =>
      existing && existing.items.length > 1
        ? { ...existing, items: [...existing.items.slice(1), existing.items[0]!] }
        : existing
    );
    setNote("");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.key.toLowerCase() === "a") void submitDecision("approve");
      if (event.key.toLowerCase() === "r") void submitDecision("reject-rights");
      if (event.key.toLowerCase() === "w") void submitDecision("reject-answer");
      if (event.key.toLowerCase() === "s") skipCurrent();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [skipCurrent, submitDecision]);

  const importArtifact = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Artifact too large", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const artifact: unknown = JSON.parse(await file.text());
      const response = await fetch("/api/admin/ai/benchmark-reviews/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ artifact }),
      });
      const data = await safeJsonParse<{
        success: boolean;
        inserted?: number;
        existing?: number;
        error?: string;
      }>(response);
      if (!response.ok) fail(data?.error || "Import failed");
      toast({
        title: "Benchmark imported",
        description: `${data?.inserted ?? 0} new fixtures; ${data?.existing ?? 0} already present.`,
      });
      setPage(1);
      await loadQueue(1);
    } catch (error) {
      toast({
        title: "Import rejected",
        description: error instanceof Error ? error.message : "Invalid benchmark artifact",
        variant: "destructive",
      });
    }
    setImporting(false);

  };

  const progress = queue?.progress;
  const approvalPercent = progress ? progress.approved : 0;

  return (
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
            <Link href="/api/admin/ai/benchmark-reviews/export" prefetch={false}>
              <Download className="mr-2 h-4 w-4" data-icon="inline-start" /> Export reviews
            </Link>
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
    </div>
  );
}
