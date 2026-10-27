"use client";

import { Activity, Bell, BookOpenCheck, Smartphone, Sparkles, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type NativeFunnelSummary = {
  openedAccountDays: number;
  finishedAccountDays: number;
  finishOpenRatio: number;
  entrySources: { app: number; notification: number; widget: number; shortcut: number };
  multiDayReturners: number;
  plusOfferViewers: number;
  reminderEnabledAccounts: number;
  qualityFeedback: {
    too_easy: number;
    just_right: number;
    tough_but_fair: number;
    unclear: number;
  };
};

const sourceLabels = [
  { key: "app", label: "App", icon: Smartphone },
  { key: "notification", label: "Reminder", icon: Bell },
  { key: "widget", label: "Widget", icon: BookOpenCheck },
  { key: "shortcut", label: "Siri / Shortcuts", icon: WandSparkles },
] as const;

const qualityLabels = [
  { key: "too_easy", label: "Too easy" },
  { key: "just_right", label: "Just right" },
  { key: "tough_but_fair", label: "Tough but fair" },
  { key: "unclear", label: "Clues didn’t click" },
] as const;

function count(value: number) {
  return value.toLocaleString();
}

export function NativeGrowthCard() {
  const [summary, setSummary] = useState<NativeFunnelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/native-funnel", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Funnel data unavailable");
        return (await response.json()) as { summary: NativeFunnelSummary };
      })
      .then((data) => {
        if (active) setSummary(data.summary);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const qualityResponseCount = summary
    ? Object.values(summary.qualityFeedback).reduce((total, value) => total + value, 0)
    : 0;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Native Daily Funnel</CardTitle>
            <CardDescription>Rolling 30 days · account-level aggregates</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div className="rounded-xl border p-4" key={item}>
                <Skeleton className="mb-3 h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        ) : error || !summary ? (
          <p className="rounded-lg bg-muted/40 p-4 text-muted-foreground text-sm">
            Native funnel data is temporarily unavailable. Refresh the dashboard to try again.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Daily opens"
                value={count(summary.openedAccountDays)}
                detail="Distinct account-days"
              />
              <Metric
                label="Daily finishes"
                value={count(summary.finishedAccountDays)}
                detail={`${(summary.finishOpenRatio * 100).toFixed(1)}% of opened account-days`}
              />
              <Metric
                label="Returned on 2+ days"
                value={count(summary.multiDayReturners)}
                detail="Accounts with multiple puzzle days"
              />
              <Metric
                label="Reminders enabled"
                value={count(summary.reminderEnabledAccounts)}
                detail="Successful schedules; delivery is unmeasured"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                <h3 className="font-medium text-sm">How people returned</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {sourceLabels.map(({ key, label, icon: Icon }) => (
                    <div
                      className="flex items-center gap-2 rounded-lg border bg-background/50 p-3"
                      key={key}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="font-semibold tabular-nums">
                          {count(summary.entrySources[key])}
                        </div>
                        <div className="truncate text-muted-foreground text-xs">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">
                  Source counts are non-exclusive: more than one entry path may be observed for an
                  account on a day.
                </p>
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                  Plus offer viewed
                </div>
                <div>
                  <div className="font-semibold text-3xl tabular-nums">
                    {count(summary.plusOfferViewers)}
                  </div>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Accounts that opened the Plus offer
                  </p>
                </div>
                <p className="border-t pt-3 text-muted-foreground text-xs">
                  Views indicate interest, not purchases. Use App Store Connect for verified sales.
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
              <div>
                <h3 className="font-medium text-sm">How players rated the daily</h3>
                <p className="mt-1 text-muted-foreground text-xs">
                  {count(qualityResponseCount)} optional ratings · rolling 30 days
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {qualityLabels.map(({ key, label }) => (
                  <div className="rounded-lg border bg-background/50 p-3" key={key}>
                    <div className="font-semibold tabular-nums text-lg">
                      {count(summary.qualityFeedback[key])}
                    </div>
                    <div className="text-muted-foreground text-xs">{label}</div>
                  </div>
                ))}
              </div>
              <p className="border-t pt-3 text-muted-foreground text-xs">
                Replies are optional and self-selected. Treat these counts as directional editorial
                input, not objective difficulty, fairness, or proof of enjoyment.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-semibold text-2xl tabular-nums">{value}</div>
      <div className="mt-1 text-muted-foreground text-xs">{detail}</div>
    </div>
  );
}
