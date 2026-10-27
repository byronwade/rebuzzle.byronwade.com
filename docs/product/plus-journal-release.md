# Plus journal and restore reliability — build 12

The paid journal now opens completed entries after the Play → Plus → Journal flow. Direct destinations avoid duplicate SwiftUI destination registration in nested journal screens. Notes remain account-scoped and local; restoring Plus restores ownership, not journal data.

Store loading and explicit purchase/restore outcomes now have separate state. Successful background loads preserve restore confirmation, genuine later loading failures remain visible, a new explicit action clears obsolete feedback, and revocation clears ownership confirmation. Existing verified entitlement checks are retained.

## Verification

- Controlled journal regression: the corrected paid-flow UI test passed, then failed at the destination assertion when only the old navigation implementation was temporarily restored.
- Four new StoreKit regressions reproduced status ordering/revocation failures before the fix. Final focused purchase suite passed all 17 cases.
- Final hosted suite passed 38 tests. The accompanying initial full UI run passed 14/16, including the actual local StoreKit purchase, journal note, insights and restore sequence. The two remaining failures were test interaction failures: typing without keyboard focus and a link obscured by scroll/navigation overlays.
- Focused Journey and Study tests passed after bounded scrolling and keyboard-focus checks. Original behavioral assertions remain; no production workaround was introduced. Independent review found no actionable issue.
- Final full UI run passed all 16 tests. Hosted suite: 38 passed; focused purchase suite: 17 passed. Signed build 12 archive and strict code-signature validation passed; no StoreKit configuration resource is bundled in the release app.
- Source `9bd9eb3`; signed archive uploaded successfully (xcodebuild export exit 0). Connect received build 1.0.0 (12), identifier `3c0d8c16-e980-4e63-93e8-bdb50cf253ac`, at October 26, 2026 8:12 PM Eastern. Processing completed; build 12 is Testing in the existing Rebuzzle Automatic Updates internal group (one tester, twelve builds). What to Test notes saved. No new invitation is required. Physical iPhone installation remains unobserved.

All purchases here use local StoreKitTest; no live sandbox, physical-device installation, real payment or measured commercial benefit is claimed. The gameplay fixture starts fresh local storage per launch, so the paid UI test proves notes persist across navigation and entitlement across relaunch, not journal persistence across relaunch. Existing storage tests cover disk roundtrips and account separation.

## External family testing

Build12 was added to the existing Family external group (`5dbca7e9-157d-45ea-a248-ea6d2d8e95bd`) and submitted to Beta App Review with automatic tester notification enabled. Connect showed one tester, one build, and **Waiting for Review** after submission. This is separate from internal Testing status; external installation is not yet available or verified.

Future native releases must also be assigned to Family and pass any required external beta review, in addition to the existing Rebuzzle Automatic Updates internal group. Keep the existing tester memberships and invitation link; do not create a replacement invitation for each update. Do not record private tester contact information in public release documentation.

## Journal Study Mode — next native source update

The current source change makes Plus Journal entries clue-first. Players see the saved board without the answer or personal note in the list, can reveal original hints one at a time, then choose to reveal the answer and explanation. Studying is explicitly unscored and has no gameplay, streak, reward, analytics, or network path. Existing entries without saved hint text keep working with a clear fallback. The existing Plus purchase, restore, note editing, and device-local storage remain in place.

Verification on 2026-10-27: `swift test --package-path apps/ios/Core` passed 36 tests. The updated iPhone 17 Pro / iOS 26.0 full scheme run passed 75 of 76 tests; the only failure was the unrelated `testTabNavigation` case after the Study screen test. `testTabNavigation` and the full Journal purchase/study flow passed together in a focused run; a Study-then-tab focused run reproduced the navigation test failure. This remains a test-order/navigation reliability issue to investigate, and no production tab code was changed. The Journal flow passed in the full run and focused reruns, including blank-hint filtering, spoiler-free answer reveal, note editing, insights, restore, puzzle-type labeling, and Plus copy. The accessibility-size UI test confirmed the no-hints fallback and a 44-point answer control. Standard and accessibility-size study screenshots were reviewed.

This source update has not yet been uploaded or installed through TestFlight. StoreKit purchase evidence is from the local StoreKitTest fixture; physical-device behavior, paid conversion, retention, and revenue remain unmeasured. The latest recorded App Store Connect inspection remains the October 26 status above; the live Family build state still needs a fresh check.
