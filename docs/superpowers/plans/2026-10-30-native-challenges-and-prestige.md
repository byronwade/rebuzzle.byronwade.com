# Native Challenges and Prestige Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the tiered challenge ladder (server and native wall) and the dark Prestige restyle of Play, Career, and You, then upload the build to TestFlight.

**Architecture:**
- **Server.** A pure evaluator in `apps/web/src/lib/challenges/` derives challenge lines from the normalized daily-progress entries already built in `/api/user/progress`. The route adds an optional `challenges` field and folds `challengeXP` into `totalXP`.
- **iOS decoding.** `RebuzzleCore` decodes the field strictly but optionally.
- **iOS screens.** SwiftUI gets Prestige theme tokens plus shared components (`RankEmblem`, `XPBar`, `CareerHeader`, `TierPips`, `PrimaryActionStyle`). Play, Career (formerly Journey), and You are rebuilt on them. Play's game logic, view model, and accessibility identifiers stay as they are.

**Specs:** `docs/superpowers/specs/2026-10-30-native-challenges-design.md`, `docs/superpowers/specs/2026-10-30-ios-prestige-redesign-design.md`

**Tech Stack:** Next.js route handlers + Vitest (apps/web), Swift 6 / SwiftUI / XCTest (apps/ios), XcodeGen.

---

## File map

| File | Responsibility |
|---|---|
| `apps/web/src/lib/challenges/definitions.ts` (new) | Challenge line table (ids, categories, thresholds, tier XP) |
| `apps/web/src/lib/challenges/evaluate.ts` (new) | `evaluateChallenges(entries)` → API `challenges` object |
| `apps/web/src/lib/challenges/__tests__/evaluate.test.ts` (new) | Boundary tests for every rule |
| `apps/web/src/app/api/user/progress/route.ts` | Call evaluator in `summarize`; add `challenges` to response |
| `apps/web/src/app/api/user/progress/__tests__/route.test.ts` | Update XP expectations; assert `challenges` presence/absence |
| `apps/ios/Core/Sources/RebuzzleCore/Challenges.swift` (new) | `ChallengeProgress`, `ChallengeLine`, `ChallengeCategory` decoding + helpers (roman numerals, next threshold, rank) |
| `apps/ios/Core/Sources/RebuzzleCore/JourneyProgressSnapshot.swift` | Optional `challenges` field |
| `apps/ios/Core/Tests/RebuzzleCoreTests/ChallengesTests.swift` (new) | Decoder validation + helpers |
| `apps/ios/Rebuzzle/Design/Theme.swift` | Prestige tokens, `PrimaryActionStyle` (CommitStyle kept as alias), sharp `FieldStyle` |
| `apps/ios/Rebuzzle/Design/Prestige.swift` (new) | `RankEmblem`, `XPBar`, `CareerHeader`, `TierPips`, `PrestigePanel`, `SectionLabel` |
| `apps/ios/Rebuzzle/Features/Challenges/ChallengesWall.swift` (new) | Wall, row, detail sheet |
| `apps/ios/Rebuzzle/Features/Challenges/ChallengeUnlockOverlay.swift` (new) | Full-screen unlock moment, queued |
| `apps/ios/Rebuzzle/Features/Career/CareerScreen.swift` (moved from `ProgressScreen.swift`) | Career tab |
| `apps/ios/Rebuzzle/Features/Play/*.swift` (split from `TodayView.swift`) | Play subviews |
| `apps/ios/Rebuzzle/Features/SettingsView.swift` | Operator card, no Appearance |
| `apps/ios/Rebuzzle/App/RebuzzleApp.swift` | Dark scheme, Career tab, `.challenges` route, unlock overlay |
| `apps/ios/Rebuzzle/App/AppModel.swift` | Track newly unlocked tiers after refresh |
| `apps/ios/Rebuzzle/App/PreviewData.swift` | Fixture `challenges` payload |
| `apps/ios/project.yml` | Build number 16 |

---

### Task 1: Challenge definitions and evaluator (server, TDD)

**Files:** Create `apps/web/src/lib/challenges/definitions.ts`, `evaluate.ts`, `__tests__/evaluate.test.ts`.

