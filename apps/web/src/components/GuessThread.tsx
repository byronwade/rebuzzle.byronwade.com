"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
  MessageAvatar,
  MessageBubble,
  MessageMeta,
  MessageRow,
  MessageTyping,
} from "@/components/ui/message";
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

  // Follow the conversation the way a chat does — including as a riff grows.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [turns.length, lastQuip, hasFooter]);

  if (turns.length === 0) return null;

  return (
    // role="log" carries an implicit polite live region, and unlike a bare div
    // it actually accepts the label.
    <ol
      aria-label="Your guesses and Eve's replies"
      className={cn("guess-thread flex w-full flex-col gap-5 overflow-y-auto", className)}
      role="log"
    >
      {turns.map((turn) => {
        const tone = REACTION_TONE[turn.tier];
        const showRiff = Boolean(turn.quipPending || turn.quip);

        return (
          <li className="flex flex-col gap-3" key={turn.id}>
            <MessageRow from="user">
              <MessageBubble from="user">{turn.text}</MessageBubble>
            </MessageRow>

            <MessageRow from="agent">
              <MessageAvatar />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                <MessageMeta tone={tone}>
                  Eve · {TIER_LABEL[turn.tier]} · Guess {turn.attemptNumber}
                </MessageMeta>

                <MessageBubble className="min-w-0" from="agent" tone={tone}>
                  <p>{turn.line}</p>
                  {showRiff ? (
                    <div className="mt-2 border-border/70 border-t pt-2 text-muted-foreground">
                      {turn.quip ? turn.quip : <MessageTyping />}
                    </div>
                  ) : null}
                </MessageBubble>
              </div>
            </MessageRow>
          </li>
        );
      })}

      {footer ? <li className="list-none pt-1">{footer}</li> : null}

      <li aria-hidden ref={endRef} />
    </ol>
  );
}
