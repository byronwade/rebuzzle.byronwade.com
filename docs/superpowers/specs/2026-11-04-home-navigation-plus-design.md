# Rebuzzle Home, Navigation, and Plus Design

## Intent

Make Rebuzzle feel like a focused daily game with Eve as the guide, simplify the app's navigation, and make the lifetime Plus purchase easier to discover and understand.

## Scope

Native SwiftUI iOS screens: the daily Play screen, the three-tab navigation shell, the Progress tab title, the Profile Plus entry, and the Rebuzzle Plus offer screen.

## Design direction

- Present the first Eve prompt before the puzzle board so the daily round reads as a conversation that contains a playable clue.
- Keep the puzzle board, attempt meter, hints, guesses, Eve feedback, and fixed answer composer as the game's real interaction. The board remains a prominent, uncluttered game surface.
- Use the existing three destinations, with clearer labels: Today, Journey, and Profile. Hide the tab bar while the Plus offer is open so it behaves as one focused purchase destination and its content is not crowded by global navigation.
- Give the home entry point a larger, clearly readable Plus label with Apple's localized one-time price. The offer screen keeps the exact Plus benefits in view and pins the lifetime price and purchase action to the bottom of the screen.
- Use Rebuzzle's existing theme, type, buttons, and color roles. Mobbin informs structure only: the ChatGPT conversation screen keeps the message history and composer together; the Orbit lifetime offer anchors lifetime price and its call to action together. We do not copy their visual styles.

## Preserve

- The current three route destinations, tab selection model, deep-link handling, and independent navigation stacks.
- All game rules, puzzle rendering, answer attempts, hints, feedback, countdown, keyboard dismissal, and state restoration.
- StoreKit 2 product, localized `displayPrice`, purchase/restore flows, entitlement handling, and local journal storage behavior.
- The Plus value: replay past puzzles, a local puzzle journal with notes, and solve insights. Daily puzzles, hints, and sharing remain free.
- The existing visual tokens, Dynamic Type and Reduce Motion behavior, and accessibility identifiers wherever practical.

## Non-goals

- No changes to price, entitlements, product identifiers, feature gating, account behavior, analytics, or backend APIs.
- No new tabs, game modes, dependencies, or marketing promises.
- No new puzzle art or changes to clue-bearing geometry.

## Mobbin references

- [ChatGPT conversation screen](https://mobbin.com/screens/fbcef4f1-0bd9-42bc-a15e-1420960bdeb4?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp): persistent composer and conversation hierarchy. Rebuzzle keeps its own board and game feedback.
- [Orbit lifetime purchase screen](https://mobbin.com/screens/fb696d7b-1e16-4b8f-9494-78be7e7aad5c?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp): lifetime price and purchase action are grouped at the bottom. Rebuzzle keeps Apple's localized price, its own copy, and its own free-play details.

