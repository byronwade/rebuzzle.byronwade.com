# Rebuzzle Arcade Game Redesign

## Goal

Replace the chat-first landing experience with a polished game hub and a focused daily puzzle flow. Rebuzzle should read as a native puzzle game at first glance, while Eve remains a concise in-game coach after a guess.

## Research and references

- Apple’s game guidance recommends getting players into play quickly, teaching through play, keeping game text legible, and using touch targets of at least 44 × 44 pt. It also recommends adapting menus to different screen sizes. [Apple HIG: Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games)
- Apple’s Games app organizes discovery around distinct Home, Arcade, Friends, and Library destinations, with games presented through strong editorial artwork and clear play actions. The useful Rebuzzle pattern is a clear game destination and a direct route into play, not a copy of the store or a social layer. [Apple WWDC25: Engage players with the Apple Games app](https://developer.apple.com/videos/play/wwdc2025/215/)
- Amazing Marvin’s new mobile app uses a small customizable bottom bar for primary destinations and puts less-used features in a secondary panel. This informs the navigation depth only; Marvin is a productivity app, so its visual style and dashboard structure are not a game reference. [Amazing Marvin mobile app](https://help.amazingmarvin.com/amazing-marvin/welcome-to-the-new-marvin-mobile-app)
- Mobbin references reviewed: [The New Yorker daily crossword feature](https://mobbin.com/screens/d233b67d-5b1f-41c0-92e9-7ebdffa5f76a), [LinkedIn Wend gameplay](https://mobbin.com/screens/4e70862f-4bf4-44b5-995c-1340ba81f5a1), [NBA daily games](https://mobbin.com/screens/2568f6a8-e100-4f0c-8947-b93c7e95dac9), and [The New Yorker active crossword](https://mobbin.com/screens/e1452297-31ea-4ff4-9ab0-bae46b9bf00b). The useful patterns are to feature today's playable challenge, show the actual puzzle board, keep rules and controls close to gameplay, and avoid cluttering the play surface.
- Marvin's new mobile app uses a customizable bottom bar for primary destinations and a secondary More panel. Use the shallow navigation idea only; its configurable productivity dashboard is not a game reference. [Marvin mobile navigation](https://help.amazingmarvin.com/amazing-marvin/welcome-to-the-new-marvin-mobile-app)
- Thorbis's native iOS guidance favors a tab bar and stack, 44 pt targets, Dynamic Type, one accent color, and solid surfaces. Apply those platform and system rules within Rebuzzle's game presentation. [Thorbis iOS design rules](https://design.thorbis.com/)

## Product direction

The first screen becomes **Arcade**, not an Eve chat. It offers three top-level destinations: Arcade, Journey, and You. Arcade leads with the free daily challenge, current round state, streak, and a distinct archive entry. The archive offer says exactly what Plus unlocks and presents the real App Store price when available, alongside lifetime/no-subscription wording.

Daily play remains the free, server-scored mode. A dedicated play screen removes the persistent app drawer and chat-first greeting. Its HUD identifies the daily round, shows the three-guess track, and keeps the rebus board and answer composer central. Eve’s contextual feedback stays attached to submitted guesses.

Archive puzzles remain Plus-only, individually replayable, unscored practice using the current answer-blind API. Do not present archive practice as a scored arcade run or award local-only XP. A true free or scored multi-round mode requires a separate server-owned session/score contract.

## Visual direction

- Keep Rebuzzle’s existing warm neutral surfaces, but give the daily board a darker, high-contrast game stage.
- Use the existing Rebuzzle cobalt accent for the primary play action and active game states. Keep rewards and success in their existing semantic tokens. Use solid surfaces without decorative gradients or glow. Avoid cartoon mascots, oversized emoji, faux coins, and generic “streak bait.”
- Put the real daily puzzle board in the Arcade feature card, followed by puzzle type, difficulty, the three-guess HUD, and the one clear play action. Use short labels and compact live progress.
- Keep all interactive targets at least 44 pt and support Dynamic Type, VoiceOver, Reduce Motion, and smaller iPhones.

## Navigation and screen map

```text
Arcade tab
  ├─ Daily challenge → Daily round → Result/review
  ├─ Archive → Plus offer (when locked) or puzzle list → Unscored practice round
  └─ How to play
Journey tab
  └─ Progress, streak, badges, journal
You tab
  └─ Account, reminders, sound, accessibility, settings
```

Use a shallow native three-tab bar for the three frequent destinations. Remove the slide-out navigation drawer from the user flow. Hide the tab bar during active daily gameplay so it feels focused; return to Arcade from a compact in-game home/back control.

## Acceptance criteria

1. The first launch presents a game hub with one clear, functional “Play today” action and no chat transcript.
2. The hub accurately reflects loading, active, and completed daily states using the server-owned session.
3. Journey and profile/settings remain reachable in one tap through the primary navigation.
4. Archive access clearly explains the lifetime Plus purchase and does not claim practice affects score, streak, or rewards.
5. In-game screen places the puzzle board and answer action ahead of secondary information; guess feedback is shown after play.
6. All routes preserve existing daily scoring, hint, reminder, StoreKit entitlement, restore, privacy, and accessibility behavior.
7. A simulator build succeeds and the revised hub/gameplay screens are visually inspected at an iPhone-sized layout. No automated tests are added or run in this pass.
