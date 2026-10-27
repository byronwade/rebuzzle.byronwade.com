# iOS Beta API Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a TestFlight archive target a separately deployed sandbox-enabled API while existing App Store builds keep using production.

**Architecture:** Store `RebuzzleAPIBaseURL` in the app's generated Info.plist. `APIClient` resolves that value as a validated HTTPS origin and retains its injected URL seam. The beta archive command overrides the plist build setting; no backend verification rules change.

**Tech Stack:** Swift 6, XCTest, XcodeGen, Xcode build settings.

**Spec:** `docs/superpowers/specs/2026-10-27-ios-beta-api-selection-design.md`

## Global Constraints

- Keep `https://rebuzzle.byronwade.com` as the default API origin.
- Accept only HTTPS origins with no credentials, path, query, or fragment.
- Keep the backend's production sandbox-transaction rejection unchanged.
- Do not claim a public beta API deployment or TestFlight upload exists.

## Review Focus

- Missing plist key: default to the current production API; covered by `testAPIClientResolutionDefaultsToProductionWhenUnset`.
- Non-HTTPS, malformed, or hostless URL: default to production; covered by `testAPIClientResolutionRejectsUnsafeOverrides`.
- URL with user credentials, path, query, or fragment: default to production; covered by `testAPIClientResolutionRejectsUnsafeOverrides`.
- Valid beta HTTPS origin: preserve the exact origin; covered by `testAPIClientResolutionUsesHTTPSOrigin` and `testDefaultAPIClientUsesConfiguredBundleHost`.
- Build-setting override: generated app plist contains the overridden value; verified by an Xcode build with a beta origin and plist inspection.

---

### Task 1: Configure and validate the native API host

**Files:**
- Modify: `apps/ios/project.yml`
- Modify: `apps/ios/Rebuzzle/Services/APIClient.swift`
- Modify: `apps/ios/RebuzzleTests/PracticeAPIClientTests.swift`
- Modify: `apps/ios/Release/Checklist.md`
- Generated: `apps/ios/Rebuzzle.xcodeproj/project.pbxproj`

**Interfaces:**
- `APIClient.resolvedBaseURL(from:)` accepts an `[String: Any]` Info.plist dictionary and returns a validated `URL` or the production origin.
- `APIClient.init(baseURL:deviceID:session:)` continues to accept an injected URL; omitting it resolves the main app bundle's `RebuzzleAPIBaseURL`.

- [x] **Step 1: Add a failing default-client bundle-host test**

  Add `testDefaultAPIClientUsesConfiguredBundleHost` to the existing API client test class. Construct the default client and expect its `baseURL` to equal `https://rebuzzle-beta.example`.

- [x] **Step 2: Declare the build variable in the generated plist**

  Add `REBUZZLE_API_BASE_URL` with the production origin as its target default and set `RebuzzleAPIBaseURL` in the XcodeGen `info.properties` to `$(REBUZZLE_API_BASE_URL)`. Regenerate the project so Xcode expands the build variable into the app plist.

- [x] **Step 3: Run the test with a beta build-setting override and confirm the assertion fails**

  Run from `apps/ios`:

  ```bash
  xcodebuild -project Rebuzzle.xcodeproj -scheme Rebuzzle \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    REBUZZLE_API_BASE_URL=https://rebuzzle-beta.example \
    -only-testing:RebuzzleTests/PracticeAPIClientTests test
  ```

- [x] **Step 4: Add the bundle resolver**

  Set `REBUZZLE_API_BASE_URL` to `https://rebuzzle.byronwade.com` in the app target and map it through XcodeGen `info.properties`. Make the default initializer resolve the generated bundle value through `APIClient.resolvedBaseURL(from:)`. Keep the existing explicit `baseURL` injection path, and make the bundle-host test pass.

- [x] **Step 5: Add failing URL validation tests, then validate overrides**

  Add `testAPIClientResolutionDefaultsToProductionWhenUnset`, `testAPIClientResolutionUsesHTTPSOrigin`, and `testAPIClientResolutionRejectsUnsafeOverrides`. The unsafe values include `http://rebuzzle.example`, `https://user:pass@rebuzzle.example`, `https://rebuzzle.example/api`, and HTTPS origins with query or fragment components. Run the tests and confirm the unsafe inputs fail before adding the checks for HTTPS, host, no credentials, root-only path, and no query/fragment.

- [x] **Step 6: Document the beta archive override and regenerate Xcode project**

  Add an `xcodebuild archive` example to `apps/ios/Release/Checklist.md` that overrides `REBUZZLE_API_BASE_URL=https://<public-beta-api-origin>`. State that the beta API must be public, run outside Vercel Production, and set `STOREKIT_ALLOW_SANDBOX_TRANSACTIONS=true`. Run `xcodegen generate` from `apps/ios`.

- [x] **Step 7: Verify unit tests and both generated plist values**

  Run the full `RebuzzleTests` unit-test target on the iOS 26.0 iPhone simulator selected by `.github/workflows/ios.yml`, with the default production API setting. Build the Release app once with the default setting and once with `REBUZZLE_API_BASE_URL=https://rebuzzle-beta.example`; inspect each built app's Info.plist and confirm the production and override values respectively. The focused nine-test API client suite has already passed with the beta override.

- [x] **Step 8: Review the final diff**

  Run `git diff --check` and inspect the full diff for unintended generated-project churn.