- [ ] **Step 1: Write failing tests.** Cover each of these in `evaluate.test.ts`, using a `entry({ puzzleDate, outcome, attempts, hintCount, completedAt, timeZone, playMode })` helper:
  - Empty history: every tier 0, `challengeXP` 0, `tiersTotal` 58.
  - One solved, first-guess, no-hint entry:
    - `dailies` 1/tier 1
    - `first-guess` tier 1
    - `solves` tier 1
    - `unassisted` value 1, tier 0 (threshold 3)
    - `challengeXP` = 25×3 = 75
  - Seven consecutive dates Mon–Sun:
    - `streak` value 7, tier 2
    - `perfect-weeks` 1
    - `trails` 1
    - `dailies` tier 2
  - Gap resets the run but best is kept: 3 days, gap, 2 days → `streak` value 3.
  - Week grouping: Sun + Mon are different weeks.
  - Failed entries count for `dailies` and `streak` but not `solves`.
  - `clutch` counts solved attempts==3 only without extended mode. `extended` counts solved with `playMode: "extended"`.
  - Rhythm: 07:59 local is early, 08:00 is not. 22:00 local is night. A null time zone counts for neither. Use `America/New_York` with UTC timestamps.
  - Secrets:
    - Locked: `title`, `description`, and `value` are null, and `thresholds` is `[1]`.
    - Unlocked by a `YYYY-01-01` date: title "Fresh start", tier 1, +100 XP.
  - `unlockedAt` is the puzzle date where each threshold was first crossed, in date order.
  - Mastery: a category is mastered only when all of its lines are at tier 5.
- [ ] **Step 2:** Run `pnpm --filter web exec vitest run src/lib/challenges` → FAIL (module missing). Check the package name in `apps/web/package.json` first.
- [ ] **Step 3: Implement `definitions.ts`.**
  - Export `CHALLENGE_TIER_XP = [25, 50, 100, 200, 400]`, `SECRET_XP = 100`.
  - Export `CHALLENGE_CATEGORIES` (devotion, precision, grit, rhythm, secrets, with titles).
  - Export `CHALLENGE_LINES`: 11 visible lines, each `{ id, category, title, description, thresholds, measure }`, where `measure` is a string key.
  - Export `SECRET_LINES`: 3 entries `{ id, title, description, monthDay }`.
  - Values exactly as the spec table.
- [ ] **Step 4: Implement `evaluate.ts`.**
  - `evaluateChallenges(entries: ChallengeEntry[])`, where `ChallengeEntry` has the `JourneyEntry` shape: `puzzleDate`, `outcome`, `attempts`, `hintCount`, `completedAt: Date`, `timeZone: string | null`, `playMode?`.
  - Sort ascending by `puzzleDate` and replay entries, keeping running counters per measure:
    - `dailies`: finished count
    - `streak`: running and best run by consecutive dates, via `addCalendarDays` from `@/lib/game/daily-lock`
    - `trails` / `perfect-weeks`: per-week distinct date counts; increment when a week's count reaches 3 / 7
    - `first-guess`, `unassisted`, `solves`, `clutch`, `extended`
    - `early-bird` / `night-owl`: `Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" })`
  - After each entry, record `unlockedAt[i] = puzzleDate` for any threshold first reached.
  - Week start: Monday-based, the same as `weekBounds` in the route. Copy the 4-line helper into `evaluate.ts` and don't import from the route.
  - Return `{ tiersUnlocked, tiersTotal, challengeXP, categories, lines }` per the spec JSON.
- [ ] **Step 5:** Run the tests → PASS.
- [ ] **Step 6:** Commit with message "Add native challenge ladder evaluator".

### Task 2: Wire challenges into `/api/user/progress`

**Files:** Modify `apps/web/src/app/api/user/progress/route.ts`, `__tests__/route.test.ts`.

- [ ] **Step 1: Update tests first.**
  - In "returns server-computed account progress…", assert `body.challenges.tiersTotal === 58`. Assert `body.summary.totalXP` equals the old XP plus the expected `challengeXP` for that fixture, computed by calling `evaluateChallenges` on the same entries in the test so it isn't hard-coded twice.
  - In "withholds partial totals…", assert `body.challenges` is `undefined`.
- [ ] **Step 2:** Run route tests → FAIL.
- [ ] **Step 3:** In `summarize()`, compute `const challenges = evaluateChallenges(entries)`. Set `totalXP = baseXP + challenges.challengeXP` and recompute `level` / `xpIntoLevel` from it. Return `{ ...summary, challenges }` from an internal helper. In `GET`, put `challenges` at the top level of the JSON (not inside `summary`, so old iOS decoders stay strict-valid) and omit it in the non-complete branch.
- [ ] **Step 4:** Run `vitest run src/app/api/user/progress src/lib/challenges` → PASS.
- [ ] **Step 5:** Commit with message "Serve challenge progress from user progress".

### Task 3: Decode challenges in RebuzzleCore (TDD)

