# Native puzzle club — build 10

Released to the existing internal TestFlight group on 2026-10-26. Source commit: `375a6a7`. App: `com.byronwade.rebuzzle`, version `1.0.0 (10)`, App Store Connect ID `6827098347`.

## Player experience

- Custom rounded display typography, focused puzzle stage, tactile guess tokens and an expressive Eve avatar.
- Study puzzle sheet preserves the unfinished answer and all guesses; exact clue rendering remains unchanged.
- Confirmed hints and wrong guesses receive optional haptic feedback. Solves get an Aha reveal; exhausted guesses receive a distinct reveal.
- Journey presents actual earned XP, a three-day weekly trail and the four existing collectible achievements.
- Compact opening layout keeps the entire answer button above the native floating tab bar. Native keyboard dismissal, persistent Eve replies and accessibility layouts remain supported.

## Validation

- 16 Swift core tests passed.
- 28 application tests and 13 gameplay UI tests passed.
- After the final compact masthead change, three targeted UI tests passed again: accessible gameplay, Study draft/guess preservation, and wrong-guess-to-win with complete-button tab-bar clearance.
- Simulator screenshots inspected for ready, wrong, solved, Study, Journey, accessibility XXXL and final iPad light/dark layouts. No physical-device test claimed.
- Independent code review and focused follow-up approved. Signed Release archive and App Store Connect export succeeded.

## Distribution

Upload succeeded at 2026-10-26 18:35:21 America/New_York. Build ID: `1b7ce30d-6793-4d78-bdf2-313f214ebe50`. App Store Connect confirms processing finished and build 10 is linked to **Rebuzzle Automatic Updates**, the existing internal group with one tester. Its build distribution is Automatic for Xcode Builds. No new invitation or redeem code is required; the user can update the existing Rebuzzle app in TestFlight.

The existing tester was confirmed to have installed build 9 before this upload. Installing build 10 on the physical phone remains user-controlled. Public App Store submission and outstanding store privacy/purchase checks are separate; this receipt does not claim an App Store release.

Evidence is saved under the workspace's `outputs/rebuzzle/release/puzzle-club/` and `outputs/rebuzzle/screenshots/puzzle-club/`. The signed archive is backed up there as `Rebuzzle-10.xcarchive`. The prior production daily puzzle and backend generation gates were not changed.
