# Extended Daily Solving Design

## Intent

Rebuzzle's daily puzzle should reward thoughtful persistence. The current three-wrong-guess flow ends the day and reveals the answer before a player has had time to sit with a difficult clue. Let players keep solving at their own pace while retaining a clear, fair scored round.

## Goals

- Keep the first three guesses as the scored round.
- After three incorrect scored guesses, offer a clear choice: keep solving or reveal the answer.
- Keep the answer and explanation hidden until a solve or an explicit reveal.
- Let a player solve after the scored round and have that solve count toward daily completion and streaks.
- Lock performance points after the three scored guesses; continuation guesses do not award or remove points.
- Keep continuation free. Rebuzzle Plus does not sell extra guesses, hints, or a gameplay advantage.
- Restore the same active daily run across the native iOS app and web game.
- Preserve legacy runs and clients: records created before this feature, and requests without the new mode, keep the existing three-guess finalization behavior.
- Keep community and archive puzzle rules unchanged.

## Non-goals

- Changing the three-attempt scoring formula, puzzle difficulty tiers, hints, or daily schedule.
- Making a daily puzzle available after its next-puzzle deadline.
- Reworking React Native or desktop clients; they currently use a retired attempt endpoint and are outside the supported daily flow.
- Adding a subscription or a paywall to puzzle completion.
- Claiming that this change increases retention or revenue before production measurement.

## Player experience

1. A player starts the daily puzzle and receives the existing Eve feedback and hints.
2. The first three guesses remain the scored round.
3. If the player solves within those guesses, today's existing result flow runs unchanged.
4. If all three are incorrect, Rebuzzle says the scored round is complete and the puzzle is still open. The answer stays hidden. The player can continue with no timer or reveal the solution.
5. Continued guesses receive the existing feedback. They cannot change the score. A continued solve still counts as a solved daily and preserves normal completion and streak behavior, but awards no attempt-performance points.
6. If the player reveals the answer, the server finalizes the day as a loss and returns the answer and explanation.
7. If a score-locked run remains open after the next-puzzle deadline, the server finalizes it once as an expired loss when the player next loads daily session state. Today's puzzle remains immediately playable. A dismissible, non-blocking card offers an optional review of yesterday's answer; the answer is not shown automatically.

Suggested score-lock copy: “Your scored round is complete. The puzzle is still yours—take your time.” Primary action: “Keep solving”. Secondary action: “Reveal the answer”. Continued success copy should celebrate the solve and clearly say that the scored round was already locked.

## Server and persistence contract

- Native iOS and the web daily game opt into `playMode: "extended"` on daily guesses. The server stores the mode with accepted attempt records and treats the stored mode as authoritative for the run.
- Missing mode means `classic`. This preserves current clients, existing records, and historical sessions. Existing final runs are never reopened by deployment.
- The three scored attempts remain numbered 1–3. A third incorrect attempt in extended mode is non-final and returns a score-locked phase, zero scored attempts remaining, and no answer or explanation.
- Attempts after the third are accepted only for an extended daily run that is still open. They are recorded as unscored continuation attempts. The existing authenticated guess route and its rate limits remain in force.
- A correct continuation attempt finalizes as solved. It records the solve, daily progress, streak, and completion event once, with zero performance points. A reveal or score-locked expiry finalizes as a loss once.
- The answer is returned only for a solved or explicitly finalized run. Session restore uses the saved mode and terminal flag; it must not infer a terminal answer reveal from `attemptCount >= 3` for an extended run.
- Server responses include an explicit phase and score-lock state. Clients must use these fields rather than infer the phase from a local guess count.
- A new authenticated daily reveal operation is allowed only for the account's own, score-locked, open daily run. Repeating it is idempotent; it cannot reveal another puzzle's answer.
- Daily finalization must preserve the current once-only `PuzzleAttempt`, `DailyProgress`, score, streak, and `daily_finished` event invariants. The daily session response may include a finalized prior-day result for an optional review card; it never blocks the current puzzle. Community puzzles do not use this mode.

## Client contract

- iOS keeps the current server-authoritative session restore. `GameSession` represents a score-locked run separately from a terminal run, and the answer remains absent until a server terminal response.
- The web daily game hydrates its current attempt list and phase from `/api/puzzle/session`; its local state cannot overwrite a newer server run from another device.
- Both clients show the keep-solving and reveal choices after the third miss, show locked-score context during continuation, and render solved/revealed/expired outcomes distinctly.
- The next-day expiry review is optional and dismissible; today's puzzle can be played immediately whether or not yesterday's answer is reviewed.
- The UI remains usable with Dynamic Type, keyboard input, VoiceOver, and browser keyboard navigation. The answer is not exposed through hidden accessibility content before finalization.

## Data and measurement

The feature adds only a closed play-mode/state value to attempt records and response objects. It does not store guesses in the new growth funnel, device details, or notification contents. Existing attempt rows are historical evidence and must be interpreted using their recorded fields; absent `playMode` always means legacy three-guess behavior.

The scorecard should report implementation and test evidence separately from outcomes. Once deployed, compare score-lock → continuation → solve/reveal/expiry counts and next-day confirmed returns with a cohort baseline. Do not treat notification opens or share activity as proof of retention.

## Acceptance evidence

- A legacy third miss still finalizes and returns the answer exactly as before.
- In extended mode, the third miss leaves the run open and returns no answer; the fourth incorrect guess remains open; a later correct guess finalizes as solved without performance points.
- Explicit reveal and next-day expiry each finalize an open score-locked run once, with correct loss/progress/streak behavior and no duplicate completion events under retries or concurrent requests.
- Next-day session loading closes an expired score-locked run once and offers its answer through a non-blocking review state; dismissal does not prevent current-day play.
- Session restore returns the same phase and attempt history on iOS and web; old rows without `playMode` are not reopened.
- Community puzzle behavior is unchanged.
- Native and web UI tests cover score lock, continue, hidden answer, late solve, reveal, refresh/restore, and expiry.
