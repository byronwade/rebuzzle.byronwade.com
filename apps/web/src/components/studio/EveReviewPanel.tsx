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
  pending: "bg-teal-50 text-teal-800/55",
  running: "bg-sky-100 text-sky-900 animate-pulse",
  pass: "bg-emerald-100 text-emerald-900",
  fail: "bg-rose-100 text-rose-900",
  warn: "bg-amber-100 text-amber-950",
  skip: "bg-stone-100 text-stone-600",
};

const PHASE_DOT: Record<LivePhase["status"], string> = {
  pending: "bg-teal-900/20",
  running: "bg-sky-500 animate-pulse",
  done: "bg-emerald-600",
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
      <div className="rounded-xl border border-teal-900/10 bg-teal-50/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-teal-950">What Eve checks</h3>
        <p className="mt-1 text-xs text-teal-900/65">
          Safety first, then structure, quality floors, adversarial critique, and optional player
          simulation. Status, thinking, and answers stream live.
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {state.phases.map((phase) => (
            <li
              className="flex gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs text-teal-950"
              key={phase.id}
            >
              <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", PHASE_DOT[phase.status])} />
              <span>
                <span className="font-medium">{phase.label}</span>
                <span className="mt-0.5 block text-teal-900/55">{phase.summary}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {state.running || latestThinking || latestAnswer ? (
        <div className="rounded-xl border border-teal-900/10 bg-white/80 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-900/55">
              {state.running ? "Eve is thinking" : "Latest answer"}
            </p>
            {activePhase ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-900">
                {activePhase.label}
              </span>
            ) : null}
          </div>
          {latestThinking ? (
            <p className="mt-2 text-sm leading-6 text-teal-950/90">{latestThinking.text}</p>
          ) : null}
          {latestAnswer ? (
            <p className="mt-2 border-t border-teal-900/10 pt-2 text-sm font-medium text-teal-950">
              {latestAnswer.summary}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-teal-900/10 bg-white/70 p-3">
        {state.checks.map((check) => (
          <div className="rounded-lg border border-teal-900/5 px-3 py-2.5" key={check.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  STATUS_STYLES[check.status]
                )}
              >
                {check.status}
              </span>
              <span className="text-sm font-medium text-teal-950">{check.label}</span>
              {check.spend && check.spend !== "none" ? (
                <span className="text-[10px] uppercase tracking-wide text-teal-900/40">
                  {check.spend}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-teal-900/60">Looking for: {check.lookingFor}</p>
            {check.thinking ? (
              <p className="mt-1 text-xs italic text-teal-900/50">Thinking: {check.thinking}</p>
            ) : null}
            {check.detail ? (
              <p className="mt-1 text-xs text-teal-950/85">Answer: {check.detail}</p>
            ) : null}
          </div>
        ))}
      </div>

      {state.verdict ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            state.verdict === "ship"
              ? "border-teal-800/20 bg-teal-50 text-teal-950"
              : state.verdict === "reject"
                ? "border-rose-200 bg-rose-50 text-rose-950"
                : "border-amber-200 bg-amber-50 text-amber-950"
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
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
