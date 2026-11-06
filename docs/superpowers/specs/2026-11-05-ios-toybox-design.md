# Rebuzzle iOS: the toy-box game look

Date: 2026-11-05
Status: direction chosen by the owner ("you pick" → option A, toy box); TestFlight build requested when done.
Supersedes: the visual-direction section of `2026-10-25-ios-design.md` (Thorbis restraint). Product rules in that spec (one scored daily, server authority, no paid guesses, accessibility) still apply.

## Why

Players should feel they opened a game, not a reading app. Today the app is a quiet cream-and-black interface: Inter body text, an Arial Rounded headline, black commit buttons, flat sections. Mobbin references for polished casual games (Duolingo, Finch, Greenlight, Nibble, Kit, Apple Games, NYT and New Yorker puzzle hubs) share a short list of traits:

- A bright, friendly canvas with one hero object per screen.
- Chunky, tactile buttons with a solid ledge under them that sinks when pressed.
- A persistent HUD: streak, level, XP.
- Reward moments built from stars, a count-up number, a mascot and confetti.
- Rounded, heavy display type for numbers and headlines.

## Scope

iOS app only. Built on a snapshot of the work that shipped as TestFlight builds 18–53 (the Codex working tree on `feat/native-daily-redesign`), so testers keep what they already have. Reconciling with the open GitHub stacks (#210/#214, #217–#219) is a separate follow-up. The web app gets the same look in a later spec. Widgets and the Live Activity only pick up the new colors and type.

Out of scope: new game modes, sound effects, new mascot art beyond the existing Eve asset, changes to scoring, XP rules or server contracts.

## Visual language

### Color tokens (`Theme`)
Light and dark mode are both designed. Dark mode isn't an inverted copy: it's a deep night-sky navy with the same saturated accents.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `canvas` | #EAF4FF sky | #0E1726 night | screen background |
| `panel` | #FFFFFF | #1A2638 | cards, sheets |
| `panelLedge` | #C9DDF3 | #070D17 | the ledge under cards |
| `field` | #F2F7FD | #111C2D | text inputs |
| `ink` | #10223D | #F2F6FC | primary text |
| `secondary` | #4E6283 | #A8B6CC | supporting text |
| `accent` (buzz blue) | #1F66D9, ledge #154AA3 | #2F6FDB, ledge #1A4590 | primary actions, focus |
| `success` | #26803A, ledge #1A5C29 | #2E8540, ledge #1D5A2B | solved, correct |
| `reward` (gold) | #FFC21A, ledge #C98E00 | same | stars, XP, streak flame (labels on gold use `ink` #10223D, never white) |
| `error` (coral) | #D13438, ledge #9E2226 | #D23C40, ledge #9A2427 | wrong guess, destructive |
| `eve` (grape) | #6B4BE0, ledge #4B2FB5 | #7A5CE8, ledge #5238B8 | Eve, hints, Plus |

Every text-on-color pair meets WCAG AA (checked: white on accent 5.3, success 5.0, error 4.9, eve 5.7 in light; 4.6–4.75 in dark; ink on gold 9.9). Body text on `canvas` and `panel` meets AA in both modes. State is always given in words or an icon as well as color.

### Type
- Use SF Pro Rounded (`.design(.rounded)`) through Dynamic Type text styles everywhere.
- Display text (headlines, scores, the level number) is `.heavy`, and numbers use monospaced digits. Body text is `.medium`, and secondary text `.regular`.
- Inter and Arial Rounded are removed from the UI. The Inter font file stays in the bundle until nothing references it, then it's deleted.
- `Theme.font(_:weight:relativeTo:)` and `Theme.display(_:)` keep their signatures and map to the rounded system font, so existing call sites compile. New code uses `Theme.title`, `Theme.headline`, `Theme.body`, `Theme.caption` and `Theme.score` helpers.

### Shape and depth
- **Corners:** cards 22pt, buttons 16pt, pills fully round, the puzzle board 18pt.
- **Ledge:** a solid, same-hue darker fill offset 5pt below (4pt for small controls). It's not a blurred shadow. Pressing moves the face down by the ledge height and hides the ledge. This one rule gives the whole app its tactile, game feel.
- **Rim:** cards have a 2pt `panelLedge` stroke in dark mode only, so edges stay readable on the navy canvas.
- **Spacing:** keep the 4/8/12/16/24/32 rhythm and 44pt minimum hit targets.

### Motion and haptics
- Spring presets live in `Theme.Motion`: `press` (response 0.18, damping 0.7), `pop` (0.35, 0.6) and `settle` (0.5, 0.85).
- Reward sequences are staggered (stars at 0.15s apart, XP count-up over 0.8s).
- With Reduce Motion on, every animation becomes a crossfade or an instant state change, and confetti is skipped.
- Haptics: a light impact on button press-down, and the existing success and failure notifications on server-confirmed outcomes only.

## Components (`Rebuzzle/Design/`)

Each component is one small file with a `#Preview`.

- **`ChunkyButtonStyle`** has variants `.primary` (accent), `.success`, `.reward`, `.eve`, `.secondary` (white face, ledge-colored rim) and `.destructive`. It has a full-width form and a compact form. It replaces `CommitStyle`; `CommitLook` maps to `.primary`.
- **`GameCard`** is a container with a panel face, ledge and 22pt corners, and an optional tint for a colored hero card. It replaces ad-hoc `RoundedRectangle` backgrounds.
- **`HUDBar`** is a top row of pills:
  - a streak flame with its count (reward color);
  - level and XP (a level badge plus a chunky XP bar);
  - a Plus gem when Plus is active.

  It sits on the Play hub and in Journey, and reads only real, confirmed data. Pills are hidden when the data isn't loaded; they never show placeholder zeros. Tapping a pill opens Journey.
- **`ChunkyProgressBar`** is a rounded track with a ledge and an animated fill.
- **`GuessSlots`** shows three tiles for the three scored guesses: empty (outlined), wrong (coral with an ×), solved (green with a ✓). It sits above the composer and announces "2 of 3 guesses left" to VoiceOver.
- **`Pill`** is a small rounded label (icon plus text) with a tint.
- **`RewardStage`** is the solve celebration:
  - stars pop in one by one, from 3, 2 or 1 stars as already computed;
  - the XP total counts up;
  - Eve cheers, using the existing asset with a bounce;
  - confetti plays (built with `Canvas` and `TimelineView`, no dependency).

  It wraps the existing result content and doesn't replace its data.
- **`MedalView`** is a badge medallion with a locked or earned state, used for Journey badges and the achievements ladder.
- **`Notice` and `FieldStyle`** are restyled with the new tokens.

`Page` keeps its API but paints `canvas` and uses the rounded font.

## Screens

The accessibility identifiers used by the UI tests must not change. Any test that queries copy which has to change is updated in the same commit.

1. **Play hub (Home):**
   - the HUD bar at the top;
   - the Today hero card as a tinted `GameCard` with the date, difficulty pill, guess slots and one chunky "Play" or "See result" button;
   - mode cards (Practice, Archive) as smaller white `GameCard`s with an icon and title;
   - the weekly trail as a chunky progress row.
2. **Today (daily play):**
   - the board sits on a white `GameCard`;
   - guess slots replace the text count;
   - the pinned composer uses a field-style input and a chunky send button;
   - Eve's messages are speech-bubble `GameCard`s tinted grape, with the Eve avatar;
   - the signal meter uses the new colors;
   - the hint action is a compact `.eve` chunky button.
3. **Result:**
   - `RewardStage` on top;
   - then "Find another puzzle" as a `.primary` chunky button;
   - share as `.secondary`;
   - the "Your round" metrics as pills.
4. **Journey:** the HUD, level and XP card, the star trail with gold stars, badges as `MedalView` and the achievements ladder as a vertical list of medals.
5. **You (Settings):** grouped `GameCard` rows with colored icon tiles. The native controls (toggles, pickers) stay.
6. **Plus:** a grape hero card, feature rows with icon tiles and a chunky `.reward` purchase button. The purchase, restore, terms and privacy links are unchanged.
7. **Archive and Practice:** puzzle tiles as small `GameCard`s showing a stars-earned row.
8. **Tab bar:** stays the native `TabView` (system glass), tinted `accent`, with the same SF Symbols.

## Testing

- Unit-level: snapshot-free. Add a Core or app test asserting each token pair's contrast ratio is at least 4.5:1 (a small luminance helper), covering light and dark.
- The existing UI suites must pass: HomeHub, Gameplay, DailySolvePulse, Journey and others. Accessibility XXXL tests must still pass with the chunky layouts, so cards wrap and nothing is truncated.
- Add one UI test that opens the result after a fixture solve and checks that the reward stage shows the stars, the XP figure and the "Find another puzzle" button.
- Take light and dark simulator screenshots of the hub, Today, Result, Journey, You and Plus, and attach them to the PR.

## Release

- Bump `CURRENT_PROJECT_VERSION` above the highest uploaded build.
- Archive Release with the real team and automatic signing.
- Upload to App Store Connect with `xcodebuild -exportArchive` (destination: upload).
- Add "What to Test" notes for the internal group.
- Record the evidence in `docs/product/`.
