# Release gates

Status: release preparation only. No box below asserts a completed external action. Record evidence (commit/build, device/OS, date, outcome, log or screenshot) beside each checked item. Source and simulator validation do not establish distribution readiness.

## Local candidate

- [x] Generate project with XcodeGen; Swift package tests pass (6 tests; see Verification.md).
- [x] Generic simulator build passes with `CODE_SIGN_IDENTITY=-` and DerivedData under `/tmp` (CI uses runner temporary storage); application-hosted unit tests pass on a concrete simulator.
- [ ] Inspect Today, result, Progress, Journal, Plus, sign-in, account deletion and Settings on iPhone and iPad; keyboard, VoiceOver, Dynamic Type, light/dark, Reduce Motion and contrast checked.
- [x] Release binary excludes fixture URL/token/arguments; app bundle contains no .storekit file. Archive inspected.
- [ ] Capture actual release screenshots; inspect app icon, version/build and launch presentation.

## Backend — outstanding deployment gate

- [ ] Deploy reviewed native API changes; production deployment has not been performed by preparing these files.
- [ ] Verify `/api/puzzle/today` includes supported sanitized visual data and correct local puzzle date/next release time.
- [ ] Verify Bearer guest/session/login/logout/stats flows and `/api/puzzle/session` reconciliation against live production.
- [ ] Test wrong guess, solve, exhaustion, duplicate-submit protection, timeout after server acceptance, foreground resume, expired credentials, midnight and timezone travel. Confirm server lock/points remain authoritative and no answer leaks before completion.
- [ ] Verify `/api/user/account` DELETE for guest and registered test users, wrong-password rejection, removal of associated data, stale-token rejection and local account-data cleanup. MongoDB transactions must work in production.
- [ ] Check privacy, terms, feedback, signup and password recovery links on device; publish reconciled privacy policy.

## Apple account and purchases — outstanding external gates

- [ ] Confirm developer membership, app identifier, signing team, distribution certificates/profiles, App Store Connect record, paid-app agreement, tax and banking setup.
- [ ] Create `com.byronwade.rebuzzle.plus` as a non-consumable; configure localized name/description and price (initial US proposal $9.99), availability and review screenshot. Do not assume the local `.storekit` file creates a store product.
- [ ] Locally exercise purchase success, cancel, pending, failed/unverified transaction, missing product, relaunch, restore and revocation. Pending/cancelled/unverified purchases must not grant access.
- [ ] On a signed physical device with StoreKit fixture disabled, test real sandbox product discovery, localized price, purchase and restore. Test entitlement recovery on a second device: journal data must not be implied to sync.
- [ ] Test revocation removes paid access while preserving notes and export. Verify Apple-account/Rebuzzle-account switching does not expose another Rebuzzle account's journal.
- [ ] Verify local reminders enabled/disabled/denied, chosen time, completed-day suppression, timezone changes and app relaunch on device.

## Submit

- [ ] Confirm CI runner image has the pinned Xcode 26.3 toolchain and a successful workflow run on the release commit; a local build does not prove hosted CI execution.
- [ ] Resolve the privacy inventory and archive privacy report; complete App Store privacy answers, age-rating questionnaire, content rights and export-compliance answers using actual app behavior. The source currently declares no non-exempt encryption; confirm eligibility before submission.
- [ ] Create distribution archive with actual team identity; Organizer validation passes. Record archive/build identifier and upload receipt.
- [ ] Install processed TestFlight build; repeat core guest gameplay, deletion and Plus sandbox checks against the deployed backend.
- [ ] Enter store listing, device screenshots, review contact and review notes; provide private review-account credentials if needed for registered-account testing.
- [ ] Submit first non-consumable with app version; resolve Connect validation and review requirements. Configure release timing deliberately.
- [ ] After approval/release, verify store installation, production purchase visibility, first-session success and support availability. Monitor real failures and retention; do not infer commercial success from fixture tests.
