# Plus journal and restore reliability — build 12

The paid journal now opens completed entries after the Play → Plus → Journal flow. Direct destinations avoid duplicate SwiftUI destination registration in nested journal screens. Notes remain account-scoped and local; restoring Plus restores ownership, not journal data.

Store loading and explicit purchase/restore outcomes now have separate state. Successful background loads preserve restore confirmation, genuine later loading failures remain visible, a new explicit action clears obsolete feedback, and revocation clears ownership confirmation. Existing verified entitlement checks are retained.

## Verification

- Controlled journal regression: the corrected paid-flow UI test passed, then failed at the destination assertion when only the old navigation implementation was temporarily restored.
- Four new StoreKit regressions reproduced status ordering/revocation failures before the fix. Final focused purchase suite passed all 17 cases.
- Final hosted suite passed 38 tests. The accompanying initial full UI run passed 14/16, including the actual local StoreKit purchase, journal note, insights and restore sequence. The two remaining failures were test interaction failures: typing without keyboard focus and a link obscured by scroll/navigation overlays.
- Focused Journey and Study tests passed after bounded scrolling and keyboard-focus checks. Original behavioral assertions remain; no production workaround was introduced. Independent review found no actionable issue.
- Final full UI run passed all 16 tests. Hosted suite: 38 passed; focused purchase suite: 17 passed. Signed build 12 archive and strict code-signature validation passed; no StoreKit configuration resource is bundled in the release app.
- TestFlight upload is in progress; availability is not yet confirmed.

All purchases here use local StoreKitTest; no live sandbox, physical-device installation, real payment or measured commercial benefit is claimed. The gameplay fixture starts fresh local storage per launch, so the paid UI test proves notes persist across navigation and entitlement across relaunch, not journal persistence across relaunch. Existing storage tests cover disk roundtrips and account separation.
