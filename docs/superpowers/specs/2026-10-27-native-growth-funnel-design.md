# Native growth funnel design

## Goal

Measure whether the iOS daily loop is being opened and finished, which supported entry points bring players back, whether players see the Plus offer, and whether they successfully enable reminders. Use those observations to improve fun and sustainable revenue without collecting puzzle answers or private journal content.

## Product boundary

The app stays a calm, opt-in daily game. Reminders remain user-scheduled, stop nudging after a completed puzzle, and do not use guilt or streak-loss messaging. Telemetry does not alter difficulty, scoring, hint access, reminder timing, or the player's experience. We will use the first baseline to choose later product experiments; this feature makes no claim that retention, enjoyment, conversion, or profit has already improved.

## Event contract

The native app may request only these account-linked events:

| Event | When recorded | Allowed client fields |
|---|---|---|
| `daily_opened` | After today's puzzle and the authenticated player session load successfully | `source`: `app`, `notification`, `widget`, or `shortcut` |
| `plus_offer_viewed` | A non-Plus account opens the Plus offer screen | None |
| `reminder_enabled` | The player enables reminders and iOS successfully schedules them | None |

The backend records `daily_finished` only after an authenticated, accepted final attempt for today's puzzle is persisted. It stores `outcome` as `solved` or `ran_out`; the client cannot submit this event.

The server derives `userId`, `dayKey`, and `occurredAt`. `dayKey` uses the same stable account timezone and local puzzle date as the daily game. Each account has at most one stored event per type and local puzzle day; `daily_opened` is deduplicated per source so a cold launch racing a widget or notification route cannot erase the actual entry path. Several source paths may therefore appear for one account-day and are not exclusive attribution shares. Events have no arbitrary metadata field. The database schema is limited to `userId`, `eventType`, `dayKey`, `occurredAt`, and event-specific `source` or `outcome`.

The endpoint requires the existing authenticated bearer token and rejects unknown event names, unsupported source values, unknown body keys, and events that are server-owned. Event sends are best-effort from iOS and never delay play, reminders, or Plus access. Failed client events are dropped rather than queued under a possibly changed account.

## Privacy and retention

The collection never stores email, device ID, session ID, puzzle ID, answer, guess text, explanation, journal notes, reminder copy, client timestamps, or freeform metadata. `userId` is deliberately account-linked so account/day events can be deduplicated and return behavior can be summarized; the public privacy policy and App Store privacy disclosure must describe this Product Interaction use.

Use the dedicated `nativeGrowthEvents` collection, with a unique `(userId, eventType, dayKey, source)` index and a 90-day TTL index on `occurredAt`. The source is omitted for event types that do not have one, so those remain unique once per day. Create those indexes idempotently before the first write. Account deletion removes the collection's rows for that user. Production deployment must verify that the indexes exist and are expiring rows before the policy claims a 90-day period.

The dashboard exposes aggregates only, never individual event rows. Plus offer views are not purchase events and must not be presented as conversion. Compare them with aggregate App Store Connect sales until server-verified StoreKit transaction reporting exists. Do not accept client purchase claims.

## Admin measures

Provide a last-30-days summary for:

- unique account-days with a daily open;
- unique account-days with a persisted daily finish and their ratio to opened account-days;
- daily entry-source counts (unique source account-days; more than one source may occur on a day);
- accounts returning on at least two distinct daily puzzle days;
- unique accounts who viewed the Plus offer;
- unique accounts with a successful reminder-enable event.

Label these as event-backed, account-linked native usage measures. The daily finish ratio is a rolling observed ratio, not a fully matured cohort result. Reminder enablement means an in-app scheduling confirmation, not confirmed notification delivery. Report purchase and revenue using App Store Connect, separately.

## Failure behavior

An analytics write failure must not fail an accepted guess or make a successful daily screen appear unavailable. Index creation, unique-key races, and TTL setup are idempotent. The dashboard returns an explicit unavailable state on query failure and does not turn missing telemetry into zero activity.

## Acceptance evidence

Automated tests prove strict authentication and body validation, server-derived identity/time, one event per account/day/type, server-only completion logging after accepted daily terminal writes, account deletion, 90-day TTL index creation, aggregate-only admin output, exact native payload fields, and non-blocking failure handling. Native and web builds/tests confirm integration. A post-deploy check of live TTL indexes and actual tester behavior is still required before asserting operational retention or growth outcomes.
