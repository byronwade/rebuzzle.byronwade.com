# iOS Prestige Redesign

## Intent

The native app's layout is cluttered and reads as a settings app rather than a game.

- Play stacks three headers ("Rebuzzle", "Make it click.", a duplicate Eve avatar) above a board that wastes most of its space.
- Journey mixes unrelated card styles and a giant "1".
- You is a plain settings list.

Restyle all three tabs in one dark, sharp, rank-driven "Prestige" language that matches the challenges wall (`2026-10-30-native-challenges-design.md`). Gameplay rules, API contracts, and server behavior are unchanged.

## Visual system

- **Dark-only.** Set `preferredColorScheme(.dark)` at the root and remove the Appearance picker from You.
- **Tokens** in `Theme`:

  | Token | Value |
  |---|---|
  | `canvas` | #0B0C0E |
  | `panel` | #131418 |
  | `raised` | #1B1C21 |
  | `hairline` | #26272C |
  | `ink` | #ECE7DA |
  | `secondary` | #8C8677 |
  | `muted` | #55565C |
  | `gold` | #F5C46A, reserved for progress, rank, XP, and the primary action |
  | `danger` | #F07A86 |
  | `success` | #7FCB95 |

  Accent blue is retired.
- **Shape.** Corner radius 2 for panels, 0 for bars. Hairline 1pt borders, no shadows. Tier and rank marks use a 45°-rotated square (diamond) motif.
- **Type.**
  - Display: `Font.system(size:weight:.heavy).width(.condensed)`, replacing `ArialRoundedMTBold`.
  - Labels: Inter medium, uppercase, 0.08em tracking. Used only at ≥12pt and never for sentences.
  - Body: Inter regular.
  - All sizes are `relativeTo:` text styles for Dynamic Type.
- **Rank.** Level maps to an original rank ladder. Each rank spans 5 levels, with a roman sub-tier inside it:

  | Levels | Rank |
  |---|---|
  | 1–5 | Recruit |
  | 6–10 | Solver |
  | 11–15 | Cipher |
  | 16–20 | Codebreaker |
  | 21–25 | Oracle |
  | 26+ | Grandmaster |

  For example, level 7 is "Solver II".
- **Rank emblem.** Built from SF Symbols inside the diamond, one symbol per rank. No Call of Duty names, insignia, or assets.
- **Components** in `Design/`:
  - `RankEmblem`
  - `XPBar` (thin gold bar with "1,840 XP" and "to Solver III" labels)
  - `CareerHeader` (emblem, rank, level, XP bar), the persistent top bar on every tab
  - `PrestigePanel`
  - `SectionLabel`
  - `PrimaryActionStyle` (gold fill, dark text, uppercase label, pressed state lowers 2pt), which replaces `CommitStyle`
  - `TierPips`

## Play

Top to bottom:

1. `CareerHeader`, compact.
2. One meta row: "DAILY · OCT 30" left, difficulty right. Replaces the nav title, the "Make it click." hero, and the header Eve avatar.
3. The board, taking all remaining height above the controls. Rebus elements scale to the board instead of rendering at fixed emoji size. The expand control stays.
4. The attempts row: three diamond pips (used = danger, current = gold, remaining = muted) with "2 LEFT".
5. Previous guesses as a single compact strip of struck-through chips. This replaces the chat-bubble transcript.
6. Eve's latest line as one quiet sentence with a small avatar. "Ask Eve for a nudge" becomes an inline secondary button with its remaining count.
7. The answer field plus a "LOCK IN" primary action, pinned above the keyboard and tab bar.

Result state: the board stays, and a result panel replaces the controls. It shows solved or failed, XP earned (count-up), streak, any new challenge tiers (opening the unlock moment from the challenges spec), share, and the next-puzzle countdown.

The help button moves into the meta row as a small "?" icon.

## Career (renamed from Journey)

The tab is renamed Career, with an SF Symbol shield icon. Top to bottom:

1. `CareerHeader`, expanded: large emblem, rank name, level, XP bar, and lifetime XP.
2. A streak panel: current streak big, best run, next streak tier progress.
3. The weekly trail as seven day cells for Monday–Sunday, with the 3-day goal marked and the +50 XP reward.
4. "Next up": the three challenges closest to their next tier, using the challenges-wall row component, plus "View all challenges".
5. Totals strip: finished, solved, first-guess.
6. "Your aha collection" as a single row.
7. Plus solving-patterns entry, guest-account note, and "How do I earn XP?", collapsed under a footer section.

## You

1. Operator card:
   - Emblem, rank, and display name ("Guest" for guests)
   - Member since
   - Top three unlocked challenges by tier
   - Mastery count
2. Account section (unchanged rows, Prestige styling).
3. Preferences: haptics and daily reminder. Appearance is removed.
4. Rebuzzle Plus, restore purchases, privacy, terms, feedback, account deletion (unchanged behavior).

## Code structure

`Features/TodayView.swift` (1,162 lines) is split by responsibility, without changing the view model or `AppModel` contracts:

- `Features/Play/PlayScreen.swift`
- `Features/Play/BoardStage.swift`
- `Features/Play/AttemptsRow.swift`
- `Features/Play/GuessComposer.swift`
- `Features/Play/EveLine.swift`
- `Features/Play/ResultPanel.swift`

`ProgressScreen.swift` becomes `Features/Career/CareerScreen.swift`, and `JourneyRewards.swift` folds into the Career and challenges files. Existing UI test accessibility identifiers are preserved so `RebuzzleUITests` keep working. Where a test asserts copy that this redesign changes, the test is updated to the new copy.

## Accessibility and release gates

- Gold #F5C46A on #0B0C0E and ink on panel both exceed 4.5:1. Secondary #8C8677 is used only for supporting text at ≥15pt or for non-text elements.
- Uppercase tracked labels are spoken as normal words via `accessibilityLabel`.
- Board, pips, and XP bar expose combined accessibility values.
- Reduce Motion disables count-ups and tier-up animations.
- Tap targets ≥44pt.
- iPad uses the same layout centered at max width 600, as today.
- Screenshots of every tab in the `--preview` fixture are captured and reviewed on an iPhone 16 Pro simulator, plus one iPad, before merge.

## Out of scope

- Server changes (covered by the challenges spec).
- The widget extension's look.
- Onboarding and Plus paywall copy rewrites. These two get token and style updates only.