**Files:** Create `Core/Sources/RebuzzleCore/Challenges.swift`, `Core/Tests/RebuzzleCoreTests/ChallengesTests.swift`. Modify `JourneyProgressSnapshot.swift`.

- [ ] **Step 1: Tests.**
  - Decodes the spec example.
  - Rejects these:
    - descending thresholds
    - a visible line without 5 thresholds
    - `tier` inconsistent with `value` (tier must equal the count of thresholds ≤ value)
    - negative values
    - `unlockedAt` count ≠ thresholds count
    - an unknown category
  - Locked secret with null title/value decodes with `isRevealed == false`.
  - Snapshot without `challenges` decodes with `challenges == nil`.
  - `ChallengeLine.romanTier(3) == "III"`.
  - `nextThreshold` is nil at max.
  - `fractionToNext` for 41 of 100 after 30 = (41-30)/(100-30).
  - `PrestigeRank(level: 7)` → name "Solver", sub-tier "II".
  - `PrestigeRank(level: 30)` → "Grandmaster", sub-tier "V", capped.
- [ ] **Step 2:** `swift test --package-path Core --filter ChallengesTests` → FAIL.
- [ ] **Step 3: Implement.** Public types:
  - `ChallengeProgress { tiersUnlocked, tiersTotal, challengeXP, categories: [ChallengeCategory], lines: [ChallengeLine] }`
  - `ChallengeCategory { id, title, mastered }`
  - `ChallengeLine { id, category, title?, description?, secret, value?, thresholds, tier, unlockedAt: [String?] }`, with computed `isRevealed`, `maxTier`, `nextThreshold`, `previousThreshold`, `fractionToNext`, `displayTitle` (title ?? "Classified"), and `static func roman(_:)`
  - `PrestigeRank { name, subTier, symbol }` from level, using the ladder in the redesign spec. Symbols:

    | Rank | SF Symbol |
    |---|---|
    | Recruit | `circle.hexagongrid` |
    | Solver | `puzzlepiece.extension` |
    | Cipher | `key` |
    | Codebreaker | `lock.open` |
    | Oracle | `eye` |
    | Grandmaster | `crown` |

  - Add `public let challenges: ChallengeProgress?` to `JourneyProgressSnapshot`, decoded with `decodeIfPresent`.
  - Add `public static func newlyUnlocked(previous: ChallengeProgress?, current: ChallengeProgress) -> [ChallengeUnlock]`, which returns `(lineID, title, tier, xp)` for each tier increase. It returns an empty array when `previous` is nil, so the first sync doesn't celebrate history.
- [ ] **Step 4:** Tests → PASS. Run the full `swift test --package-path Core` → PASS.
- [ ] **Step 5:** Commit with message "Decode challenge progress in RebuzzleCore".

### Task 4: Prestige theme and shared components

**Files:** Modify `Rebuzzle/Design/Theme.swift`. Create `Rebuzzle/Design/Prestige.swift`.

- [ ] **Step 1: Tokens.** Replace the adaptive colors with fixed Prestige values from the redesign spec. Keep the property names (`canvas`, `panel`, `field`, `ink`, `secondary`, `success`, `reward`, `error`, `accent`) so every screen recolors at once:
  - `accent` and `reward` → gold #F5C46A
  - `field` → #1B1C21
  - `error` → #F07A86
  - `success` → #7FCB95
  - Add `hairline` #26272C, `muted` #55565C, and `static let radius: CGFloat = 4`.
  - `display(_:)` becomes `Font.system(size:weight: .heavy, design: .default).width(.condensed)`.
