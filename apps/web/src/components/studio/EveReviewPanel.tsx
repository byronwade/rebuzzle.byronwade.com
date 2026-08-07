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

const PHASE_DOT: Record<LivePhase["status"], string> = {
  pending: "bg-border-strong",
  running: "bg-foreground animate-pulse",
  done: "bg-success",
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

export function EveReviewPanel({ state }: { state: EveReviewLiveState }) {
  const activePhase = state.phases.find((p) => p.status === "running");
  const latestThinking =
    [...state.thinking].reverse().find((t) => t.phaseId === activePhase?.id) ??
    state.thinking[state.thinking.length - 1];
  const latestAnswer = state.answers[state.answers.length - 1];

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-border bg-inset px-4 py-3">
        <h3 className="font-semibold text-sm tracking-[-0.01em]">What Eve checks</h3>
        <p className="mt-1 text-muted-foreground text-xs leading-5">
          Safety first, then structure, quality floors, adversarial critique, and optional player
          simulation. Status, thinking, and answers stream live.
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {state.phases.map((phase) => (
            <li
              className="flex gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-xs"
              key={phase.id}
            >
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", PHASE_DOT[phase.status])} />
              <span>
                <span className="font-medium">{phase.label}</span>
                <span className="mt-0.5 block text-muted-foreground">{phase.summary}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {state.running || latestThinking || latestAnswer ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] text-subtle uppercase tracking-[0.14em]">
              {state.running ? "Eve is thinking" : "Latest answer"}
            </p>
            {activePhase ? (
              <span className="rounded-full border border-border bg-inset px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
                {activePhase.label}
              </span>
            ) : null}
          </div>
          {latestThinking ? <p className="mt-2 text-sm leading-6">{latestThinking.text}</p> : null}
          {latestAnswer ? (
            <p className="mt-2 border-border border-t pt-2 font-medium text-sm">
              {latestAnswer.summary}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="max-h-[360px] space-y-2 overflow-auto rounded-lg border border-border bg-card p-3">
        {state.checks.map((check) => (
          <div className="rounded-md border border-border px-3 py-2.5" key={check.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]",
                  STATUS_STYLES[check.status]
                )}
              >
                {check.status}
              </span>
              <span className="font-medium text-sm">{check.label}</span>
              {check.spend && check.spend !== "none" ? (
                <span className="font-mono text-[10px] text-subtle uppercase tracking-[0.1em]">
                  {check.spend}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">Looking for: {check.lookingFor}</p>
            {check.thinking ? (
              <p className="mt-1 text-subtle text-xs italic">Thinking: {check.thinking}</p>
            ) : null}
            {check.detail ? <p className="mt-1 text-xs">Answer: {check.detail}</p> : null}
          </div>
        ))}
      </div>

      {state.verdict ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            state.verdict === "ship"
              ? "border-success/40 bg-success/10"
              : state.verdict === "reject"
                ? "border-destructive/40 bg-destructive/10"
                : "border-warning/40 bg-warning/10"
          )}
        >
          <p className="font-semibold capitalize">Verdict: {state.verdict}</p>
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
                <li key={w}>Warning: {w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
