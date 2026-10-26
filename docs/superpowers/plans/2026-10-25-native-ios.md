# Rebuzzle iOS Implementation Plan

> Execution: native implementation in this session, with isolated backend delegation and a fresh whole-change review. User approved all implementation without further questions.

**Goal:** Ship a native daily puzzle app with Thorbis design, reliable play, a personal journal, StoreKit Plus, reminders, and release materials.
**Architecture:** SwiftUI app with a dependency-free Swift package for Codable contracts, journal persistence and gameplay invariants. URLSession and Keychain connect to the existing authoritative backend. StoreKit manages local Plus entitlement.
**Tech Stack:** Swift 6, SwiftUI, Observation, StoreKit 2, UserNotifications, XcodeGen, Swift Testing.
**Spec:** ../specs/2026-10-25-ios-design.md

## Global constraints
- iOS 18 minimum; system chrome, Inter content typography, Thorbis light/dark tokens.
- Exactly one daily scored puzzle; server determines attempts, answer and outcome.
- Free gameplay, one-time Plus for journal and deeper insights; localized StoreKit price.
- No automatic replay of uncertain submissions, secrets in client, fabricated progress or unverified revenue claims.

## Review focus
- Reconnect after accepted-but-lost response: resume before resubmit.
- Account changes: never mix guesses, drafts, or journals.
- Timezone/day changes: use server publication identity and date.
- Refund/revocation: no paid access, preserve notes and export.
- Large type/long puzzles: keyboard and scrolling preserve actions and clue meaning.

## Tasks
- [x] 1. Core contracts and journal. Create apps/ios/Core/Package.swift, Sources/RebuzzleCore/{Models,Journal,GameSession}.swift and Tests/RebuzzleCoreTests/CoreTests.swift. Test terminal-only reveal, guesses/limits, idempotent completion, scoped persistence and spoiler-free sharing; watch failing test then implement. Verify `swift test --package-path apps/ios/Core`.
- [x] 2. Native backend integration. Add authenticated session restoration and public rich visuals with ownership/solution tests. Record precise API in docs/ios-api.md. Use existing server atomic guess path.
- [x] 3. App runtime. Create apps/ios/Rebuzzle/{App,Services,Features,Design} and project.yml. Implement async URLSession client, Keychain credential ownership, session loading/recovery, journal persistence, account sign-in/out/deletion, StoreKit purchase/restore/update, reminders. Build with xcodebuild for Simulator.
- [x] 4. Native experience. Today, result, progress, journal, Plus, settings, native help and sharing. Shared Thorbis primitives and Inter font assets. Verify on simulator in light/dark and accessibility sizes; add UI smoke tests and fixture injection that is DEBUG-only.
- [ ] 5. Commercial and release quality. Add app icon, privacy manifest, StoreKit test config, release checklist, App Store copy, screenshot exports, CI build/test. Verify archive without signing, tests, purchases via StoreKit testing when available; identify external release gates precisely.
- [x] 6. Review and delivery. Fresh review, fix material findings with regressions, run targeted then complete relevant suites, package source and screenshots in outputs. Do not mark goal complete until release requirements are evidenced.

Task 5 implementation is delivered. External Apple account, deployed backend and real-device/TestFlight gates remain open; see apps/ios/Release/Checklist.md.
