# Plus Surface Attribution

## Intent

Help Rebuzzle improve sustainable Plus revenue by showing which existing offer surfaces lead to purchase starts and verified purchases. This adds measurement to the current one-time Plus offer; it does not add prompts or change the offer.

## Why now

Rebuzzle already measures aggregate Plus views, starts, and StoreKit outcomes, but it loses the surface where a player first saw the offer. The app has five distinct entry points, so current totals cannot distinguish a strong offer from a weak or poorly placed entry point. No source-specific conversion result or revenue outcome is currently verified.

## Goals

- Attribute each Plus offer view and purchase lifecycle event to one closed, user-visible entry surface.
- Preserve that source through the direct StoreKit purchase, Ask to Buy approval, app relaunch, and retry of a verified-purchase event.
- Report aggregate source-level counts and conservative same-day conversion rates in the existing admin funnel.
- Keep existing all-source totals and unattributed legacy events valid.
- Keep account IDs inside MongoDB and return aggregates only.

## Source contract

The closed source values are `archive`, `settings`, `journey_insights`, `journal`, and `free_sample`.

The source identifies the offer placement that brought the player to the Plus offer, not a guessed source based on the screen visible when a transaction later finishes. Every Plus route requires an explicit source. The completed free archive sample also records its visible inline offer with `free_sample`; its subsequent Plus route carries the same source. A player who views the offer through multiple surfaces can have one account/source record for each surface during the 90-day event retention period.

`plus_offer_viewed` and all purchase lifecycle events may carry the source. New purchase starts and their immediate outcomes always carry it. If an older pending transaction or unrelated StoreKit update has no recorded source, retain the entitlement behavior and record its outcome without a source rather than assigning the current screen's source. Restore outcomes stay source-free and never count as new purchases.

## Product behavior

- Do not change the daily puzzle, hints, scoring, reminders, streaks, free archive sample, Plus price, product type, entitlement rules, or purchase copy.
- Do not add an upsell during an active daily solve, add more offer surfaces, or use source data to increase prompt frequency.
- Keep one-time Plus optional; daily gameplay, hints, and sharing remain free.
- StoreKit verification remains authoritative. Analytics failure never affects access, purchase, restore, or gameplay.
- Existing aggregate metrics remain visible. Add per-source unique-account counts for offer views, purchase starts, verified purchases, pending, cancelled, unverified, and failed outcomes.
- Per-source same-day conversion requires an offer view and a verified purchase for the same account, source, and server-owned local day. Delayed approvals retain their original source in outcome counts but do not enter this conservative same-day rate.
- Suppress per-source counts from one to four accounts and suppress the rate unless both the viewer and same-day verified-purchase counts are at least five. Zero remains a visible zero. The admin UI labels source rows as account counts, not raw taps or revenue.
- A player can appear in multiple source rows; the rows are not additive. App Store Connect remains authoritative for proceeds, refunds, taxes, and current storefront price.

## Data and privacy

- Reuse the existing `nativeGrowthEvents` collection, server-owned account/day/time, and 90-day retention. Include source in the idempotency key when present, so distinct surfaces remain distinguishable.
- Accept a source only for the relevant Plus event types and only from the five-value allowlist. Continue accepting source-free legacy events; reject unknown sources and source fields on unrelated event types.
- Persist only the closed source value with existing account and purchase-event state. Do not send transaction IDs, signed transaction data, prices, email, guesses, answers, journal text, or arbitrary metadata.
- Group account IDs inside MongoDB. The admin API returns source aggregates only and never returns event rows or identities.

## Verification

- Every Plus navigation path passes the intended explicit source; no route silently defaults to a source.
- Native payload tests prove exact allowed fields and source values.
- StoreKit tests prove source consistency across direct success, cancellation/failure, pending approval, app recreation, authenticated retry, and un-attributed legacy updates. Restore remains source-free.
- API and repository tests prove source validation, source-specific idempotency, legacy compatibility, and no identity leakage.
- Aggregation and admin-card tests prove same-source same-day matching, distinct-account counting, zero defaults, small-count suppression, and clear account-count labels.
- Web and iOS CI pass. These establish behavior only; a production cohort is still required to assess conversion, revenue, or player response.
