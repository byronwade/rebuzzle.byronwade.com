# Rebuzzle Chat-First Home and Navigation

## Intent

Make Rebuzzle feel like a focused daily puzzle conversation. The app opens directly into today’s game, Eve’s opening message introduces the clue, guesses and feedback continue in the same thread, and the answer composer stays anchored at the bottom. Move secondary destinations into a clean left drawer, with an obvious lifetime Plus route.

## Why

The current Swift app already has an Eve message, chronological feedback, and a fixed composer, but it presents them inside a page led by a large marketing headline and a three-tab bar. That hierarchy makes the game feel like a collection of utility screens instead of one playable conversation. The existing Plus benefits are useful, but the offer is easy to miss.

## Goals

- Open into a single, full-screen daily puzzle experience without a persistent bottom tab bar.
- Use a ChatGPT-style left navigation drawer for Today, Journey, Past puzzles, and Profile & settings.
- Put Eve’s opening prompt before the daily puzzle board and keep it in the thread for the whole round.
- Keep the composer, guess counter, progressive hints, countdown, and puzzle board easy to reach during play.
- Make Past puzzles route directly to the archive for Plus owners and to the Plus detail page for other players.
- Pin a Plus card at the bottom of the drawer with concrete benefits, the localized StoreKit price when loaded, and explicit one-time wording. The card becomes an archive/journal shortcut after purchase.
- Preserve separate navigation stacks, existing deep-link return behavior, puzzle state, accessibility, and all StoreKit purchase/restore behavior.

## Non-goals

- Do not add chat transcripts, user accounts, or a new puzzle mode.
- Do not change the puzzle engine, answer privacy, feedback, scoring, streaks, hint rules, reminders, or purchase product.
- Do not copy ChatGPT branding, copy, icons, or exact styling. Use the familiar anchored composer and drawer pattern in Rebuzzle’s own visual system.
- Do not remove existing Journey, Profile, archive, journal, or Plus functionality.

## Interaction decisions

- The navigation drawer opens from a leading menu button, closes from its close button, an outside tap, or after a destination is selected. Reduce Motion disables the drawer animation.
- Today remains the first screen. Journey and Profile & settings switch the existing root destination. Past puzzles opens Archive when Plus is owned; otherwise it opens Plus.
- The home screen keeps a compact daily/date label, Eve’s persistent opening turn, the clue board, attempt state, reset countdown, the guess conversation, and fixed composer. The large “Make it click.” header and inline Plus pill are removed from the game page.
- The drawer shows the Plus value in plain language: replay past puzzles, keep a puzzle journal, and see solving insights. It displays `Product.displayPrice` when available and says “one-time purchase” without inventing a price otherwise.
- When Plus is owned, the drawer card changes to a useful shortcut into the puzzle collection.
- Keep the app’s three root `AppTab` values and independent navigation stacks behind the drawer so existing route and state behavior continue to work.

## Mobbin references

- ChatGPT conversation screen: an uncluttered conversation surface with a fixed composer: <https://mobbin.com/screens/10f190d9-afcf-456a-b86b-ceadedcc14ab?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp>.
- ChatGPT iOS navigation drawer: destinations and recent items are organized in one slide-over panel: <https://mobbin.com/screens/bd97b35c-d52b-43e0-b59e-33ad6040c8cf?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp>.
- Lexico word game: a clear puzzle area and text-entry interaction that keeps game context visible: <https://mobbin.com/screens/dee1f903-080e-4104-9cc0-2062634126b5?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp>.
- New Yorker daily games: the current puzzle is prominent and previous days remain discoverable: <https://mobbin.com/screens/d233b67d-5b1f-41c0-92e9-7ebdffa5f76a?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp>.

## Visual refinement after simulator review

The first simulator pass still felt like a stack of app cards under native navigation. The drawer used oversized rows with repeated subtitles, while the opening Eve message and countdown each had a separate bordered panel. The user asked for a more direct ChatGPT-like conversation and cleaner navigation.

- Keep the three independent navigation stacks and their routes, remove the TabView shell, and use a shared compact root header with a plain menu control and the title “Today.”
- Keep the daily date, guesses remaining, puzzle type, difficulty, study action, clue artwork, countdown, progress, and input. Remove the redundant “Today’s puzzle” eyebrow and present the date as compact thread context.
- Present Eve’s opening line as a plain assistant turn beside the existing Eve mark. Keep the puzzle board as the one primary framed surface; make the next-puzzle countdown an unboxed line.
- Shorten the drawer to one title, compact destination rows, and only the labels needed to group play, progress, and account. Add a direct Journal row for Plus owners and a Plus marker when locked.
- Keep the lifetime Plus offer visible at the bottom. Put the localized price and one-time wording on its first line, followed by the existing archive, journal, and solving-insight benefits.
- Open the drawer as an accessibility modal, hide and disable the covered app, and focus the Today row. Route every return-to-Today action through one helper that clears the play stack.
- Open the actual daily game on first launch. Keep the practice tutorial available from Help, but do not cover Today automatically.
- Anchor Profile & settings above the pinned Plus card, widen the drawer to 88% of the phone, and keep the bottom account/purchase controls in a stable location.
- Keep guess count in one place in the thread and label the fixed input “Reply to Eve…” so the composer reads as a chat reply.

The drawer structure follows the inspected [ChatGPT iOS sidebar](https://mobbin.com/screens/ffb4b23b-b0f7-4ec4-a414-6a66790b34df?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp); the conversation and composer follow the previously inspected [ChatGPT iOS conversation](https://mobbin.com/screens/10f190d9-afcf-456a-b86b-ceadedcc14ab?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp). The daily puzzle remains Rebuzzle’s game surface, informed by [The New Yorker iOS daily games screen](https://mobbin.com/screens/d233b67d-5b1f-41c0-92e9-7ebdffa5f76a?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp).

## Constraints

- Preserve existing staged, unstaged, and untracked work in the shared repository.
- Keep the StoreKit product `com.byronwade.rebuzzle.plus` as a non-consumable and use its localized `displayPrice`.
- Do not add or run automated tests. Build the Simulator app and inspect the changed screens manually.
