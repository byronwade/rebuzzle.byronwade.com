# Candidate verification — 2026-10-25

This is an implemented native app candidate, not an uploaded App Store release. Xcode 26.3 (17C529), Swift 6.2.4, iOS SDK 26.2. Source targets iOS 18 and later.

| Check | Evidence |
|---|---|
| Swift core | `swift test --package-path apps/ios/Core`: 9 passed |
| Native runtime | Signed iPhone 17 Pro / iOS 26 simulator: 19 passed. Covers account isolation, expired guest renewal, deletion cleanup, lost-response reconciliation, SVG fallback/theme ink, direct verified purchase, failure/recovery, cancellation, unavailable products, store-load recovery, pending approval, relaunch ownership and refund revocation. |
| Backend | `pnpm --filter @rebuzzle/web test -- --runInBand`: 160 suites, 867 tests passed |
| Backend types | `pnpm --filter @rebuzzle/web typecheck`: passed |
| Changed backend lint | Initial Biome check: 15 files clean; follow-up check: 6 changed TypeScript files clean; existing config deprecation and Node22/required24 warnings remain |
| Archive | Generic iOS Release archive passed; no fixture URL/token/arguments in binary and no .storekit file in app bundle. iPad supports all four orientations. Signing disabled: not distribution signing or Organizer validation. |
| Native UI | Four tests: wrong→win, three wrong→reveal, tabs and accessibility XXXL gameplay. iPad Pro M5 iOS26.0 and iPhone16Pro iOS18.2: all four passed on each device. Follow-up iPhone17Pro iOS26 run also passed all four with composed SVG fixtures and guess feedback. |
| Appearance | Actual iPhone17Pro simulator screenshots inspected in light/dark and accessibility XXXL; content scrolls and text wraps. |

Fixture screenshot data is synthetic (light + house), generated through the app's real SwiftUI and networking/model flow with a DEBUG-only URLProtocol. It does not show production endpoint validation or prove App Store purchase availability. These are design/QA previews; capture the final store screenshots from the signed candidate after the live backend and product gates pass.

The packaged logs contain exact command output. StoreKit testing used a local configuration. A local verified purchase test is not a sandbox-device test. Direct purchase, failure/recovery and pending approval are exercised with local StoreKit. Cancellation and unavailable products are also exercised locally. Unverified transactions and real Apple sandbox restore still need device verification. VoiceOver, notification permission flows, physical-device performance and all production privacy disclosures still require the checks in Checklist.md.

## External release requirements

1. Deploy the reviewed backend routes to a transaction-capable MongoDB environment and verify live guest play, resume, sign-in and deletion.
2. Configure the Apple developer team, app record and non-consumable `com.byronwade.rebuzzle.plus`, paid-app agreement and price. This Mac reports zero valid signing identities.
3. Reconcile/publish the privacy policy and complete Connect privacy, age rating, review contact and content-rights fields.
4. Create and validate a signed distribution archive; upload to TestFlight and run real sandbox purchase/restore and physical-device checks.
5. Submit the app and first in-app purchase together. No production release was made by this implementation.

## Follow-up evidence

The initial PR commit passed hosted iOS build/tests, web lint/types/unit tests and Playwright, and Vercel preview deployment. A read-only request to the authenticated preview daily endpoint returned HTTP200 with sanitized composed SVGs and no answer. This does not establish live guest/guess/deletion validation. Follow-up changes add persisted server reactions/word matches, fixture coverage for composed visuals, and theme-aware canonical pictogram ink. Hosted checks must run on each new commit.

Store retry follow-up: a failed product lookup previously left an error visible after a successful retry. A StoreKit service test reproduced the stale message; successful loading now clears it. Cancellation leaves access locked without reporting an error, and an absent product cannot start a purchase.

Journal follow-up: completed entries retain optional composed visual data and use the same sanitized board renderer as daily play. Legacy text-only entries still decode. Core coverage verifies artwork round-trip and legacy notes. Completion offers a secondary journal link; Today navigation is account-scoped so journal destinations cannot survive an account change.
