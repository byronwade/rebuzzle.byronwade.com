"use client";

import {
  Activity,
  Bell,
  BookOpenCheck,
  Share2,
  Smartphone,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type NativeFunnelSummary = {
  openedAccountDays: number;
  finishedAccountDays: number;
  shareStartedAccountDays: number;
  shareCompletedAccountDays: number;
  shareOpenWithStartDays: number;
  shareOpenWithFinishDays: number;
  finishOpenRatio: number;
  entrySources: {
    app: number;
    notification: number;
    widget: number;
    shortcut: number;
    share: number;
  };
  multiDayReturners: number;
  plusOfferViewers: number;
  plusPurchaseStarters: number;
  plusVerifiedPurchasers: number;
  plusPendingAccounts: number;
  plusCancelledAccounts: number;
  plusUnverifiedAccounts: number;
  plusFailedAccounts: number;
  plusRestoreCompletedAccounts: number;
  plusRestoreEmptyAccounts: number;
  plusRestoreFailedAccounts: number;
  plusSameDayPurchasers: number;
  plusSameDayConversionRate: number;
  plusOffersBySource: Record<PlusOfferSource, PlusOfferSourceSummary>;
  reminderEnabledAccounts: number;
  dailySolvePulseViewAccountDays: number;
  qualityFeedback: {
    too_easy: number;
    just_right: number;
    tough_but_fair: number;
    unclear: number;
  };
  dailyPuzzleQuality: DailyPuzzleQualitySummary[];
};

type PlusOfferSource = "archive" | "settings" | "journey_insights" | "journal" | "free_sample";
type PlusOfferSourceSummary = {
  viewerAccounts: number | null;
  purchaseStarterAccounts: number | null;
  verifiedPurchaserAccounts: number | null;
  pendingAccounts: number | null;
  cancelledAccounts: number | null;
  unverifiedAccounts: number | null;
  failedAccounts: number | null;
  sameDayVerifiedPurchaserAccounts: number | null;
  sameDayConversionRate: number | null;
};

type DailyPuzzleQualitySummary = {
  puzzleDate: string;
  players: number;
  medianWallClockHoursToSolve: number | null;
  guessBuckets: { one: number; two: number; three: number; fourPlus: number };
  outcomes: {
    solved: number;
    revealed: number;
    expired: number;
    ranOut: number;
    inProgress: number;
  };
  nativeRatings: {
    total: number;
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
  { key: "share", label: "Shared link", icon: Share2 },
] as const;

const qualityLabels = [
  { key: "too_easy", label: "Too easy" },
  { key: "just_right", label: "Just right" },
  { key: "tough_but_fair", label: "Tough but fair" },
  { key: "unclear", label: "Clues didn’t click" },
] as const;

const dailyRatingLabels = [
  { key: "too_easy", label: "Too easy" },
  { key: "just_right", label: "Just right" },
  { key: "tough_but_fair", label: "Tough but fair" },
  { key: "unclear", label: "Unclear" },
] as const;

const plusOfferSourceLabels = [
  { key: "archive", label: "Archive" },
  { key: "settings", label: "Settings" },
  { key: "journey_insights", label: "Journey insights" },
  { key: "journal", label: "Journal" },
  { key: "free_sample", label: "Free sample" },
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
            <CardTitle>Daily Growth Funnel</CardTitle>
            <CardDescription>
              iOS and web · rolling 30 days · account-level aggregates
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-5">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
              <DailySolvePulseMetric accountDays={summary.dailySolvePulseViewAccountDays} />
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
              <Metric
                label="Share started"
                value={count(summary.shareStartedAccountDays)}
                detail="Distinct account-days"
              />
              <Metric
                label="Share activity completed"
                value={count(summary.shareCompletedAccountDays)}
                detail="iOS reported success; delivery is unmeasured"
              />
              <Metric
                label="Shared link → guess"
                value={count(summary.shareOpenWithStartDays)}
                detail="Share-open account-days with a first guess"
              />
              <Metric
                label="Shared link → finish"
                value={count(summary.shareOpenWithFinishDays)}
                detail="Share-open account-days with a server-recorded finish"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                <h3 className="font-medium text-sm">How people returned</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
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
                  account on a day. Share-linked starts and finishes are account-day overlaps; they
                  do not prove a distinct recipient played.
                </p>
              </div>
            </div>

            <section
              aria-labelledby="plus-funnel-heading"
              className="space-y-4 rounded-2xl border bg-primary/[0.025] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3
                    id="plus-funnel-heading"
                    className="flex items-center gap-2 font-semibold text-base"
                  >
                    <Sparkles className="size-4 text-primary" aria-hidden="true" />
                    Plus purchase funnel
                  </h3>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Unique accounts · rolling 30 days
                  </p>
                </div>
                <div className="rounded-full border bg-background/70 px-3 py-1 text-muted-foreground text-xs">
                  One-time purchase
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <FunnelStep label="Offer viewed" value={summary.plusOfferViewers} />
                <FunnelStep label="Purchase started" value={summary.plusPurchaseStarters} />
                <FunnelStep label="Purchase verified" value={summary.plusVerifiedPurchasers} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.25fr]">
                <div className="rounded-xl border bg-background/70 p-4">
                  <div className="text-muted-foreground text-xs">Same-day conversion</div>
                  <div className="mt-1 font-semibold text-3xl tabular-nums">
                    {(summary.plusSameDayConversionRate * 100).toFixed(1)}%
                  </div>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {count(summary.plusSameDayPurchasers)} of {count(summary.plusOfferViewers)}{" "}
                    offer-viewing accounts verified Plus on the same local puzzle day.
                  </p>
                  <div
                    aria-label={`Same-day conversion: ${(summary.plusSameDayConversionRate * 100).toFixed(1)} percent`}
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="img"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, Math.max(0, summary.plusSameDayConversionRate * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border bg-background/70 p-4">
                  <div>
                    <div className="font-medium text-sm">Purchase outcomes</div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                      <OutcomeCount label="Pending approval" value={summary.plusPendingAccounts} />
                      <OutcomeCount label="Cancelled" value={summary.plusCancelledAccounts} />
                      <OutcomeCount label="Unverified" value={summary.plusUnverifiedAccounts} />
                      <OutcomeCount label="Failed" value={summary.plusFailedAccounts} />
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="font-medium text-sm">Restore outcomes</div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                      <OutcomeCount label="Restored" value={summary.plusRestoreCompletedAccounts} />
                      <OutcomeCount
                        label="Nothing to restore"
                        value={summary.plusRestoreEmptyAccounts}
                      />
                      <OutcomeCount
                        label="Restore failed"
                        value={summary.plusRestoreFailedAccounts}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <PlusOfferSourceBreakdown sources={summary.plusOffersBySource} />

              <p className="border-t pt-3 text-muted-foreground text-xs">
                These are account counts, not revenue or proceeds. Use App Store Connect for sales,
                refunds, and proceeds.
              </p>
            </section>

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

            <DailyPuzzleQualityTable rows={summary.dailyPuzzleQuality ?? []} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PlusOfferSourceBreakdown({
  sources,
}: {
  sources: Record<PlusOfferSource, PlusOfferSourceSummary>;
}) {
  const displayCount = (value: number | null) => (value === null ? "Hidden (<5)" : count(value));

  return (
    <section
      aria-label="Plus offer performance by entry surface"
      className="space-y-3 border-t pt-4"
    >
      <div>
        <h4 className="font-medium text-sm">Offer performance by entry surface</h4>
        <p className="mt-1 text-muted-foreground text-xs">
          Unique account counts. Accounts may appear under more than one surface; counts are not raw
          taps or revenue.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plusOfferSourceLabels.map(({ key, label }) => {
          const source = sources[key];
          return (
            <article className="space-y-3 rounded-xl border bg-background/70 p-3" key={key}>
              <h5 className="font-semibold text-sm">{label}</h5>
              <div className="grid grid-cols-3 gap-2">
                <SourceMetric label="Viewed" value={displayCount(source.viewerAccounts)} />
                <SourceMetric
                  label="Started"
                  value={displayCount(source.purchaseStarterAccounts)}
                />
                <SourceMetric
                  label="Verified"
                  value={displayCount(source.verifiedPurchaserAccounts)}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 border-t pt-2">
                <SourceMetric label="Pending" value={displayCount(source.pendingAccounts)} />
                <SourceMetric label="Cancelled" value={displayCount(source.cancelledAccounts)} />
                <SourceMetric label="Unverified" value={displayCount(source.unverifiedAccounts)} />
                <SourceMetric label="Failed" value={displayCount(source.failedAccounts)} />
              </div>
              <div className="flex items-end justify-between gap-2 border-t pt-2">
                <SourceMetric
                  label="Same-day verified"
                  value={displayCount(source.sameDayVerifiedPurchaserAccounts)}
                />
                <div className="text-right">
                  <div className="text-muted-foreground text-xs">Same-day conversion</div>
                  <div className="font-semibold tabular-nums">
                    {source.sameDayConversionRate === null
                      ? "Hidden (<5)"
                      : `${(source.sameDayConversionRate * 100).toFixed(1)}%`}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SourceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold tabular-nums text-sm">{value}</div>
      <div className="truncate text-muted-foreground text-[11px]">{label}</div>
    </div>
  );
}

export function DailyPuzzleQualityTable({ rows }: { rows: DailyPuzzleQualitySummary[] }) {
  return (
    <section aria-labelledby="daily-puzzle-patterns-heading" className="space-y-4">
      <div>
        <h3 id="daily-puzzle-patterns-heading" className="font-semibold text-base">
          Daily puzzle play patterns
        </h3>
        <p className="mt-1 text-muted-foreground text-xs">
          All platforms · latest 30 active puzzle dates · server-recorded player-days
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-muted/20 p-4 text-muted-foreground text-sm">
          No server-recorded daily guesses in this period.
        </p>
      ) : (
        <div
          aria-label="Daily puzzle play patterns; scroll horizontally to see all columns"
          className="overflow-x-auto rounded-lg border"
          role="region"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard focus is needed to scroll this wide data table.
          tabIndex={0}
        >
          <table
            aria-label="Daily puzzle play patterns by date"
            className="min-w-[1080px] w-full border-collapse text-left text-sm"
          >
            <caption className="sr-only">
              All-platform player counts, guess counts, terminal outcomes, and qualifying median
              wall-clock time to solve by local puzzle date.
            </caption>
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="border-b">
                <th className="whitespace-nowrap px-3 py-2 text-left" rowSpan={2} scope="col">
                  Puzzle date
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-right" rowSpan={2} scope="col">
                  Players
                </th>
                <th className="px-3 py-2 text-center" colSpan={4} scope="colgroup">
                  Guesses per player-day
                </th>
                <th className="px-3 py-2 text-center" colSpan={5} scope="colgroup">
                  Outcome per player-day
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-right" rowSpan={2} scope="col">
                  Median wall-clock to solve
                </th>
              </tr>
              <tr className="border-b text-xs">
                {[
                  "1 guess",
                  "2 guesses",
                  "3 guesses",
                  "4+ guesses",
                  "Solved",
                  "Revealed",
                  "Expired",
                  "Ran out",
                  "In progress",
                ].map((label) => (
                  <th className="whitespace-nowrap px-3 py-2 text-right" key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b last:border-0" key={row.puzzleDate}>
                  <th className="whitespace-nowrap px-3 py-2 font-medium" scope="row">
                    <time dateTime={row.puzzleDate}>{formatPuzzleDate(row.puzzleDate)}</time>
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums">{count(row.players)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.guessBuckets.one)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.guessBuckets.two)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.guessBuckets.three)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.guessBuckets.fourPlus)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.outcomes.solved)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.outcomes.revealed)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.outcomes.expired)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.outcomes.ranOut)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.outcomes.inProgress)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {row.medianWallClockHoursToSolve === null
                      ? "Not enough data"
                      : `${row.medianWallClockHoursToSolve.toFixed(1)} h`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t pt-3 text-muted-foreground text-xs">
        Guess buckets count actual guesses; reveal and expiry rows are outcomes, not guesses. These
        records do not measure thinking time or enjoyment, and they omit play that never reached the
        server.
      </p>

      <p className="text-muted-foreground text-xs">
        Median wall-clock time runs from the first recorded session restore to a correct solve and
        includes idle/background time. Session restoration is requested during initial daily setup,
        so it approximates presentation but does not prove attention or exact first render. It is
        not active thinking time. Dates appear only after at least five qualifying solves; “first
        recorded” accounts for analytics write retries.
      </p>

      <DailyPuzzleRatingsTable rows={rows} />
    </section>
  );
}

function DailyPuzzleRatingsTable({ rows }: { rows: DailyPuzzleQualitySummary[] }) {
  const ratingCount = rows.reduce((total, row) => total + row.nativeRatings.total, 0);

  return (
    <section aria-labelledby="daily-puzzle-ratings-heading" className="space-y-4 border-t pt-5">
      <div>
        <h3 id="daily-puzzle-ratings-heading" className="font-semibold text-base">
          Player ratings by puzzle date
        </h3>
        <p className="mt-1 text-muted-foreground text-xs">
          Native app · optional, self-selected responses
        </p>
      </div>

      {ratingCount === 0 ? (
        <p className="rounded-lg border bg-muted/20 p-4 text-muted-foreground text-sm">
          No optional native-app ratings for these puzzle dates yet.
        </p>
      ) : (
        <div
          aria-label="Player ratings by puzzle date; scroll horizontally to see all columns"
          className="overflow-x-auto rounded-lg border"
          role="region"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard focus is needed to scroll this wide data table.
          tabIndex={0}
        >
          <table
            aria-label="Player ratings by puzzle date"
            className="min-w-[720px] w-full border-collapse text-left text-sm"
          >
            <caption className="sr-only">
              Optional, self-selected native-app ratings by local puzzle date. This sample is not
              matched to all-platform gameplay counts.
            </caption>
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="border-b">
                <th className="whitespace-nowrap px-3 py-2 text-left" scope="col">
                  Puzzle date
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-right" scope="col">
                  Responses
                </th>
                {dailyRatingLabels.map(({ key, label }) => (
                  <th className="whitespace-nowrap px-3 py-2 text-right" key={key} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b last:border-0" key={row.puzzleDate}>
                  <th className="whitespace-nowrap px-3 py-2 font-medium" scope="row">
                    <time dateTime={row.puzzleDate}>{formatPuzzleDate(row.puzzleDate)}</time>
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {count(row.nativeRatings.total)}
                  </td>
                  {dailyRatingLabels.map(({ key }) => (
                    <td className="px-3 py-2 text-right tabular-nums" key={key}>
                      {count(row.nativeRatings[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t pt-3 text-muted-foreground text-xs">
        These ratings are optional and self-selected. They come from the native app and are not
        matched to all-platform gameplay counts, so compare them as separate signals.
      </p>
    </section>
  );
}

function formatPuzzleDate(puzzleDate: string) {
  const date = new Date(`${puzzleDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return puzzleDate;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-h-20 flex-col justify-between rounded-xl border bg-background/70 p-3.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="font-semibold text-2xl tabular-nums">{count(value)}</div>
    </div>
  );
}

function OutcomeCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-semibold tabular-nums">{count(value)}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
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

export function DailySolvePulseMetric({ accountDays }: { accountDays: number }) {
  return (
    <Metric
      label="Solve mix viewed"
      value={count(accountDays)}
      detail="Optional post-solve view · distinct account-days"
    />
  );
}
