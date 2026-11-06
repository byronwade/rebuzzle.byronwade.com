# Rebuzzle Home, Navigation, and Plus Design

## Intent

Make Rebuzzle easier to enter, understand, and return to. The Play tab should feel like a daily puzzle conversation with Eve, while the game board, countdown, guess limit, hints, and answer feedback remain easy to find. Navigation should name its destinations plainly. Rebuzzle Plus should explain its practical value and its non-consumable, one-time price before someone buys it.

## Why

The app already has a three-tab shell and a guess-and-feedback conversation. The daily board and countdown give that conversation its game context. Plus already unlocks past puzzles, a journal with notes, and solving insights for a one-time purchase, but its entry point is buried in the profile/settings page and the benefit list comes after the purchase action.

## Goals

- Keep Play the first and default destination, and make the board-to-guess-to-Eve-feedback loop feel like one game conversation.
- Give a first-time player a short, accurate Eve prompt that explains what to do next.
- Make the bottom tabs clearly distinguish gameplay, progress, and profile/settings.
- Make Plus discoverable from Play and Profile without interrupting a free puzzle.
- Put the concrete Plus benefits before the purchase action, show the localized StoreKit price with an explicit one-time/no-subscription label, and make the local journal storage limitation visible before purchase.
- Keep the free daily game, hints, and sharing clear and unaffected.

## Non-goals

- Do not change puzzle content, answer privacy, scoring, streaks, hints, feedback generation, notifications, or StoreKit product identity/type.
- Do not add a new tab, recurring plan, paywall interruption, new dependency, new visual style, or new data collection.
- Do not copy ChatGPT or any Mobbin product's branding. Use conversation structure and navigation patterns inside Rebuzzle's existing theme.

## Product decisions

- Use three destinations: Play, Progress, Profile. Keep the existing `AppTab` cases and navigation stacks so deep links and existing state behavior remain intact.
- On Play, retain the puzzle board and countdown as the context above the guess thread. When there are no guesses yet, Eve gives one concise invitation. The fixed composer reads as a message input, and the first submitted guess follows into the new turn so the player sees Eve's answer-blind feedback in the same thread.
- Add a direct Plus route beside the daily date in Play and a clearly labeled value card near the top of Profile. Both open the existing Plus page.
- On Plus, explain past-puzzle replay, the private journal/notes, and solving insights before the price and purchase button. Display `Product.displayPrice`; identify the offer as one-time and non-subscription. Disclose before purchase that journal data is stored on-device and should be exported before a device change.
- Keep all copy and components within Rebuzzle's current SwiftUI theme, typography, spacing, and native navigation patterns.

## Evidence

- Mobbin's New Yorker daily-puzzle screens prioritize a clear current puzzle and keep previous puzzle days easy to revisit: <https://mobbin.com/screens/a7a21e95-2819-4042-853d-9c119a142700?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp>.
- Mobbin's iOS chat screens use a readable conversation and a composer anchored at the bottom; Rebuzzle applies that structure to guesses and Eve feedback: <https://mobbin.com/screens/36869aa5-dae8-4b65-995f-04e4bc185129?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp>.
- Mobbin's (Not Boring) Timer lifetime offer pairs explicit benefits with a selected one-time price: <https://mobbin.com/screens/1b898d31-140d-4d6c-a7fa-52a56f9fb6bf?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp>.

## Constraints

- StoreKit product remains `com.byronwade.rebuzzle.plus`, a non-consumable; use the loaded localized price rather than hard-coding currency.
- Guest/account state, restoration, and paid unlock behavior remain unchanged.
- Preserve all existing staged, unstaged, and untracked work in the shared repository.
- Do not add or run automated tests. Verify with a simulator build and manual UI inspection.
