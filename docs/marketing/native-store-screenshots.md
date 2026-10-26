# Native App Store screenshots

Use genuine screenshots from the native app's UI test fixtures. The lighthouse puzzle and Eve reply are examples, not today's production puzzle or a live AI response. XP and badges are earned by completing the fixture through the normal gameplay flow. Journey's first-guess example earns 150 XP; the two-guess result earns 125 XP.

## Capture

Run from the repository root on a Mac with Xcode. Choose an available simulator UDID using `xcrun simctl list devices available`. Capture iPhone 17 Pro (1206×2622), iPhone 17 Pro Max (1320×2868), and iPad Pro 13-inch M5 (2064×2752). These sizes are listed in [Apple's screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications). Confirm the current upload slots in App Store Connect before submitting.

```
xcodebuild -project apps/ios/Rebuzzle.xcodeproj -scheme Rebuzzle \
  -destination 'platform=iOS Simulator,id=<DEVICE_UDID>' \
  -derivedDataPath /tmp/rebuzzle-store-captures \
  -resultBundlePath /tmp/rebuzzle-store-<DEVICE>.xcresult \
  -only-testing:RebuzzleUITests/GameplayUITests/testWrongGuessThenWin \
  -only-testing:RebuzzleUITests/GameplayUITests/testRewardJourneyNavigationPreservesCompletedGame \
  -only-testing:RebuzzleUITests/GameplayUITests/testCountdownAndReminderDiscovery test

xcrun xcresulttool export attachments \
  --path /tmp/rebuzzle-store-<DEVICE>.xcresult \
  --output-path /tmp/rebuzzle-store-<DEVICE>-attachments
```

Retain default simulator signing. `CODE_SIGNING_ALLOWED=NO` leaves the app without the expected bundle signing identity and causes fixture Keychain storage to fail. This is a capture configuration error, not a reason to bypass credential storage in the app.

Use the exported attachment manifest to select the named screenshot, not XCTest's incidental automatic screenshots. Check test results and inspect each selected image. Keep original pixels; do not scale phone screens into tablet images. Confirm PNG dimensions and absence of an alpha channel with `sips -g pixelWidth -g pixelHeight -g hasAlpha <image>`.

## Sequence and usage

1. Today — ready: the puzzle and three guesses.
2. Today — wrong guess: Eve's feedback. Describe it as example gameplay in any surrounding marketing copy.
3. Today — solved: the answer explanation, earned XP, and challenge-a-friend action.
4. Journey — first reward: real fixture-earned progress, weekly goal, and badges.

The first four frames are the initial listing set. Countdown and reminder captures are supporting release evidence; the fixture's deadline is relative to test launch, so do not present that displayed time as the production reset schedule. The shared result must remain spoiler-free; the solved screenshot deliberately reveals only the example puzzle.

The images are raw app captures. Headline ideas in `docs/marketing/2026-10-26-native-launch.md` are editorial guidance, not text already embedded in the images. Public upload and review are separate from asset preparation. Never claim the listing is live based on a local screenshot pack.

## Capture verification — 26 October 2026

The large iPhone run passed all three selected UI tests. iPad's gameplay capture passed; its Journey test initially checked the result immediately after returning to Play and failed. Waiting up to five seconds for the same result element resolved the transition race; the targeted iPad rerun passed. No production app code changed. The twelve selected images were visually inspected and verified as opaque RGB PNGs at their native dimensions.

Native CI run 40371418665 and web CI run 40371418596 passed for application source commit 988fdc4. A requested independent review could not start because the agent thread limit was reached; this capture follow-up was self-reviewed. TestFlight build 8 remains the latest shipped binary.
