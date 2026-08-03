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


export function useBenchmarkReview(props: any = {}) {

  const { toast } = useToast();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [status, setStatus] = useState<FilterStatus>("pending");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notImported, setNotImported] = useState(false);
  const [note, setNote] = useState("");

  const loadQueue = 
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
            window.location.assign("/login");
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

    };

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const current = queue?.items[0];

  const submitDecision = 
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

    };

  const skipCurrent = () => {
    setQueue((existing) =>
      existing && existing.items.length > 1
        ? { ...existing, items: [...existing.items.slice(1), existing.items[0]!] }
        : existing
    );
    setNote("");
  };

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


  return {
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
  };
}
