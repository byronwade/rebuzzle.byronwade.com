"use client";

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
 * model gets there in time — a second bubble where she can't help adding
 * something. The instant line never waits on the model, so feedback is always
 * immediate; the riff types itself in underneath if it shows up.
 */
export function GuessThread({ turns, className }: GuessThreadProps) {
  const endRef = useRef<HTMLLIElement>(null);
  const lastQuip = turns.at(-1)?.quip;

  // Follow the conversation the way a chat does — including as a riff grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, lastQuip]);

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
          <li className="flex flex-col gap-2" key={turn.id}>
            <MessageRow from="user">
              <MessageBubble from="user">{turn.text}</MessageBubble>
            </MessageRow>

            <MessageRow from="agent">
              <MessageAvatar />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                <MessageBubble from="agent" tone={tone}>
                  {turn.line}
                </MessageBubble>

                {showRiff ? (
                  <MessageBubble from="agent">
                    {turn.quip ? turn.quip : <MessageTyping />}
                  </MessageBubble>
                ) : null}

                <MessageMeta tone={tone}>
                  {TIER_LABEL[turn.tier]} · Guess {turn.attemptNumber}
                </MessageMeta>
              </div>
            </MessageRow>
          </li>
        );
      })}

      <li aria-hidden ref={endRef} />
    </ol>
  );
}
