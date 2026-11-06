# Release gates

Status: public release preparation; later dated evidence records completed beta uploads and backend deployments. Historical unchecked preparation items must be reconciled with those receipts. Record evidence (commit/build, device/OS, date, outcome, log or screenshot) beside each checked item. Source and simulator validation do not establish distribution readiness.

## Local candidate

- [x] Generate project with XcodeGen; Swift package tests pass (9 tests; see Verification.md).
- [x] Generic simulator build passes with `CODE_SIGN_IDENTITY=-` and DerivedData under `/tmp` (CI uses runner temporary storage); application-hosted unit tests pass on a concrete simulator.
- [ ] Inspect Today, result, Progress, Journal, Plus, sign-in, account deletion and Settings on iPhone and iPad; keyboard, VoiceOver, Dynamic Type, light/dark, Reduce Motion and contrast checked.
- [x] Release binary excludes fixture URL/token/arguments; app bundle contains no .storekit file. Archive inspected.
- [ ] Capture actual release screenshots; inspect app icon, version/build and launch presentation.

## Backend — outstanding deployment gate

- [ ] Deploy reviewed native API changes; production deployment has not been performed by preparing these files.
- [ ] After deployment, configure production and sandbox App Store Server Notifications V2 to `https://rebuzzle.byronwade.com/api/storekit/notifications`; send a Test notification and verify its signed notification receipt before enabling Plus archive in production.
- [ ] Keep production API sandbox-entitlement rejection enabled. For TestFlight Plus testing, configure a separate publicly reachable beta API with `STOREKIT_ALLOW_SANDBOX_TRANSACTIONS=true` and set the TestFlight build's API base URL to that beta service; Vercel Preview currently requires SSO and cannot serve the iOS app.
- [ ] On a signed device, verify StoreKit transaction JWS reaches the archive/practice API, non-Plus and revoked transactions receive 403, a three-wrong-guess signed round is required to reveal, and a refund notification immediately removes server access.
- [ ] Verify `/api/puzzle/today` includes supported sanitized visual data and correct local puzzle date/next release time.
- [ ] Verify Bearer guest/session/login/logout/stats flows and `/api/puzzle/session` reconciliation against live production.
- [ ] Test wrong guess, solve, exhaustion, duplicate-submit protection, timeout after server acceptance, foreground resume, expired credentials, midnight and timezone travel. Confirm server lock/points remain authoritative and no answer leaks before completion.
- [ ] Verify `/api/user/account` DELETE for guest and registered test users, wrong-password rejection, removal of associated data, stale-token rejection and local account-data cleanup. MongoDB transactions must work in production.
- [ ] Check privacy, terms, feedback, signup and password recovery links on device; publish reconciled privacy policy.

## Apple account and purchases — external gates

October 26 read-only Connect check: Paid Apps Agreement and Free Apps Agreement Active; banking and US tax form Active; Digital Services Act Active. No financial details are retained here and no agreements/settings were changed. Signing/upload evidence is recorded below; the broad account/signing checklist item remains open until its remaining checks are reconciled.

- [ ] Confirm developer membership, app identifier, signing team, distribution certificates/profiles, App Store Connect record, paid-app agreement, tax and banking setup.
- [x] App Store Connect inspected October 26: non-consumable `com.byronwade.rebuzzle.plus` (Apple ID 6827099582), US $9.99, all countries/regions selected, English name/description and review screenshot present. Status Prepare for Submission; first product must accompany the app version. This is configuration evidence, not production purchase availability.
- [x] Local StoreKit tests cover direct purchase success, cancellation, pending approval, failure/recovery, missing product, relaunch entitlement and refund revocation. Store-load recovery clears stale error copy. See Verification.md.
- [x] Local unverified-transaction and explicit Restore purchases service flows: 34 hosted tests passed on October 26, source e017f35. Real StoreKitTest invalid-signature, owned/empty restore, network recovery and preservation of verified access are covered. Physical-device sandbox validation remains open below.
- [ ] On a signed physical device with StoreKit fixture disabled, test real sandbox product discovery, localized price, purchase and restore. Test entitlement recovery on a second device: journal data must not be implied to sync.
- [ ] Test revocation removes paid access while preserving notes and export. Verify Apple-account/Rebuzzle-account switching does not expose another Rebuzzle account's journal.
- [ ] Verify local reminders enabled/disabled/denied, chosen time, completed-day suppression, timezone changes and app relaunch on device.

