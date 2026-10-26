# Rebuzzle for iOS — daily ritual and revenue design

## Intent

Build a fully native Swift and SwiftUI iPhone app for Rebuzzle. The user’s explicit priorities are exceptionally strong design and implementation quality. The existing product is a daily puzzle game with limited guesses, progressive hints, server-side answer checking, accounts, and statistics. The user additionally requires a single-puzzle-per-day game that is extremely fun, encourages repeat daily play, and can earn revenue. This proposal adapts that experience to iPhone. Retention and commercial success are outcomes to measure with players, not claims that source code alone can prove.

The user requires the entire app to follow https://design.thorbis.com. This replaces the earlier proposed editorial/serif direction. Product scope below remains proposed.

## Visual direction — Thorbis

Use Thorbis’s published interface rules as the design source of truth: https://design.thorbis.com/ and https://design.thorbis.com/design.md. Adapt its native iOS guidance to Rebuzzle’s puzzle vocabulary and identity.

Design dark appearances first: achromatic canvas `oklch(14.5% 0 none)`, panel `oklch(20.5% 0 none)`, warm foreground `oklch(96.8% 0.009 84.6)`, and cool body text `oklch(94.1% 0.013 255.5)`. Use electric blue `oklch(55.8% 0.188 264.4)` sparingly for selection and focus. Light mode is a cream surface with deliberately retuned contrast. Follow the system theme by default and persist overrides.

Use SF Pro for system chrome and Inter for puzzle interface content, with regular and medium weights, sentence case, and Dynamic Type. Preserve type characteristics required by individual clues. No decorative serif headings. Use the 4/8/12/16/24/32/48 spacing rhythm, 10-point primary action corners, 14-point content sheet corners, and at least 44-point hit targets. Do not copy desktop type sizes where native accessibility requires larger sizing.

Keep the puzzle dominant, navigation quiet, and one primary action per view. Distinguish sections by alignment, tone, and spacing rather than divider rules or a grid of cards. Inputs sit in darker recessed surfaces; the primary action uses foreground-colored fill, inverse text, a subtle bevel, and a continuous thin rim. Maintain 12 points between adjacent rimmed controls. Do not add gradients, colored side rails, ornamental shadows, or custom glass panels.

Use native tab bars, navigation stacks, swipe-back, bottom sheets for secondary tasks, and system sharing. Apple glass is acceptable on system chrome only. Keep action labels and control dimensions stable during loading. Show validation by the input, and describe status in words as well as color. Preserve drafts and distinguish pending, failed, offline, stale, and uncertain results. Motion should be brief and functional, respect Reduce Motion, and never delay routine interaction. Haptics acknowledge confirmed outcomes.

## First release experience

### Today

Open directly to the daily puzzle. Show the date, puzzle type, difficulty, remaining guesses, the puzzle itself, and a clearly labeled answer field with a prominent submit action. Preserve the exact clue order and spacing from the server. Accommodate longer textual puzzles through flexible layouts and scrolling; do not reinterpret clues in ways that change their meaning.

Start guest access when needed for gameplay. Reveal hints progressively. Present submitted guesses and feedback clearly, and prevent duplicate submissions while a request is running. Let the server decide correctness, remaining attempts, points, and final lock state. Completion reveals the explanation and an answer-free share summary through the native share sheet. Show the next puzzle time using the server response and refresh when the app returns to the foreground or the local puzzle day changes.

### Progress

Show real account statistics, including solves, win rate, and streak information where supported by the API. Use a restrained chart or history visualization only when backed by real data. Provide useful first-play, loading, unavailable, and error states. Never fabricate progress or imply that guest progress syncs across devices.

### Settings and account

Provide appearance selection, haptics, how-to-play guidance, privacy and terms links, and native sign-in/sign-out flows using existing account endpoints. Use the system browser for account creation or recovery if the first release cannot support those flows completely and accessibly. Offer an optional daily reminder after the player completes a puzzle, with a time picker and an explanation before requesting system permission. Offer Rebuzzle Plus through StoreKit as described below. Core gameplay never requires notification permission or purchase.

## Daily play and return loop

One scored puzzle per local calendar day, using the existing server date and lock contract. Every player receives the same puzzle for a given date. No paid extra attempts, paid hints, bonus daily puzzles, or replay-for-score. Preserve the existing server attempt limit (currently three), with the final server response authoritative.

