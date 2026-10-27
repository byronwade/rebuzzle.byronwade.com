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