- [ ] **Step 2: Styles.**
  - `CommitStyle` becomes the gold primary action: dark text (#1A1306), uppercase tracked label, radius 2, 2pt pressed offset, no shadow.
  - `FieldStyle` gets radius 2 and a hairline border.
  - Global corner sweep: `sed -i '' -E 's/RoundedRectangle\(cornerRadius: [0-9]+\)/RoundedRectangle(cornerRadius: Theme.radius)/g'` across `Rebuzzle/Features/*.swift` and `Rebuzzle/Design/*.swift`. `Circle()` shapes stay.
- [ ] **Step 3: Components in `Prestige.swift`.**
  - `RankEmblem(level:size:)`: a rotated-square gold frame with the rank symbol.
  - `XPBar(progress: JourneyProgress)`: 4pt gold bar plus "N XP" and "to <next rank label>" captions, with an accessibility value.
  - `CareerHeader(compact: Bool)`: reads `model.journeySnapshot?.summary` and falls back to level 1. Compact is one line (emblem, rank text, XP bar). Expanded is a large emblem, rank name, "LEVEL N", lifetime XP, and the XP bar.
  - `TierPips(tier:max:)`
  - `SectionLabel(_:)`: uppercase tracked secondary text with an accessibility label in natural case.
  - `PrestigePanel`: a view modifier that applies the panel fill and hairline border.
- [ ] **Step 4:** In `RebuzzleApp.swift`, set `.preferredColorScheme(.dark)` and `.tint(Theme.accent)`. Delete the `appearance` AppStorage.
- [ ] **Step 5:** Build for the simulator (`xcodegen generate && xcodebuild … build`) → success. Commit with message "Introduce Prestige theme and shared components".

### Task 5: Challenges wall and unlock moment

**Files:**
- Create `Features/Challenges/ChallengesWall.swift` and `ChallengeUnlockOverlay.swift`.
- Modify `RebuzzleApp.swift`: add `case challenges` to `RebuzzleRoute` and its destination.
- Modify `AppModel.swift`: add `var pendingUnlocks: [ChallengeUnlock] = []`. In `refreshJourneyProgress`, before assigning the new snapshot, append `JourneyProgressSnapshot.newlyUnlocked(previous: journeySnapshot?.challenges, current:)`.
- Modify `PreviewData.swift`: add a `challenges` payload to the progress fixture.

Wall layout:
- Header: "38 of 58 tiers" plus "MASTERY 1 of 5".
- Category chip row with an "All" option.
- A list of `ChallengeRow`s: icon, title + roman tier, "value / next", bar, `TierPips`, and an accessibility label like "Daily devotion, tier 3 of 5, 41 of 100".
- Tapping a row opens a detail sheet listing every tier with its threshold, XP, and unlock date.
- With no data: "Challenges are updating" plus a retry button that calls `refreshJourneyProgress`.

Overlay:
- Presented from `RootView` when `pendingUnlocks` is non-empty.
- Shows emblem, "CHALLENGE UNLOCKED", title + roman tier, and "+XP".
- A "Continue" button pops the queue.
- A `.success` haptic plays when haptics are on.
- With Reduce Motion, a fade replaces the scale.

Fixture:
- `"challenges"` is built with fixed values when the `--preview` flag is present: dailies 41 (tier 3), streak 12 (tier 2), first-guess 6 (tier 2), others low, one secret locked.
- Add the identifiers `challengesWall`, `challengeRow-<id>`, and `openChallenges`.

- [ ] Steps:
  1. Write the views.
  2. Build.
  3. Launch with `--preview` and navigate to the wall.
  4. Take a screenshot and review it against the spec.
  5. Commit with message "Add challenges wall and unlock moment".

### Task 6: Career screen

**Files:** Move `Features/ProgressScreen.swift` → `Features/Career/CareerScreen.swift`, renaming `ProgressViewScreen` → `CareerScreen`. Update `RebuzzleApp.swift` to use the tab label "Career" with the `shield.lefthalf.filled` symbol. Keep the `AppTab.journey` case name, which tests reference.

Order:
1. `CareerHeader(compact: false)`
2. `DailyStreakCard` (restyled automatically by tokens)
3. Weekly trail as 7 Monday–Sunday cells:
   - filled when a puzzle date appears in `recentEntries` within the current week
   - the 3-day goal is marked
   - reward copy unchanged
   - identifiers `weeklyTrailProgress` and `weeklyTrailReward` kept
4. "NEXT UP": the 3 visible lines with the highest `fractionToNext` below max, as `ChallengeRow`s, plus a `NavigationLink(value: .challenges)` labelled "View all challenges", identifier `openChallenges`.
5. Totals strip.
6. Journal row (`openJournal`), the Plus row, the account note, and the XP disclosure, with the XP copy extended by one sentence: "Challenge tiers add 25–400 XP each."

`badgeCollection` and the `JourneyRewards` badge grid are deleted.

- [ ] Steps:
  1. Check the uses of `JourneyRewards(game:)` in `ResultView`. Keep that view, which shows XP earned on the result, but restyle it.
  2. Build and take a screenshot.
  3. Run `RebuzzleUITests` tests that reference Journey identifiers: `xcodebuild test -only-testing:RebuzzleUITests/GameplayUITests`, filtered with `grep -n "weeklyTrail\|openJournal\|journey" RebuzzleUITests/*.swift`. Fix any copy assertions.
  4. Commit with message "Rebuild Journey as the Career screen".

### Task 7: Play screen

**Files:** Split `Features/TodayView.swift` into:

| New file | Contents |
|---|---|
| `Features/Play/TodayView.swift` | Screen, state, body, toolbar |
| `Features/Play/PlayComponents.swift` | `attemptHeader` as `AttemptsRow`, nudge button, daily thought button, `answerField` |
| `Features/Play/ResultView.swift` | `ResultView`, `DailyQualityPulse` |
| `Features/Play/Conversation.swift` | `GuessTurnView`, `EveNudgeTurnView`, `EveAvatar` |
| `Features/Play/HelpView.swift` | `HelpView`, `PuzzleStudyView`, `DailyThoughtSheet` |
| `Features/Play/PuzzleBoard.swift` | `PuzzleBoard` |

Move the code verbatim first, build, and commit with message "Split TodayView by responsibility". Then restyle:

- Replace the masthead ("Make it click." and the avatar) with `CareerHeader(compact: true)` and a meta row: `"DAILY · " + dateLabel.uppercased()` on the left, `DifficultyBadge` and the study button on the right.
- Remove `.navigationTitle("Rebuzzle")` by hiding the nav bar, and move the help "?" into the meta row. Keep the help button's `accessibilityLabel("How to play")`.
- Board panel: radius `Theme.radius`, hairline border, and `minHeight` of 44% of the screen height via `containerRelativeFrame(.vertical)`.
- `AttemptsRow`: rotated-square pips (submitted wrong = error, correct = success, active = gold outline) and "N LEFT". Keep identifier `dailyGuessProgress` and its accessibility value.
- `GuessTurnView`: drop the bubble.
  - Each turn becomes one compact row: struck-through guess chip, Eve's title, then the reaction line.
  - Small `EveAvatar` (24pt).
  - Keep the identifiers `guessFeedback`, `eveReply-*`, `retryEveReply-*`, and `eveReplyFailure-*`.
- Nudge button: compact secondary row "ASK EVE FOR A NUDGE · N LEFT". Keep identifier `askEveForNudge` and its label.
- Check button: copy "Lock in" through the uppercase style. Keep identifier `checkAnswer`. Keep the accessibility label "Check answer" via `.accessibilityLabel` so UI tests still find it.
- Result panel: "SOLVED" / "REVEALED" label, the answer in display font, the "+N XP" count-up from the Journey rewards view, then the rest unchanged.

- [ ] Steps:
  1. Do the split and commit.
  2. Restyle and build.
  3. Take screenshots of in-progress and solved states (`--preview`, and `--preview --ui-returning-player` for the result).
  4. Run `GameplayUITests`, then fix and re-run.
  5. Commit with message "Restyle Play in the Prestige look".

### Task 8: You screen

**Files:** Modify `Features/SettingsView.swift`.

- Operator card section:
  - `RankEmblem`, display name (`player.username` or "Guest"), and "RANK NAME · LEVEL N"
  - Top three unlocked visible challenges by tier as compact `TierPips` rows
  - "Mastery N of 5"
- Remove the Appearance picker.
- Form styling: `.listRowBackground(Theme.panel)` and hairline separators via `.listRowSeparatorTint(Theme.hairline)`.
- Keep the identifier `settingsIdentityLoaded`.

- [ ] Steps:
  1. Build and take a screenshot.
  2. Check that no tests use `grep -rn "Appearance" RebuzzleUITests RebuzzleTests`, or update them.
  3. Commit with message "Give You an operator card".

### Task 9: Verification

- [ ] Web: `pnpm --filter <web pkg> exec vitest run src/lib/challenges src/app/api/user/progress` → PASS. Run `pnpm --filter <web pkg> exec tsc --noEmit -p .` → no new errors in touched files.
- [ ] Core: `swift test --package-path apps/ios/Core` → PASS.
- [ ] App unit and UI tests on iPhone 16 Pro (BB383330-674F-4597-9B9A-1530B80CCBEE): `xcodebuild test -project Rebuzzle.xcodeproj -scheme Rebuzzle -destination id=… -derivedDataPath /tmp/…`. Record pass/fail counts and fix regressions caused by the redesign.
- [ ] Screenshots on iPhone (Play in progress, Play result, Career, Challenges wall, challenge detail, unlock overlay, You) and one on iPad. Review each against the specs: contrast, clipping, Dynamic Type at XXXL on Play and the wall.

### Task 10: TestFlight

- [ ] Bump `CURRENT_PROJECT_VERSION` to `'16'` in `apps/ios/project.yml` and commit.
- [ ] Archive with team T677262U5B into the scratchpad. Check that `CFBundleVersion` is 16 and that `RebuzzleAPIBaseURL` is production. Export with `destination: upload`.
- [ ] Push the branch and open a PR. Record the build in `apps/ios/Release/Verification.md`. Note that challenge progress appears only after the web change is deployed.