## Submit

- [ ] Confirm CI runner image has the pinned Xcode 26.3 toolchain and a successful workflow run on the release commit; a local build does not prove hosted CI execution.
- [ ] Resolve the privacy inventory and archive privacy report; complete App Store privacy answers, age-rating questionnaire, content rights and export-compliance answers using actual app behavior. The source currently declares no non-exempt encryption; confirm eligibility before submission.
- [x] Create signed archive with the actual team identity; Xcode export validation and App Store Connect upload succeeded for build 26. Record the archive/build identifier and upload receipt below. TestFlight processing and Family-group availability are still pending.
- [ ] Install processed TestFlight build; repeat core guest gameplay, deletion and Plus sandbox checks against the deployed backend.
- [ ] Enter store listing, device screenshots, review contact and review notes; provide private review-account credentials if needed for registered-account testing.
- [ ] Submit first non-consumable with app version; resolve Connect validation and review requirements. Configure release timing deliberately.
- [ ] After approval/release, verify store installation, production purchase visibility, first-session success and support availability. Monitor real failures and retention; do not infer commercial success from fixture tests.

## App-level EU status follow-up — October 26

App Information identifies this app as non-trader, despite the account-level DSA status showing Active. No classification was changed. The developer must assess the app’s trader status before public EU release; TestFlight does not itself require trader publication. If trader status is selected, Apple requires verified contact information and a compliance certification. See [Apple’s DSA guidance](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements).

## TestFlight upload — November 4, 2026

- Version 1.0.0, build 22, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current `feat/native-daily-redesign` working tree.
- `xcodebuild -exportArchive` reported `Upload succeeded` and `Uploaded Rebuzzle`; App Store Connect then reported that the package was processing. TestFlight readiness and Family group assignment are not yet confirmed.
- The retained Xcode archive is `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (22).xcarchive`.
- Existing Family public invite link: https://testflight.apple.com/join/aPEPVC7z. This group link does not change per build; confirm build 22 is available in the group after processing.
- Backend deployment and physical-device validation gates above remain open; this upload does not close them.

## TestFlight upload — November 4, 2026 (build 23)

- Version 1.0.0, build 23, bundle `com.byronwade.rebuzzle`, built from the current Rebuzzle working tree with Xcode 26.3. The generic iOS Simulator build and Release archive succeeded.
- App Store export produced an IPA signed as `Apple Distribution: Byron Wade (T677262U5B)`. Xcode reported `Upload succeeded`; App Store Connect reported that the package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (23).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z; the link is group-level. Build 23 must finish processing and be available to that group before testers can install it.
- Backend deployment and physical-device validation gates above remain open; this upload does not close them.

## TestFlight upload — November 4, 2026 (build 24)

- Version 1.0.0, build 24, bundle `com.byronwade.rebuzzle`, archived from the current iOS working tree with Xcode 26.3. The XcodeGen project and Release archive succeeded.
- `xcodebuild -exportArchive` reported `Upload succeeded` and `Uploaded Rebuzzle`; App Store Connect reported that the package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (24).xcarchive`.
- The existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z; it is group-level and does not change per build. Build 24 must finish processing and be available to the Family group before testers can install it. Group availability has not been verified from this upload receipt.
- Backend deployment and physical-device validation gates above remain open; this upload does not close them.

## TestFlight upload — November 4, 2026 (build 26)

- Version 1.0.0, build 26, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current `feat/native-daily-redesign` working tree at HEAD `8be5451` plus its existing staged, unstaged, and untracked changes.
- The generic iOS Release archive succeeded. `xcodebuild -exportArchive` reported `Upload succeeded` and `Uploaded Rebuzzle`; the delivery receipt reported `PROCESSING` with no processing errors at upload time.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (26).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z; a read-only request returned HTTP 200. The link is group-level and does not change per build. Build 26 was still processing at upload completion, so Family-group assignment and tester availability must be confirmed after processing.
- Backend deployment and physical-device validation gates above remain open; this upload does not close them.

## TestFlight upload — November 4, 2026 (build 27)

- Version 1.0.0, build 27, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the same iOS source state as build 26. The build number was overridden to 27 for archive/export; `apps/ios/project.yml` and the generated Xcode project now default to 27 for subsequent builds.
- The Release archive succeeded. Xcode's App Store Connect export reported `Upload succeeded` and `Uploaded Rebuzzle`; App Store Connect reported that the package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (27).xcarchive`.
- The existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z; it is group-level and does not change per build. Build 27 still needs to finish processing and be available to the Family group before testers can install it.
- Backend deployment and physical-device validation gates above remain open; this upload does not close them.

