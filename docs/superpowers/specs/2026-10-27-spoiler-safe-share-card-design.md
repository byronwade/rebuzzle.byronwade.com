# Spoiler-safe daily result share card

## Intent

Make completing the daily puzzle feel satisfying and make it easy for a player to invite a friend into the same daily challenge. The share should advertise Rebuzzle and the reasoning challenge without spoiling the answer or pressuring the player to share.

## Product constraints

- Daily play, guesses, ordinary hints, the explanation, and sharing remain free.
- A missed day never removes progress or triggers shame. Sharing does not change streaks, XP, hints, or rewards.
- Keep Rebuzzle’s own visual identity: warm cream canvas, charcoal ink, Inter utility text, rounded display type, and blue used sparingly for emphasis. The exported card uses the same light palette in light and dark app appearance so the shared image stays consistent.
- Treat the share card as an acquisition and delight feature, not evidence of retention, enjoyment, or revenue improvement. Measure outcomes only after real beta or production play.

## Experience

Only a terminal daily result exposes the visual share card. The result screen keeps one native ShareLink action. When rendering succeeds, the system share sheet receives both a 4:5 PNG and a useful text version; when rendering fails or is still preparing, the existing spoiler-safe text share remains available.

The current daily rules have two terminal outcomes: a correct guess solves the puzzle; three incorrect guesses finish the run and reveal the answer. There is no voluntary give-up action. The share summary calls these outcomes `solved` and `revealed`; reveal copy stays encouraging and never describes a miss as a lost streak or failure.

Render a 360 by 450 point SwiftUI card at 3x scale (1080 by 1350 pixels). It shows the Rebuzzle name, puzzle date, solved or revealed outcome, one result mark per attempt, hint count, and a short invitation with `https://rebuzzle.byronwade.com`. Solved and revealed copy is distinct and encouraging. The native share control retains a descriptive accessibility label and works at accessibility text sizes.

## Share data and privacy

Create a small answer-blind summary from only the puzzle date, terminal outcome, attempt correctness marks, attempt limit, and hint count. Unused attempt slots may be shown as empty marks. Build both image and text from this summary so rendering code cannot access the full game session.

Never include the puzzle identifier, typed guesses, answer, explanation, journal notes, account/device identifiers, credentials, or other session data. An unfinished session has no completed-result summary and cannot render the card.

## Technical approach

- Keep the summary in `RebuzzleCore`; preserve `GameSession.shareText` as a computed compatibility API derived from that summary.
- Add a focused SwiftUI renderer and a `Transferable` PNG payload using system frameworks (`ImageRenderer`, `ShareLink`, and CoreTransferable). Include a text representation for share destinations that do not accept images.
- Bind any rendered image to its source summary. A result change must not temporarily share a previous card.
- Add no backend changes, new dependencies, or monetization gates. Keep iOS 18 support and existing StoreKit behavior.

## Acceptance evidence

- Core tests prove a solved and a revealed result produce the right date/outcome/marks/hint count, exclude private or spoiler data, and produce no completed summary before `gameOver`.
- Renderer tests verify a 1080 by 1350 PNG, the text representation, distinct outcome copy, and rejection of unfinished or stale artifacts.
- UI tests verify the result share invitation is reachable without scrolling at standard text size, remains accessible at larger text sizes, and opens the native share sheet.
- Core, iOS unit, and focused UI tests pass; a rendered card is inspected visually in the simulator. These tests establish implementation behavior only, not player growth outcomes.