The first screen puts today's clue in view immediately. A small optional how-to sheet explains reading clues, submitting a phrase, and using hints. It must not reveal today's answer or force an onboarding carousel. The initial player action is solving, not signing up.

After each confirmed guess, show the submitted phrase, server-provided feedback, and remaining guesses. Use word feedback only if the backend returns it. No invented closeness score. Keep the answer field and submit label stable while checking. A failed network request preserves the draft; an ambiguous timeout requires reconciliation before another submission.

After a solve, replace the answer controls with a restrained native result: the answer, a concise explanation of how the clues fit, attempts used, and a meaningful progress update. A brief haptic and check transition acknowledge success. After a loss, provide the same understandable reveal and a warm invitation to tomorrow's puzzle. A session has a satisfying ending, rather than an endless feed.

Build a seven-day participation strip and cumulative milestones at 7, 30, and 100 completed daily puzzles, derived from genuine history. Participation milestones count wins and losses; solve rate and guess distribution remain separate. Label any local-only history accurately. Do not erase cumulative accomplishments when a daily streak ends. Never invent percentile ranks or community counts.

Sharing creates a compact result with date, attempts, hint usage, and a link to Rebuzzle, without clue text or the answer. Use the system share sheet. A recipient reaches the same date's experience subject to existing availability; do not promise a universal-link flow before the associated-domain setup exists.

Offer reminders only through explicit player choice after a completed session or in Settings. Schedule at the chosen local time; cancel today's pending reminder after completion where possible and explain denied permissions with a Settings route. No urgency notifications about losing purchases or accomplishments.

## Revenue — proposed first offer

Rebuzzle Plus is a one-time non-consumable purchase. Initial US price hypothesis: $9.99, subject to App Store Connect configuration and testing with real players. Runtime copy always uses the StoreKit product's localized price. This is a pricing experiment, not a revenue forecast.

Free includes the entire daily puzzle, all normal hints and guesses, answer explanations, spoiler-free sharing, basic statistics, the current weekly participation strip, reminders, and accessible light/dark modes.

Plus unlocks a lasting personal puzzle journal with completed-puzzle entries, personal notes, and extended history/insights by puzzle type and hint usage. The journal records only puzzles actually played; it does not provide extra playable puzzles. Do not promise retroactive details that the server did not retain. History starts when this native app records verified results, with server history imported only where an audited endpoint supports it. Explain device-local journal storage clearly; authenticated gameplay statistics and Apple purchase restoration are separate from journal synchronization. Export the journal through the system share sheet so the record is portable.

The Plus screen shows concrete previews using the player's own history, or explicitly labeled examples if there is no history. Keep purchase, restore, terms, and privacy clear. A small optional Plus entry appears in Progress and Settings; never interrupt a guess or force a paywall before revealing a result. The one-time model avoids promising ongoing paid content before that pipeline exists. A subscription can be reconsidered after retention and paid value are validated.

Use StoreKit 2 verified transactions, current entitlements, transaction updates, explicit restore, and revocation handling. Cancelled or pending purchases never grant access; revoked purchases remove paid editing/insights but preserve user-authored journal data and export access. Missing products produce a truthful unavailable state, not a fake successful purchase. Xcode StoreKit configuration supports development tests; production products and signed-device sandbox testing are release requirements.

## Success evidence

Instrument a small consent-aware funnel: puzzle viewed, first guess submitted, server-confirmed completion, share sheet opened, reminder enabled, Plus viewed, purchase verified, and journal used. Do not count a share-sheet opening as a delivered share. Never transmit guesses, notes, answers, credentials, or device advertising identifiers as analytics properties. Keep first-party event schema and retention rules documented before connecting collection.

Evaluate first-session completion, day-2/day-7/day-30 return rates, completion by puzzle type, hints/attempts distribution, and Plus conversion among eligible players. Track crash-free sessions and answer-check failures alongside retention. Baselines and targets require real cohorts; do not report them from fixtures. Monetization evaluation includes actual collected revenue and costs, not just store prompt activations.

Before claiming the experience is proven fun, observe several people play without coaching and return on a later day. Record where they misunderstand a clue, doubt feedback, miss a control, or fail to understand the paid offer. Build-and-test completion and live business validation are separate milestones.

## Technical approach