## TestFlight upload — November 4, 2026 (build 28)

- Version 1.0.0, build 28, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current iOS working tree. This build includes the native Aha reveal: the original puzzle board now appears with its answer and explanation after a round ends.
- The Release simulator build and iOS Release archive succeeded. Xcode's App Store Connect export reported `Upload succeeded` and `Uploaded Rebuzzle`; App Store Connect reported that the package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (28).xcarchive`.
- The existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z; it is group-level and does not change per build. Build 28 still needs to finish processing and be confirmed available to the Family group before testers can install it.

## TestFlight upload — November 4, 2026 (build 29)

- Version 1.0.0, build 29, bundle `com.byronwade.rebuzzle`, archived from the current iOS working tree.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (29).xcarchive`.
- Xcode 26.3 `xcodebuild -exportArchive` completed with `Upload succeeded` and `Uploaded Rebuzzle`; App Store Connect reported the package is processing.
- The existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z; it is group-level and does not change per build. Confirm build 29 has finished processing and is assigned to the Family group before treating it as installable.
- Read-only App Store Connect check after upload showed the Family group had 1 tester and builds 21 and 12 only; build 29 was not listed yet. External-browser controls are disabled in this session, so group assignment could not be completed here.
- Backend deployment, VoiceOver/Reduce Motion review, and physical-device validation gates remain open; this upload does not close them.


## TestFlight upload — November 4, 2026 (build 30)

- Version 1.0.0, build 30, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current `feat/native-daily-redesign` working tree at HEAD `8be5451` plus its existing staged, unstaged, and untracked changes.
- The Release archive succeeded. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle`; App Store Connect reported `Uploaded package is processing`.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (30).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. It is group-level and does not change per build. Build 30 must finish processing and be assigned to the Family group before testers can install it.
- App Store Connect group assignment and tester availability could not be verified because local browser controls are disabled in this environment. Backend deployment, VoiceOver/Reduce Motion review, and physical-device validation remain open.
- The local branch was two commits behind `origin/feat/native-daily-redesign` at archive time. Those commits add configurable API-origin selection and stricter URL validation; build 30 uses this checkout’s default production API origin and does not contain those two upstream changes. Git also reported a truncated object pack while checking the difference.

## TestFlight upload — November 4, 2026 (build 31)

