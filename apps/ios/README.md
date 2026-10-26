# Rebuzzle for iOS

Native SwiftUI daily puzzle app for iPhone and iPad, iOS 18+, Swift 6. The app uses the production API at `https://rebuzzle.byronwade.com`. New native session/account backend changes must be deployed before live release. A successful simulator build is not evidence that production gameplay or purchases work.

## Build and test

Use Xcode 26.3 or a compatible newer Xcode with an iOS simulator runtime. Select that Xcode in Settings → Locations → Command Line Tools. From the repository root:

```sh
brew install xcodegen
cd apps/ios
xcodegen generate
swift test --package-path Core
REBUZZLE_BUILD_ROOT="$(mktemp -d /tmp/rebuzzle-ios.XXXXXX)"
xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$REBUZZLE_BUILD_ROOT/DerivedData" CODE_SIGN_IDENTITY=- build
open Rebuzzle.xcodeproj
```

Keep using the same terminal so `REBUZZLE_BUILD_ROOT` remains set. Build products live under `/tmp` to avoid Finder extended attributes inherited from the Documents workspace, which can cause code-signing failures. Do not disable signing to work around those failures.

For application-hosted unit tests and the UI suite, select an installed simulator UUID from `xcrun simctl list devices available`, then:

```sh
xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" \
  -derivedDataPath "$REBUZZLE_BUILD_ROOT/DerivedData" CODE_SIGN_IDENTITY=- test
```

Set `SIMULATOR_UDID` to that UUID before running. Simulator builds and tests must use ad-hoc signing (`CODE_SIGN_IDENTITY=-`); do not disable signing with `CODE_SIGNING_ALLOWED=NO`. Secure guest identity and tokens use Keychain, which requires a signed executable. Runtime tests use XCTest. Four UI tests exercise winning, exhausting guesses, tab navigation and accessibility XXXL through an isolated DEBUG transport. CI runs core tests, a simulator build, and the native runtime/UI suite. Add `-only-testing:RebuzzleUITests` to run only the UI suite. Launch a Debug build with `--ui-fixture` (or `--preview`) for interactive synthetic gameplay; Release ignores both flags.

The generated Rebuzzle Run scheme already selects `Rebuzzle.storekit` for local purchase testing. Confirm it under Edit Scheme → Run → Options → StoreKit Configuration. The fixture is a test product, not App Store Connect configuration. Use StoreKit transaction management to exercise cancellation, pending, restoration and revocation. Disable the local configuration for signed-device sandbox and TestFlight tests.

## Distribution archive

In Xcode, select the app target → Signing & Capabilities, select the real development team, and confirm ownership of `com.byronwade.rebuzzle`. Keep team credentials out of source control. From `apps/ios`, with `APPLE_TEAM_ID` set to the actual team:

```sh
REBUZZLE_ARCHIVE_ROOT="$(mktemp -d /tmp/rebuzzle-archive.XXXXXX)"
xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath "$REBUZZLE_ARCHIVE_ROOT/DerivedData" \
  -archivePath "$REBUZZLE_ARCHIVE_ROOT/Rebuzzle.xcarchive" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates archive
open "$REBUZZLE_ARCHIVE_ROOT/Rebuzzle.xcarchive"
```

Copy the validated archive from `/tmp` to your durable release archive location after signing; temporary paths are not a long-term backup. Use Organizer → Validate App, then Distribute App → App Store Connect. Archive/export requires a signed-in Apple Developer account and valid signing assets. Increment the build number in `project.yml` for each upload, regenerate, and confirm displayed version metadata agrees. Never distribute preview launch arguments or enable the local StoreKit fixture for release validation.

## Release packet

- [Store listing and review notes](Release/AppStore.md)
- [Privacy disclosure inventory](Release/Privacy.md)
- [Release gates and evidence checklist](Release/Checklist.md)

The journal and notes are stored on this device, separated by Rebuzzle account. Plus restoration restores entitlement, not journal data. Core daily gameplay, normal hints, sharing, reminders and basic progress are free; Plus never buys extra guesses. No journal cloud sync, retrospective web history import, or guaranteed revenue/retention is promised.