Add an independent Xcode project under `apps/ios` in the existing monorepo. Keep the Expo client intact. Use SwiftUI, Observation, URLSession, async/await, StoreKit 2, UserNotifications, and Keychain for credentials. Use a versioned local persistence format for journal entries, preferences, and recovery state. Prefer no third-party dependencies. Recommended minimum deployment target: iOS 18, adopting native iOS 26 presentation where available with compatible fallbacks.

Reuse the production API, including `/api/puzzle/today`, `/api/auth/guest/lazy`, `/api/puzzles/guess`, and existing account/statistics routes. Verify each response shape and authentication mechanism against current server code before implementation. Carry timezone and stable device identity according to backend conventions. Do not ship backend secrets or evaluate live answers in the client.

Persist appropriate puzzle and in-progress state locally, scoped by account and puzzle date. Restore only what can be reconciled with the server; never replay uncertain guess submissions automatically. Offline mode may show cached clues and guesses but must clearly require a connection to check an answer. Handle expired sessions, rate limits, server lock responses, and unavailable puzzles explicitly.

## Quality bar

Use real native controls, accessible labels, Dynamic Type, sufficient contrast, VoiceOver support, keyboard-safe answer entry, and comfortable touch targets. Test core decoding and gameplay transitions with fixtures, including wrong answers, wins, losses, locked sessions, transport failures, and day changes. Test duplicate completion ingestion, journal migration/export, account isolation, reminder scheduling across timezones, and purchase success/cancellation/pending/revocation/restoration. StoreKit fixtures alone do not prove a production purchase is configured. Build with installed Xcode 26.3 and inspect simulator screens at standard and larger text sizes in light and dark appearances.

Deliver source, an Xcode project, setup instructions, and simulator screenshots. Identify any unverified production integrations explicitly. App Store submission, signing with a distribution identity, and backend deployment are separate release steps.

## Scope boundaries

This first version includes excellent daily play, progress, the journal, a working Plus purchase flow, optional local reminders, and account/settings behavior. Creator Studio, community puzzle creation, widgets, remote push campaigns, multiplayer, and full parity with every web page are deferred. Supporting a server puzzle format must preserve its meaning; any unsupported format receives an honest unavailable state and an option to open the web experience rather than a misleading rendering.

## Repository observations

Repository: https://github.com/byronwade/rebuzzle.byronwade.com

The monorepo already includes Next.js, Electron, and Expo clients. The public daily endpoint successfully returned a rebus puzzle on October 25, 2026. Answer checking requires authenticated or guest access. CodeGraph was initialized at the user’s request: 939 files, 8,979 nodes, and 8,026 edges indexed.

## Monetization references

- Apple purchase design: https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase
- App Store purchase configuration: https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/
- StoreKit testing: https://developer.apple.com/documentation/storekit/testing-in-app-purchases-in-xcode
- Review guidelines: https://developer.apple.com/app-store/review/guidelines/

These references inform purchase behavior and release checks; the proposed offer and price are product decisions, not Apple recommendations.

## Verified backend work required

The October 25 audit found no native iOS target or billing implementation in the checkout. Before declaring live gameplay ready:

1. Include sanitized `PuzzleVisual` data in the daily public response; the current route omits `raw.visual`. Match the web renderer’s spatial meaning in SwiftUI and add fixtures for supported rich layouts. An unsupported format must not silently downgrade to a misleading clue.
2. Add an authenticated native session/resume JSON API backed by existing server attempt records. Return puzzle identity/date, attempts, remaining attempts, monotonic hint usage when recorded, and completion state. Return answer/explanation only for a verified completed puzzle. A timeout must be resolved against this endpoint before resubmitting.
3. Supply the existing timezone cookie on all game requests and use returned date keys. Reconcile server recent-play UTC history with daily local dates before using it for a weekly participation strip. Preserve publication lock across timezone travel.
4. Continue using server point multipliers and rewards only. The legacy attempt-recording endpoint is deprecated and returns HTTP 410; do not call it.
5. Plus initially unlocks local journal/insights through verified StoreKit entitlements on the Apple account. Cross-platform paid access is not promised. A future server-protected paid feature requires separate server transaction validation, entitlement storage, and notification handling.

Relevant code: `apps/web/src/app/api/puzzle/today/route.ts`, `apps/web/src/app/api/puzzles/guess/route.ts`, `apps/web/src/app/actions/gameActions.ts`, `apps/web/src/lib/game/retention-stats.ts`, `apps/web/src/lib/timezone.ts`, and `packages/config/src/constants.ts`.
