# Plus Purchase Funnel Measurement

## Intent

Make Rebuzzle's existing one-time Plus offer measurable so future product and pricing decisions can be based on actual interest and purchase behavior. Keep the daily puzzle, hints, and sharing free. This work adds measurement; it does not change the offer or introduce a subscription.

## Why now

The native app records accounts that view the Plus offer, but it does not record purchase starts or outcomes. The admin funnel therefore cannot distinguish low purchase intent from a confusing or failing StoreKit flow. The connected PostHog project is not Rebuzzle, and no player analytics were queried, so the current offer-to-purchase rate is unknown.

## Goals

- Measure the path from Plus offer view through purchase start and verified purchase.
- Distinguish pending approval, cancellation, verification failure, general purchase failure, and explicit restore outcomes.
- Keep event payloads closed-schema and limited to event type; the server owns account identity, puzzle-local day, and timestamp.
- Show aggregate counts and a same-day offer-to-verified-purchase rate in the existing native growth admin card.
- Preserve current StoreKit entitlement, purchase, and restore behavior.
- Keep all daily play, hints, sharing, and scores available without Plus.

## Non-goals and anti-goals

- Do not change Plus price, product type, entitlements, or copy.
- Do not add subscriptions, ads, paid hints, score boosts, or purchase prompts during an active solve.
- Do not send transaction IDs, signed transaction data, prices, email, account IDs, answer data, or raw StoreKit errors to growth analytics.
- Do not present verified purchase counts as revenue. App Store Connect remains authoritative for proceeds, refunds, taxes, and current storefront price.
- Do not claim increased retention, enjoyment, or revenue from instrumentation alone.

## Product behavior

The existing `plus_offer_viewed` event remains the funnel entry. `PurchaseStore` reports a start when a real StoreKit purchase call begins, followed by one immediate outcome: verified, pending, cancelled, unverified, or failed. A pending Ask to Buy transaction can later emit a verified-purchase event through `Transaction.updates`. Restore flows report restored, no purchase found, or failed; a restored entitlement is not counted as a new sale.

The native growth card reports rolling 30-day unique-account counts for offer viewers, purchase starters, verified purchasers, pending purchases, cancellations, unverified purchases, failures, and restore outcomes. It also reports unique accounts with both an offer view and verified purchase on the same puzzle-local day, divided by unique offer-viewing accounts. Restore events are excluded from the purchase rate.

Because storage deduplicates an account/event/day, counts represent accounts or account-days, not raw taps or transaction volume. The UI must label them accordingly. A same-day rate is intentionally conservative and does not claim to capture delayed cross-day purchase attribution.

## Data and privacy

- Store events in the existing `nativeGrowthEvents` collection with its existing 90-day TTL and unique account/event/day index.
- Keep client payloads to one event-type field. Reject all extra fields, including product, price, identity, timestamp, or transaction metadata.
- Derive the account ID from authentication and day/time from the server's stable journey time zone.
- Return only aggregate counts from the admin endpoint; never return account identifiers.
- StoreKit JWS handling remains on the existing entitlement verification path and is not copied into growth events.

## Implementation boundaries

- iOS: `GrowthEvent`, `PurchaseStore`, `AppModel`, `PlusView`, and StoreKit purchase tests.
- Web API: closed event union, validation, and route tests.
- Analytics: Mongo aggregation and aggregate-only tests.
- Admin: extend the existing `NativeGrowthCard` response type and Plus section.

## Verification

- StoreKit tests prove purchase start/outcome events, delayed approval, and restore classification.
- Route tests accept each supported purchase outcome and reject client-owned or extra fields.
- Aggregation tests prove account-level deduplication, same-day conversion, restore exclusion, zero defaults, and no identity leakage.
- Run the focused iOS StoreKit suite, native analytics Jest suites, web typecheck, and `git diff --check`.

## Open evidence limits

The existing PostHog connection targets Thorbis, not Rebuzzle, so it cannot provide Rebuzzle retention or conversion evidence. This design improves first-party measurement but does not prove the current offer's conversion, revenue, or effect on player enjoyment. Review App Store Connect for sales and proceeds after real purchases accumulate.
