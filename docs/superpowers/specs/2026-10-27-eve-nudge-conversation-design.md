# Eve’s spoiler-safe nudge conversation

## Intent

Make the native daily puzzle feel like a thoughtful conversation with Eve. When a player asks for help, the next authored clue should appear naturally in the same chat-like history as their guesses and Eve’s feedback. The puzzle should stay challenging and fair, with a real path forward when a player gets stuck.

## Why this change

The iOS app already has server-scored guess feedback, optional AI quips, and an authored hint ladder. Today the hints are shown as a separate static block beneath the answer field, while the conversation only contains guesses and feedback. Eve’s AI quip intentionally receives no answer or clue text and is not allowed to invent help. The nudge should connect these existing pieces without weakening answer privacy or adding model latency and cost.

The current PostHog project schema showed no Rebuzzle-specific events in the last 30 days, so there is not a reliable PostHog baseline for judging a retention change. Existing first-party gameplay records carry hint counts with accepted guesses. This release must make no claim of increased enjoyment, retention, or revenue.

## Player experience

- Keep one daily puzzle as the primary play surface, with the existing three scored guesses and free score-locked continuation.
- Replace the detached hint presentation with an optional **Ask Eve for a nudge** action at the end of the daily conversation.
- Each activation reveals exactly the next prewritten puzzle hint, in its existing order, as an Eve message in the conversation. It does not call the AI service.
- Place the nudge in the transcript after the number of guesses already submitted when the player requested it. Multiple nudges at the same point remain in authored order.
- Restore already-revealed nudges with the conversation after app relaunch. Keep the existing account-and-puzzle-scoped hint count; save transcript placement locally with the same scope. When a previous build has a hint count but no placement history, show those known hints after the restored guesses rather than losing them.
- Hide the action when no authored hints remain and never show hint text before the player requests it.
- Keep the action usable before the first guess and during score-locked continuation. Do not show it after a terminal result.
- Preserve guess text, drafts, keyboard dismissal, session restoration, server scoring, streaks, and the current result/reveal rules.

## Goals

- Give the daily solve a clear chat rhythm: player guess → server feedback and optional Eve quip → optional authored nudge → next guess.
- Make the next available hint discoverable without making it the loudest action on screen.
- Keep Eve personable while making clue content deterministic, reviewed, and identical across retries.
- Persist hint count and transcript placement per app account and puzzle so the conversation survives a relaunch without crossing accounts.
- Preserve accessibility: a 44-point minimum action target, useful VoiceOver labels, Dynamic Type, reduced-motion behavior, and the existing keyboard-dismiss path.
- Keep hints and all daily gameplay free. Do not add a model call, StoreKit gate, new dependency, or external telemetry event for this slice.

## Non-goals and anti-goals

- Do not send answers, explanations, hints, private notes, or the full guess history to the quip model.
- Do not ask a model to generate, paraphrase, or rank daily hints.
- Do not change puzzle difficulty, answer acceptance, scoring, attempt limits, or daily reset behavior.
- Do not add forced reminders, streak-loss warnings, artificial scarcity, variable rewards, or other pressure mechanics.
- Do not move the one-daily-puzzle identity toward an endless feed.
- Do not claim improved retention, enjoyment, conversion, or profit without production-cohort evidence.

## Constraints and design calls

- Platform remains native SwiftUI with the current Rebuzzle navigation, colors, type, illustration style, and puzzle-board geometry.
- Apply the useful iOS rules from [design.thorbis.com](https://design.thorbis.com/): the puzzle stays the visual focus, chrome stays quiet, controls remain thumb-sized, system behavior stays native, and state must recover truthfully. Thorbis is a reference for interface discipline, not a source of Rebuzzle brand colors, artwork, or business-product styling.
- Use the existing server-owned guess response as the authority for correctness and feedback. Hint reveal remains local as in the current implementation; its count is reconciled with the server’s next accepted guess and with the existing local account/puzzle cache.
- A nudge transcript record contains only a hint index and the number of submitted attempts before it. Hint wording is read from the current daily puzzle payload, not copied into a separate persisted transcript.
- If a legacy local hint count has no transcript records, preserve the visible clue state by placing those recovered nudge messages after the restored guess history.
- The current AI quip stays optional, answer-blind, and best-effort. Hints do not wait for AI or change how a guess is scored.

## Success evidence

Implementation evidence must show:

1. A nudge action reveals one and only one next hint and records its position in the conversation.
2. Multiple hints appear in order, and hints revealed between guesses stay between the correct guess turns after relaunch.
3. A legacy hint-count-only state still displays every hint already shown and does not repeat or skip future hints.
4. Account and puzzle changes cannot surface another account’s or day’s nudge transcript.
5. A terminal result, missing hint payload, storage failure, unavailable Eve service, and score-locked continuation remain safe and usable.
6. VoiceOver, Dynamic Type, and the hide-keyboard control remain usable.

These checks establish behavior only. Product outcome success will require production measures of hint use, next-guess progress, confirmed puzzle finishes, and subsequent-day return after a cohort has accumulated.
