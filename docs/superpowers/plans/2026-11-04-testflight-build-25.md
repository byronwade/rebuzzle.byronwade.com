# TestFlight Build 25 Release Plan

> **For agentic workers:** Execute these steps in the current isolated worktree. The user explicitly authorized a TestFlight update.

**Goal:** Upload the latest native Rebuzzle source as build 25 to the existing TestFlight app.

**Architecture:** Increment the authoritative XcodeGen version and generated project version, archive a clean temporary source snapshot, let Xcode use the existing Apple team for distribution signing, and export with the existing App Store Connect upload options. Verify Apple’s processing state before reporting availability.

**Tech Stack:** SwiftUI, Xcode 26.3, XcodeGen, App Store Connect.

**Spec:** User request “Try now push it now” (2026-11-04); native design changes in `docs/superpowers/plans/2026-11-04-guess-feedback-states.md`.

## Global Constraints

- Preserve bundle ID `com.byronwade.rebuzzle`, marketing version `1.0.0`, team `T677262U5B`, and existing TestFlight groups and invitation link.
- Build the current worktree source, including the reviewed guess-feedback UI change.
- Keep signing and upload credentials out of logs and repository files.
- Do not run tests in this task; the environment instruction prohibits adding or running tests unless requested.
- Report upload, processing, and tester availability as separate states.

## Review Focus

- Confirm the archive uses build 25 and contains the current native source.
- Confirm the archived app is signed for distribution by the expected team.
- Confirm export targets App Store Connect upload and preserves the existing app identity.
- Do not claim TestFlight availability unless Apple reports processing complete and the build is attached to the existing group.

## Tasks

- [x] Update the two authoritative build-number settings to 25 and make a clean temporary iOS source snapshot.
- [x] Create a Release archive with automatic signing for team `T677262U5B`; verify its app identity and build metadata. Xcode re-signed the export with Apple Distribution.
- [x] Export and upload using the existing `ExportOptions-Upload.plist`; Apple accepted the upload and reported that processing began.
- [x] Record the exact processing state. Existing-group availability remains unverified because App Store Connect browser access is disabled in this environment.

## Release Evidence

- Archive: `1.0.0 (25)`, bundle ID `com.byronwade.rebuzzle`, team `T677262U5B`; Xcode archive succeeded.
- Export: App Store distribution signature for the app and widget was produced by Xcode; export succeeded.
- Upload: 2026-11-04 02:58 ET, Xcode reported `Upload succeeded` and `Uploaded package is processing`.
- TestFlight installability and assignment to the existing tester group have not yet been confirmed. The existing public invitation link remains the same.
- No automated tests were run for this release task.
