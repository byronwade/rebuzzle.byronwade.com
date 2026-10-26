# Candidate verification — 2026-10-25

This is an implemented native app candidate, not an uploaded App Store release. Xcode 26.3 (17C529), Swift 6.2.4, iOS SDK 26.2. Source targets iOS 18 and later.

| Check | Evidence |
|---|---|
| Swift core | `swift test --package-path apps/ios/Core`: 6 passed |
| Native runtime | Signed iPhone 17 Pro / iOS 26 simulator: 11 passed. Covers account isolation, expired guest renewal, deletion cleanup, lost-response reconciliation, sanitized SVG fallback, verified purchase, relaunch ownership and refund revocation. |
| Backend | `pnpm --filter @rebuzzle/web test -- --runInBand`: 160 suites, 863 tests passed |
| Backend types | `pnpm --filter @rebuzzle/web typecheck`: passed |
| Changed backend lint | Biome check: 15 files clean; existing config deprecation and Node22/required24 warnings remain |
| Archive | Generic iOS Release archive passed; no fixture URL/token/arguments in binary and no .storekit file in app bundle. iPad supports all four orientations. Signing disabled: not distribution signing or Organizer validation. |
| Native UI | Four tests: wrong→win, three wrong→reveal, tabs and accessibility XXXL gameplay. iPad Pro M5 iOS26.0 and iPhone16Pro iOS18.2: all four passed on each device. |
| Appearance | Actual iPhone17Pro simulator screenshots inspected in light/dark and accessibility XXXL; content scrolls and text wraps. |

Fixture screenshot data is synthetic (light + house), generated through the app's real SwiftUI and networking/model flow with a DEBUG-only URLProtocol. It does not show production endpoint validation or prove App Store purchase availability. These are design/QA previews; capture the final store screenshots from the signed candidate after the live backend and product gates pass.

The packaged logs contain exact command output. StoreKit testing used a local configuration. A local verified purchase test is not a sandbox-device test. Cancel/pending/unverified paths are implemented but have not all been exercised here. VoiceOver, notification permission flows, physical-device performance and all production privacy disclosures still require the checks in Checklist.md.

## External release requirements

1. Deploy the reviewed backend routes to a transaction-capable MongoDB environment and verify live guest play, resume, sign-in and deletion.
2. Configure the Apple developer team, app record and non-consumable `com.byronwade.rebuzzle.plus`, paid-app agreement and price. This Mac reports zero valid signing identities.
3. Reconcile/publish the privacy policy and complete Connect privacy, age rating, review contact and content-rights fields.
4. Create and validate a signed distribution archive; upload to TestFlight and run real sandbox purchase/restore and physical-device checks.
5. Submit the app and first in-app purchase together. No production release was made by this implementation.
