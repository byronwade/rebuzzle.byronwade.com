"use client";

import { cn } from "@/lib/utils";

export type LiveCheckStatus = "pending" | "running" | "pass" | "fail" | "warn" | "skip";

export type LiveCheck = {
  id: string;
  label: string;
  lookingFor: string;
  phase: string;
  status: LiveCheckStatus;
  detail?: string;
  thinking?: string;
  severity?: string;
  spend?: string;
};

export type LivePhase = {
  id: string;
  label: string;
  summary: string;
  status: "pending" | "running" | "done";
};

export type LiveThinking = { phaseId: string; text: string };
export type LiveAnswer = {
  phaseId: string;
  summary: string;
  data?: Record<string, string | number | boolean | null>;
};

export type EveReviewLiveState = {
  reviewId?: string;
  running: boolean;
  phases: LivePhase[];
  checks: LiveCheck[];
  thinking: LiveThinking[];
  answers: LiveAnswer[];
  verdict?: "ship" | "revise" | "reject";
  summary?: string;
  blockers: string[];
  warnings: string[];
  error?: string;
};

const STATUS_STYLES: Record<LiveCheckStatus, string> = {
  pending: "bg-inset text-subtle",
  running: "bg-foreground text-background animate-pulse",
  pass: "bg-success/15 text-success",
  fail: "bg-destructive/15 text-destructive",
  warn: "bg-warning/15 text-warning",
  skip: "bg-inset text-subtle",
};

export function emptyEveReviewState(
  phases: Array<{ id: string; label: string; summary: string }> = [],
  checks: Array<{
    id: string;
    label: string;
    lookingFor: string;
    phase: string;
    severity?: string;
    spend?: string;
  }> = []
): EveReviewLiveState {
  return {
    running: false,
    phases: phases.map((p) => ({ ...p, status: "pending" })),
    checks: checks.map((c) => ({
      ...c,
      status: "pending",
    })),
    thinking: [],
    answers: [],
    blockers: [],
    warnings: [],
  };
}

const METER_STYLES: Record<LiveCheckStatus, string> = {
  pending: "bg-inset",
  running: "bg-foreground animate-pulse",
  pass: "bg-success",
  fail: "bg-destructive",
  warn: "bg-warning",
  skip: "bg-border-strong",
};

const VERDICT_COPY: Record<NonNullable<EveReviewLiveState["verdict"]>, string> = {
  ship: "Ready to publish",
  revise: "Needs changes",
  reject: "Can’t publish this one",
};

/**
 * Eve's check, shown like a level's clear check: a meter that fills as each
 * test runs, one line of what she is thinking now, the verdict, and every
 * check folded away for anyone who wants the detail.
 */
export function EveReviewPanel({ state }: { state: EveReviewLiveState }) {
  const activePhase = state.phases.find((p) => p.status === "running");
  const latestThinking =
    [...state.thinking].reverse().find((t) => t.phaseId === activePhase?.id) ??
    state.thinking[state.thinking.length - 1];
  const latestAnswer = state.answers[state.answers.length - 1];
  const finished = state.checks.filter((c) => c.status !== "pending" && c.status !== "running");
  const started = state.running || finished.length > 0 || Boolean(state.verdict);

  return (
    <div className="space-y-3">
      {state.checks.length ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <p className="font-medium">
              {state.running
                ? activePhase
                  ? activePhase.label
                  : "Starting"
                : state.verdict
                  ? "Check complete"
                  : "Not checked yet"}
            </p>
            <p className="font-mono text-subtle tabular-nums">
              {finished.length}/{state.checks.length}
            </p>
          </div>
          <div aria-hidden className="mt-2 flex gap-0.5">
            {state.checks.map((check) => (
              <span
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors",
                  METER_STYLES[check.status]
                )}
                key={check.id}
              />
            ))}
          </div>
          {state.running && latestThinking ? (
            <p aria-live="polite" className="mt-3 text-muted-foreground text-sm leading-6">
              {latestThinking.text}
            </p>
          ) : null}
          {!state.running && latestAnswer && !state.verdict ? (
            <p className="mt-3 text-sm leading-6">{latestAnswer.summary}</p>
          ) : null}
          {!started ? (
            <p className="mt-3 text-muted-foreground text-xs leading-5">
              {state.phases.map((p) => p.label).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.verdict ? (
        <div
          className={cn(
            "rb-enter rounded-xl border px-4 py-3 text-sm",
            state.verdict === "ship"
              ? "border-success/40 bg-success/10"
              : state.verdict === "reject"
                ? "border-destructive/40 bg-destructive/10"
                : "border-warning/40 bg-warning/10"
          )}
        >
          <p className="font-semibold">{VERDICT_COPY[state.verdict]}</p>
          {state.summary ? <p className="mt-1 opacity-90">{state.summary}</p> : null}
          {state.blockers.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {state.warnings.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 opacity-80">
              {state.warnings.map((w) => (
                <li key={w}>Worth a look: {w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      {started && state.checks.length ? (
        <details className="rounded-xl border border-border bg-card">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium text-sm">
            Every check
          </summary>
          <ul className="max-h-[360px] space-y-2 overflow-auto border-border border-t p-3">
            {state.checks.map((check) => (
              <li className="rounded-lg border border-border px-3 py-2.5" key={check.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold text-xs",
                      STATUS_STYLES[check.status]
                    )}
                  >
                    {check.status}
                  </span>
                  <span className="font-medium text-sm">{check.label}</span>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  Looking for: {check.lookingFor}
                </p>
                {check.detail ? <p className="mt-1 text-xs">{check.detail}</p> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
