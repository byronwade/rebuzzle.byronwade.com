# StoreKit entitlement bootstrap

## Goal

Make existing Plus ownership available as soon as the native app model is created, without waiting for the daily puzzle API load.

## Plan

1. Add a StoreKit test that creates a verified Plus purchase, constructs a fresh `PurchaseStore`, and verifies the new store discovers ownership without an explicit `load()` or restore call.
2. Run that focused test and confirm it fails against the current implementation.
3. Start a non-blocking entitlement refresh from `PurchaseStore.init()` while retaining the transaction update listener and product loading behavior.
4. Run the focused StoreKit tests and relevant iOS checks; inspect the final diff and preserve unrelated worktree changes.

## Constraints

- Read only verified, non-revoked StoreKit entitlements.
- Do not block daily puzzle startup on StoreKit.
- Do not change pricing, purchase flow, or Plus feature access rules.

## Verification

- The new cold-launch ownership test failed before the change and passed after it.
- `DirectPurchaseTests` and `PurchaseTests`: 18 passed on the iPhone 17 Pro iOS 26.0 simulator.
- `git diff --check` passed for the changed files.
