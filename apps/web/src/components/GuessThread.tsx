"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  MessageAvatar,
  MessageBubble,
  MessageMeta,
  MessageRow,
  MessageTyping,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
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
  /**
   * `scroll` — contained MessageScroller (active play).
   * `stack` — natural-height list for an outer page scroller (day locked).
   */
  layout?: "scroll" | "stack";
}

const TIER_LABEL: Record<ReactionTier, string> = {
  correct: "Solved",
  close: "So close",
  warm: "Warm",
  cold: "Cold",
  out: "Out of guesses",
};

const NEAR_WORD_THRESHOLD = 70;

function ExactWordTicks({ words }: { words: WordResult[] }) {
  if (words.length < 2) return null;
  const anySignal = words.some((w) => w.correct || w.similarity >= NEAR_WORD_THRESHOLD);
  if (!anySignal) return null;

  return (
    <p className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em]">
      {words.map((word, index) => {
        const near = !word.correct && word.similarity >= NEAR_WORD_THRESHOLD;
        return (
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              word.correct && "bg-success/15 text-success",
              near && "bg-warning/15 text-warning",
              !(word.correct || near) &&
                "bg-muted text-subtle line-through decoration-border-strong/60"
            )}
            key={`${word.word}-${index}`}
          >
            {word.correct ? `✓ ${word.word}` : near ? `~ ${word.word}` : word.word}
          </span>
        );
      })}
    </p>
  );
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function AgentReply({ turn }: { turn: ThreadTurn }) {
  const tone = REACTION_TONE[turn.tier];
  const showRiff = Boolean(turn.quipPending || turn.quip);
  const isClose = turn.tier === "close";
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
  const staggerBody = (turn.tier === "close" || turn.tier === "warm") && !reduceMotion;
  const [showBody, setShowBody] = useState(!staggerBody);

  useEffect(() => {
    if (!staggerBody) return;
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

function ThreadTurnBlock({ turn }: { turn: ThreadTurn }) {
  return (
    <div className="flex flex-col gap-3">
      <MessageRow from="user">
        <MessageBubble from="user">{turn.text}</MessageBubble>
      </MessageRow>
      <AgentReply turn={turn} />
    </div>
  );
}

/**
 * The conversation — MessageScroller while playing; natural stack when the
 * outer play-stage owns scroll (solved / locked day).
 */
export function GuessThread({ turns, footer, className, layout = "scroll" }: GuessThreadProps) {
  if (turns.length === 0) return null;

  if (layout === "stack") {
    return (
      <div
        aria-label="Your guesses and Eve's replies"
        aria-live="polite"
        className={cn("guess-thread flex w-full flex-none flex-col gap-5 px-0.5 pb-3", className)}
        role="log"
      >
        {turns.map((turn) => (
          <ThreadTurnBlock key={turn.id} turn={turn} />
        ))}
        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("guess-thread flex min-h-0 w-full flex-1 flex-col", className)}>
      <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
        <MessageScroller>
          <MessageScrollerViewport aria-label="Your guesses and Eve's replies">
            <MessageScrollerContent className="px-0.5 pb-3" role="log" aria-live="polite">
              {turns.map((turn) => (
                <MessageScrollerItem key={turn.id} messageId={`guess-${turn.id}`} scrollAnchor>
                  <ThreadTurnBlock turn={turn} />
                </MessageScrollerItem>
              ))}

              {footer ? (
                <MessageScrollerItem messageId="solve-result" className="pt-1">
                  {footer}
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  );
}
