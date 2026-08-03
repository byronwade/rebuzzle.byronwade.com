"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  MessageAvatar,
  MessageBubble,
  MessageMeta,
  MessageRow,
  MessageTyping,
} from "@/components/ui/message";
import type { WordResult } from "@/lib/game/build-word-results";
import { REACTION_TONE, type ReactionTier } from "@/lib/game/reactions";
import { cn } from "@/lib/utils";

export interface ThreadTurn {
  id: number;
  /** The guess as submitted. */
  text: string;
  attemptNumber: number;
  tier: ReactionTier;
  /** Instant line from the guess response. Always present. */
  line: string;
  /** Eve's follow-up riff, typed in as it streams. */
  quip?: string;
  /** True between requesting the riff and the first token landing. */
  quipPending?: boolean;
  /** Per-word ticks for multi-word guesses (exact matches only). */
  wordResults?: WordResult[];
}

interface GuessThreadProps {
  turns: ThreadTurn[];
  /** Optional footer after the last turn (e.g. solve result card). */
  footer?: ReactNode;
  className?: string;
}

const TIER_LABEL: Record<ReactionTier, string> = {
  correct: "Solved",
  close: "So close",
  warm: "Warm",
  cold: "Cold",
  out: "Out of guesses",
};

function ExactWordTicks({ words }: { words: WordResult[] }) {
  if (words.length < 2) return null;
  const anyCorrect = words.some((w) => w.correct);
  if (!anyCorrect) return null;

  return (
    <p className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em]">
      {words.map((word, index) => (
        <span
          className={cn(
            "rounded px-1.5 py-0.5",
            word.correct
              ? "bg-success/15 text-success"
              : "bg-muted text-subtle line-through decoration-border-strong/60"
          )}
          key={`${word.word}-${index}`}
        >
          {word.correct ? `✓ ${word.word}` : word.word}
        </span>
      ))}
    </p>
  );
}

function AgentReply({ turn }: { turn: ThreadTurn }) {
  const tone = REACTION_TONE[turn.tier];
  const showRiff = Boolean(turn.quipPending || turn.quip);
  const isClose = turn.tier === "close";
  const staggerBody = turn.tier === "close" || turn.tier === "warm";
  const [showBody, setShowBody] = useState(!staggerBody);

  useEffect(() => {
    if (!staggerBody) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setShowBody(true);
      return;
    }
    const delay = turn.tier === "close" ? 110 : 70;
    const id = window.setTimeout(() => setShowBody(true), delay);
    return () => window.clearTimeout(id);
  }, [staggerBody, turn.tier]);

  return (
    <MessageRow from="agent">
      <MessageAvatar />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <MessageMeta className={cn(isClose && "reaction-heat")} tone={tone}>
          Eve · {TIER_LABEL[turn.tier]} · Guess {turn.attemptNumber}
        </MessageMeta>

        {showBody ? (
          <MessageBubble
            className={cn("min-w-0", isClose && "reaction-heat-bubble")}
            from="agent"
            tone={tone}
          >
            <p>{turn.line}</p>
            {turn.wordResults ? <ExactWordTicks words={turn.wordResults} /> : null}
            {showRiff ? (
              <div className="mt-2 border-border/70 border-t pt-2 text-muted-foreground">
                {turn.quip ? turn.quip : <MessageTyping />}
              </div>
            ) : null}
          </MessageBubble>
        ) : (
          <div aria-hidden className="h-11" />
        )}
      </div>
    </MessageRow>
  );
}

/**
 * The conversation.
 *
 * Each guess is a turn: what you said, Eve's instant read on it, and — if the
 * model gets there in time — an extra riff where she can't help adding
 * something. The instant line never waits on the model, so feedback is always
 * immediate; the riff types itself into the same reply if it shows up.
 */
export function GuessThread({ turns, footer, className }: GuessThreadProps) {
  const endRef = useRef<HTMLLIElement>(null);
  const lastQuip = turns.at(-1)?.quip;
  const hasFooter = Boolean(footer);
  const lastTier = turns.at(-1)?.tier;

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [turns.length, lastQuip, hasFooter, lastTier]);

  if (turns.length === 0) return null;

  return (
    <ol
      aria-label="Your guesses and Eve's replies"
      className={cn("guess-thread flex w-full flex-col gap-5 overflow-y-auto", className)}
      role="log"
    >
      {turns.map((turn) => (
        <li className="flex flex-col gap-3" key={turn.id}>
          <MessageRow from="user">
            <MessageBubble from="user">{turn.text}</MessageBubble>
          </MessageRow>
          <AgentReply turn={turn} />
        </li>
      ))}

      {footer ? <li className="list-none pt-1">{footer}</li> : null}

      <li aria-hidden ref={endRef} />
    </ol>
  );
}
