# Aha Reveal Implementation Plan

> **For agentic workers:** This is a one-slice native SwiftUI change. Implement it in the current worktree and preserve all existing staged, unstaged, and untracked work.

**Goal:** Make the end of a daily round show the original clue and its answer as one satisfying reveal.

**Architecture:** Update the existing `ResultView` in `TodayView.swift` to reuse the current daily puzzle renderer inside the result panel, followed by the answer and explanation. Keep all score, reward, share, streak, reminder, and navigation behavior as it is.

**Tech Stack:** Swift 6, SwiftUI, existing `PuzzleBoard`, `Theme`, `JourneyRewards`, and fixture transport.

**Spec:** `docs/superpowers/specs/2026-11-04-aha-reveal-design.md`

## Global constraints

- Do not change scoring, guess limits, hints, XP, streak logic, APIs, or Plus access.
- Do not expose the answer before server-confirmed game-over.
- Reuse the actual puzzle board; do not crop or reconstruct clue relationships.
- Respect iOS 18+, Dynamic Type, VoiceOver, dark appearance, and Reduce Motion.
- Do not add or run automated tests. Verify with a simulator build and manual fixture interaction.

## Review focus

- Standard-size result: clue, answer, and explanation read as one reveal.
- Accessibility-size result: the board remains full-size and the answer stays readable in scroll.
- Solved and exhausted states remain distinct and both reveal only after game-over.
- The rest of the result flow remains reachable under the system tab bar.
- Dark appearance and Reduce Motion preserve meaning without relying on motion or color alone.

---

### Task 1: Compose the clue-to-answer result moment

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

**Interfaces:**
- Consume the existing `model.daily?.puzzle`, `GameSession`, `PuzzleBoard`, and `JourneyRewards`.
- Keep the existing result surface and all downstream actions.

- [x] Place the actual puzzle board immediately before the answer and explanation inside the existing result panel.
- [x] Reduce the result heading size enough to keep the clue-to-answer sequence prominent without shrinking at accessibility sizes.
- [x] Remove the now-redundant collapsed puzzle disclosure.
- [x] Preserve the solved/reveal copy, guess pattern, XP/stars, Journey progress, share, streak, feedback, journal link, and next-puzzle reminder.

### Task 2: Verify the result states on simulator

**Files:**
- No additional source files.

- [x] Build the Debug simulator app and launch with `--ui-fixture`; solve the sample puzzle without contacting production.
- [x] Inspect the solved result at standard size and confirm the clue, answer, explanation, and reward remain coherent.
- [x] Use three incorrect fixture guesses to inspect the answer-revealed state.
- [x] Inspect standard-size solved/exhausted results in dark and light appearance; the clue board remained intact.
- [ ] Verify scrolling and below-fold clue readability at Accessibility XXXL; text enlarged correctly, but available simulator scroll gestures did not move the page.
- [ ] Runtime-check VoiceOver and Reduce Motion. Existing labels and Reduce Motion handling remain in source; neither mode was exercised here.
- [x] Build the Release simulator app; `BUILD SUCCEEDED`. XcodeGen regeneration was skipped because the shared project file has extensive pre-existing staged and unstaged edits; `project.yml` and project build-number settings were synchronized directly.
- [x] Update the design’s HIG evidence table from simulator observations; physical-device and iPad evidence remains open.

### Task 3: Keep Eve’s debrief in the postgame flow

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

**Interfaces:**
- Reuse the existing `GuessTurnView` with the same confirmed `GameSession.attempts`, `EveReplyStore.replies`, and `pendingAttempt` data used during an active round.
- Keep turn IDs as `turn-<attemptNumber>` so the existing scroll-follow behavior still targets the newest reply.

- [x] Share one conversation renderer between the active round and the postgame view.
- [x] Place the postgame conversation after the clue, answer, explanation, and immediate stars/XP moment; retain the same turns and feedback.
- [x] Keep active-round placement, server-confirmed game-over gating, answer privacy, reward math, sharing, streaks, and daily-return actions unchanged.
- [x] Build the Release simulator app; `BUILD SUCCEEDED`.
- [x] Inspect the solved fixture result at standard text size; the Aha, clue, answer, and explanation remain in the reveal card, and the Eve-debrief section follows it.
- [ ] Inspect the exhausted fixture result and scroll through the debrief/reward flow. Simulator scroll, drag, and Page Down gestures did not move the view in this session, so full debrief reachability and the exhausted layout remain unverified.
- No automated tests were added or run, per the project instruction.

### Task 4: Surface the next daily moment after the reward

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

- [x] Keep the existing `DailyReturnCard` after Eve’s debrief and the confirmed Journey progress card, before sharing and progress details.
- [x] Preserve the server countdown, zero-state refresh action, reminder permission flow, and all reward/share/streak behavior.
- [x] Build the Release Simulator app; `BUILD SUCCEEDED` with the updated result hierarchy.
- [x] Inspect the solved result in dark appearance at standard size; the reveal card remains intact and the debrief follows it.
- [ ] Scroll to the countdown card at standard and accessibility text sizes and inspect VoiceOver order. The Simulator scroll gesture did not move the current result page, so below-fold reachability remains unverified.

**Ruling:** Put the return cue after the reveal, Eve debrief, and reward instead of at the very bottom of the result. Players see when the next puzzle arrives while the solve is still fresh; the share and progress details move lower if this ordering proves less useful.

### Task 5: Keep the countdown visible after completion

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/Rebuzzle/Features/DailyPuzzleTicker.swift`

- [x] Keep the next-puzzle ticker visible when the daily game is over.
- [x] Use completion-aware copy while the timer is running; preserve the existing ready state when reset time arrives.
- [x] Keep the completed-state ticker to one line at standard sizes and retain the full banner at accessibility sizes.
- [x] Compact the reveal's row/stack/grid artwork spacing at standard sizes while preserving spatial/free and canonical board geometry; retain natural board height at accessibility sizes.
- [x] Build Debug and Release Simulator targets; inspect the solved result at standard size. The one-line countdown is visible above the reveal, and the tighter row-board spacing brings the answer and explanation into the first screen. `DailyReturnCard` remains after the reward in source order.

**Design call:** The small ticker answers “when is the next one?” immediately. The full return card follows Eve’s debrief and confirmed Journey progress for reminder setup and the reset refresh action.

### Task 6: Make the answer and immediate reward one payoff

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`

- [x] Reveal the existing stars/XP summary inside the clue-to-answer result card as the answer appears, before the explanation.
- [x] Keep the reward hidden until the answer is visible; if no explanation is supplied, reveal it with the answer.
- [x] Keep server-confirmed badge/level milestones and Journey progress in the Journey card after Eve’s debrief.
- [x] Avoid adding another success sound or haptic.
- [x] Keep Eve’s debrief immediately after the combined reveal/payoff card.
- [x] Build the Debug simulator app from an isolated source copy; `BUILD SUCCEEDED`.
- [x] Solve the `--ui-fixture` lighthouse round and verify VoiceOver element order includes the answer, stars/XP, guesses, explanation, debrief, and confirmed Journey card in sequence.
- [ ] Verify the exhausted state, VoiceOver, Reduce Motion, iPad, and below-fold scrolling; these were not exercised in this follow-up.
- No automated tests were added or run.