- Version 1.0.0, build 31, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current `feat/native-daily-redesign` working tree at HEAD `8be5451` plus the working-tree changes. `CURRENT_PROJECT_VERSION=31` was passed to the archive action.
- The Release archive succeeded. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle`; App Store Connect reported `Uploaded package is processing`.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (31).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. It is group-level and does not change per build. Build 31 must finish processing and be assigned to the Family group before testers can install it. App Store Connect group assignment could not be verified because browser controls are disabled in this environment.
- Backend deployment, VoiceOver/Reduce Motion review, and physical-device validation remain open.

## TestFlight upload — November 4, 2026 (build 34)

- Version 1.0.0, build 34, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current iOS source, including the latest in-round progress HUD, compact daily countdown, and closeness feedback meter.
- The Release archive succeeded. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 14:44 ET; App Store Connect reported that the uploaded package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (34).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z; the link is group-level, and its public page returned HTTP 200 for Rebuzzle. Build 34 must finish processing and be available to the Family group before testers can install it. Build-specific group assignment remains unverified.
- Physical-device validation and the remaining release gates above are still open.

## TestFlight upload — November 4, 2026 (build 35)

- Version 1.0.0, build 35, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current iOS source. The result screen now reveals the clue, answer, and explanation in sequence, with an immediate path when Reduce Motion is enabled.
- The Release archive succeeded. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 14:59 ET; App Store Connect reported that the uploaded package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (35).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 35 must finish processing and be available to the Family group before testers can install it; build-specific group assignment is unverified.
- No test suite or physical-device check was run for this build.

## TestFlight upload — November 4, 2026 (build 36)

- Version 1.0.0, build 36, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current iOS source. Journey now presents the weekly trail and play action before the aha collection, and the syncing/offline state provides a direct play action.
- The Release archive succeeded. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 15:07 ET; App Store Connect reported that the uploaded package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (36).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 36 must finish processing and be available to the Family group before testers can install it; build-specific group assignment is unverified.
- No test suite or physical-device check was run for this build.

## TestFlight upload — November 4, 2026 (build 37)

- Version 1.0.0, build 37, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3 from the current iOS source. A new badge is celebrated only when a complete same-account before/after snapshot and the matching completed puzzle entry confirm it.
- The Release archive succeeded. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 15:16 ET; App Store Connect reported that the uploaded package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (37).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 37 must finish processing and be available to the Family group before testers can install it; build-specific group assignment is unverified.
- No test suite or physical-device check was run for this build.

## TestFlight upload — November 4, 2026 (build 38)

- Version 1.0.0, build 38, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. During a round, submitting a guess now preserves a player's scroll position when they are reviewing the board or earlier feedback. A pinned “New feedback” control jumps to the latest guess; players already following the conversation still auto-scroll, and completion still returns to the daily header.
- The signed Release archive succeeded. Its app metadata was checked as version 1.0.0/build 38. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 15:32 ET; App Store Connect reported that the uploaded package is processing.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (38).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. The link currently opens the Rebuzzle beta page. Build 38 must finish processing and be available to the Family group before testers can install it; build-specific group assignment is unverified because App Store Connect browser controls are disabled in this session.
- No test suite or physical-device check was run for this build.
- Build 39 supersedes its scroll tracking with fixes for keyboard resizing, initial loading geometry, and resynchronizing after programmatic jumps.

## TestFlight upload — November 4, 2026 (build 39)

- Version 1.0.0, build 39, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. The play conversation preserves scroll position when the player is away from the latest guess and offers “New feedback” to jump. Scroll-follow state now updates from user-driven scroll phases, uses the loaded puzzle's initial geometry, ignores keyboard/layout-only changes, and resynchronizes after a programmatic jump.
- The signed Release archive succeeded. Its app metadata was checked as version 1.0.0/build 39. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 15:48 ET; App Store Connect reported that the uploaded package is processing. Targeted code review reported no findings.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (39).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. The link opens the Rebuzzle beta page. Build 39 must finish processing and be available to the Family group before testers can install it; build-specific group assignment is unverified because App Store Connect browser controls are disabled in this session.
- No test suite or physical-device check was run for this build.

## TestFlight upload — November 4, 2026 (build 40)

- Version 1.0.0, build 40, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. The guess meter is now a connected three-step trail: each circle keeps its guess number, completed steps retain their feedback color, and Eve's conversation remains the single place for the detailed feedback icon and label. Accessibility text sizes enlarge the markers and use caption-scaled rounded numerals.
- The signed Release archive succeeded. Its app metadata was checked as version 1.0.0/build 40. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 16:01 ET; App Store Connect reported that the uploaded package is processing. Targeted code review reported no findings.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (40).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. The link opens the Rebuzzle beta page. Build 40 must finish processing and be available to the Family group before testers can install it; build-specific group assignment is unverified because App Store Connect browser controls are disabled in this session.
- No test suite or physical-device check was run for this build.

## TestFlight upload — November 4, 2026 (build 41)

- Version 1.0.0, build 41, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. The result screen now puts the existing spoiler-safe “Challenge a friend” action directly in the reveal card as a compact, lifted button. Its prepared share card, preview, text fallback, accessibility labels, hint, and identifier remain intact; the subtitle tells players the shared puzzle has no spoilers, and the trailing share glyph is omitted at accessibility text sizes for room to wrap.
- The signed Release archive succeeded. Its app metadata was checked as version 1.0.0/build 41. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 16:22 ET; App Store Connect reported that the uploaded package is processing. Targeted code review found no Critical or Important issues.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (41).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 41 must finish processing and be available to the Family group before testers can install it; build-specific group assignment remains unverified because browser controls are disabled in this session.
- No test suite or physical-device check was run for this build.

## TestFlight upload — November 4, 2026 (build 42)

- Version 1.0.0, build 42, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. The daily answer field now locks during server validation, and the composer shows a labeled “Checking…” state. Eve’s conversation distinguishes no response from a partial reply that times out, fails, or is cancelled by the next guess; the saved guess stays visible, and the thread follows terminal feedback while the player is following the latest turn. Practice rounds now keep their guess and Eve history in a “Round recap” after the solution is revealed.
- The signed Release archive succeeded. Its app metadata was checked as version 1.0.0/build 42. Xcode export reported `Upload succeeded` and `Uploaded Rebuzzle` at 16:50 ET; App Store Connect reported that the uploaded package is processing. Targeted code review findings were addressed, including the partial-stream transport-error path.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (42-final).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 42 must finish processing and be available to the Family group before testers can install it; build-specific group assignment remains unverified because browser controls are disabled in this session.
- No test suite or physical-device check was run for this build.

## TestFlight upload — November 4, 2026 (build 43)

- Version 1.0.0, build 43, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. New players get a skippable, local practice round after today's puzzle loads: read LIGHT over HOUSE, use up to three free guesses, ask Eve for a scripted sample hint, and see a success or answer reveal. The warm-up never changes the daily round, attempts, XP, streak, or stats. How to Play offers a replay path, the skip/completion choice is stored locally, and `--ui-fixture` launches bypass automatic presentation.
- The signed Release archive succeeded; metadata was checked as version 1.0.0/build 43. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and that the package is processing at 17:28 ET. A targeted code review found and resolved one copy issue; no further issues were reported.
- Simulator visual inspection on iOS 26.3 showed the warm-up and a correct `lighthouse` answer with Eve's success response. The simulator session changed devices during the skip check, so return/relaunch was not confirmed visually. No automated tests or physical-device checks were run.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (43).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z and resolves to the Rebuzzle beta page. Build 43 must finish processing and be available to the Family group before testers can install it; build-specific group assignment remains unverified because App Store Connect build controls were unavailable in this session.

## TestFlight upload — November 4, 2026 (build 44)

- Version 1.0.0, build 44, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. The result screen now celebrates a level increase only after a fresh complete same-account Journey snapshot before the guess and a complete post-round snapshot confirming the exact puzzle entry and higher level. A failed progress refresh does not block the guess; it suppresses the level-up celebration.
- The signed Release archive succeeded. Its metadata was checked as version 1.0.0/build 44. A targeted second code review found no actionable issues. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and `Uploaded package is processing` at 17:58 ET.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (44 corrected).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 44 is processing; it must finish processing and be available to the Family group before testers can install it. Build-specific group assignment remains unverified because App Store Connect browser controls were unavailable in this session.
- No automated tests, simulator visual check of the new level-up state, or physical-device check were run.

## TestFlight upload — November 4, 2026 (build 45)

- Version 1.0.0, build 45, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. Added four short original game cues for hints, close guesses, solves, and confirmed rewards; cold guesses and streamed Eve text stay silent. Sound effects have their own Settings toggle, respect iPhone Silent mode, mix with other audio, and stop immediately when VoiceOver turns on.
- The signed Release archive succeeded with no compiler warnings. Its metadata was checked as version 1.0.0/build 45, all four WAVs were confirmed in the app bundle, and `codesign --verify --deep --strict` passed. Targeted code review caught and resolved a VoiceOver playback edge case; re-review found no remaining issue. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and `Uploaded package is processing` at 18:30 ET.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (45 Final).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z and responds HTTP 200. Build 45 is processing and must finish processing and be available to the Family group before testers can install it. Build-specific group assignment is unverified: App Store Connect opened to its sign-in page in this browser session.
- No automated tests or physical-device check were run.

## TestFlight upload — November 4, 2026 (build 46)

- Version 1.0.0, build 46, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. Added a persistent Nudge control beside the answer composer in daily and practice play, showing remaining hints, disabling when hints are exhausted or play is unavailable, and scrolling each revealed clue into view.
- The Release archive succeeded with no compiler warnings or errors. Archive metadata was verified as version 1.0.0/build 46, and `codesign --verify --deep --strict` passed. Targeted review found and resolved an account-session edge case for practice hints. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and `Uploaded package is processing` at 19:05 ET.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (46 Hints).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 46 is processing; it must finish processing and be available to the Family group before testers can install it. Build-specific group assignment remains unverified because App Store Connect was not available in this session.
- Simulator inspection confirmed the Nudge control stays reachable with the keyboard open and that revealing a hint keeps the composer pinned while bringing the clue into view. No automated tests or physical-device check were run.

## TestFlight upload — November 4, 2026 (build 47)

- Version 1.0.0, build 47, bundle `com.byronwade.rebuzzle`, archived with Xcode 26.3. Practice now returns to the newest guess after submission, follows Eve’s streamed reply while the player stays at the latest turn, and shows a pinned “New feedback” action if the player scrolls away. Restarting a practice round clears the old feedback target.
- The Release archive succeeded without compiler warnings or errors. Archive metadata was verified as version 1.0.0/build 47, and `codesign --verify --deep --strict` passed. Targeted code review found and resolved stale feedback state after replay. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and `Uploaded package is processing` at 19:26 ET.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (47 Practice Feedback).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 47 is processing and must finish processing and be available to the Family group before testers can install it. Build-specific group assignment remains unverified because App Store Connect was unavailable in this session.
- Simulator build succeeded and the app launched with the daily fixture. The fixture account does not have Plus, so I could not enter the archive practice screen to manually exercise the new feedback chip. No automated tests or physical-device check were run.

## TestFlight upload — November 4, 2026 (build 48)

- Version 1.0.0, build 48, bundle `com.byronwade.rebuzzle`, archived from the current native iOS source tree with Xcode 26.3.
- The Release archive completed without compiler warnings or errors. Archive metadata was verified as version 1.0.0/build 48, and `codesign --verify --deep --strict` passed. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and `Uploaded package is processing` at 19:36 ET.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (48).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. App Store Connect browser access is disabled in this Work session, so Family-group assignment and tester availability could not be confirmed; build 48 was processing at upload completion.
- No automated tests, simulator interaction, or physical-device check were run in this upload turn.

## TestFlight upload — November 4, 2026 (build 49)

- Version 1.0.0, build 49, bundle `com.byronwade.rebuzzle`, archived from the latest native iOS source. Accessibility text now keeps the daily title intentional, lays out Nudge copy vertically, and moves Journey progress into scrollable content at accessibility sizes. The post-solve friend challenge now follows the answer reveal and rewards.
- The Release archive succeeded without compiler warnings or errors. Metadata was verified as version 1.0.0/build 49, and `codesign --verify --deep --strict` passed. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and that the package is processing at 20:02 ET.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (49 UX Polish).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. App Store Connect browser access is disabled in this Work session, and `altool` build-status lookup requires separate API-key or app-password credentials; Family-group assignment and tester availability could not be verified. Build 49 was processing at upload completion.
- No automated tests, TestFlight install, or physical-device check were run in this upload turn.

## TestFlight upload — November 4, 2026 (build 50)

- Version 1.0.0, build 50, bundle `com.byronwade.rebuzzle`. Eve now uses a small original SwiftUI vector face with a restrained sparkle and a warm solve state. On the result screen, stars and XP follow the answer reveal immediately; Eve’s debrief remains below the reward.
- The Release archive succeeded without compiler warnings or errors. Metadata was verified as version 1.0.0/build 50, and `codesign --verify --deep --strict` passed. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and that the package is processing at 20:21 ET.
- The iOS Simulator Debug build succeeded. A simulator screenshot confirmed the refreshed avatar and normal play-screen layout. The result-screen order was verified in source and compiled; no automated tests or physical-device checks were run.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (50 Game Feel).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. App Store Connect browser access is disabled in this Work session, and `altool` build-status lookup requires separate API-key or app-password credentials; Family-group assignment and tester availability could not be verified. Build 50 was processing at upload completion.

## TestFlight upload — November 4, 2026 (build 51)

- Version 1.0.0, build 51, bundle `com.byronwade.rebuzzle`. The live Eve chat now uses a three-dot typing indicator while a reply is pending; it keeps the “Eve is thinking” accessibility label and shows a static indicator when Reduce Motion is enabled.
- The Release archive succeeded without compiler warnings or errors. Metadata was verified as version 1.0.0/build 51, and `codesign --verify --deep --strict` passed. The first export attempt failed while App Store Connect was retrieving upload instructions; retrying the same archive succeeded. Xcode reported `Upload succeeded`, `Uploaded Rebuzzle`, and that the package is processing at 20:34 ET.
- The iOS Simulator Debug build succeeded. No automated tests or physical-device checks were run.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (51 Chat Polish).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. App Store Connect browser access is disabled in this Work session, and `altool` build-status lookup requires separate API-key or app-password credentials; Family-group assignment and tester availability could not be verified. Build 51 was processing at upload completion.

## TestFlight upload — November 4, 2026 (build 52)

- Version 1.0.0, build 52, bundle `com.byronwade.rebuzzle`. Puzzle difficulty is now labeled and styled separately from Journey level in daily and practice play. At accessibility text sizes, the next-daily countdown follows the puzzle board so the active clue appears sooner.
- The Release archive succeeded without compiler warnings or errors. Metadata was verified as version 1.0.0/build 52, and `codesign --verify --deep --strict` passed. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and that the package is processing at 20:43 ET.
- The iOS Simulator Debug build succeeded. A maximum Dynamic Type screenshot confirmed the puzzle card heading appears before the pinned answer controls; the countdown remains below the board. No automated tests or physical-device checks were run.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (52 Accessibility).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. App Store Connect browser access is disabled in this Work session, and `altool` build-status lookup requires separate API-key or app-password credentials; Family-group assignment and tester availability could not be verified. Build 52 was processing at upload completion.

## TestFlight upload — November 4, 2026 (build 53)

- Version 1.0.0, build 53, bundle `com.byronwade.rebuzzle`. The Today screen now opens with Eve's short conversational prompt; navigation reads Today, Journey, and Profile. The home Plus entry makes the localized lifetime price and one-time payment clearer. The Plus screen explains the included benefits and pins the localized price, one-time disclosure, purchase action, free-play note, and restore action for easier access.
- The signed Release archive succeeded. Metadata was verified as version 1.0.0/build 53, and `codesign --verify --deep --strict` passed. The iOS Simulator Debug build and visual review succeeded. Xcode export reported `Upload succeeded`, `Uploaded Rebuzzle`, and `Uploaded package is processing` at approximately 17:56 ET.
- Durable archive: `~/Library/Developer/Xcode/Archives/2026-11-04/Rebuzzle 1.0.0 (53 Navigation).xcarchive`.
- Existing Family public invite link remains https://testflight.apple.com/join/aPEPVC7z. Build 53 is still processing. App Store Connect build processing and Family-group assignment cannot be checked from this session because browser controls are disabled; tester availability is not yet confirmed.
- No automated test suite or physical-device check was run. Existing backend, purchase, and device release gates remain tracked above; this upload is for TestFlight only.
