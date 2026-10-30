# A measurable daily share loop

## Intent

Rebuzzle already lets a player share a spoiler-safe daily result card. The card currently points to the site root, while the iOS app and native growth funnel have no share-specific entry source or share-action signal. Make the existing “Challenge a friend” moment a clear route back into today's puzzle, and measure that route without collecting who the player shared with or what they sent.

The goal is organic discovery and a stronger daily ritual. Sharing remains optional and earns no XP, streak protection, hints, or gameplay advantage.

## Goals

- Keep the branded PNG and spoiler-safe text in the native iOS system share sheet.
- Link to `https://rebuzzle.byronwade.com/?source=share`, which opens the daily web game as a fallback and opens the iOS app when Universal Links are configured and the app is installed.
- Attribute native openings from that Universal Link as `daily_opened(source: share)` after the daily session is restored.
- Record a share-sheet start and a completed system activity as separate, best-effort events when the native APIs provide those states.
- Show aggregate account-level share participation and share-source daily opens in the existing admin funnel.
- Preserve the existing custom `rebuzzle://play` URLs, normal app launches, and all puzzle state.
- Keep the AASA response valid for the exact app and host, generated from the Apple App ID prefix supplied by environment configuration.

## Data and privacy

The app may send only these closed events, with no event-specific payload fields:

- `daily_share_started`
- `daily_share_completed`

The server derives account identity, local puzzle day, and occurrence time. Existing daily event uniqueness means each account contributes at most one row per event type per local day. `daily_opened` remains server-authenticated and gains only the allowlisted `share` source. Admin output remains aggregate-only.

Do not collect recipient identity, social platform, copied text, result image, answer, guesses, puzzle identifiers, referral identifiers, client timestamps, or arbitrary metadata. A completed activity means iOS reported that the selected share activity completed; it does not prove a recipient opened the link.

## Behavior

1. The result action presents the native system share sheet with the existing spoiler-safe PNG and plain-text result.
2. Tapping the action records `daily_share_started` best-effort and presents the sheet. Gameplay and dismissal remain unaffected if analytics fails.
3. If the system reports a completed activity, record `daily_share_completed` best-effort. Do not log its activity type or recipient.
4. The share text and card use the attributed HTTPS root URL. A Universal Link opened by the app routes to today's Play screen with `.share` as the daily-entry source. A regular website visit remains the browser fallback.
5. The existing daily-open event is emitted only after the authenticated daily session has been restored, as it is for other entry paths.
6. The admin funnel reports unique account counts for started and completed shares over the selected period, plus existing account-day source counts including `share`.

## Universal Link configuration

- Use the bundle ID `com.byronwade.rebuzzle` and host `rebuzzle.byronwade.com`.
- Add the `applinks:rebuzzle.byronwade.com` Associated Domains entitlement while retaining the custom URL scheme.
- Serve `/.well-known/apple-app-site-association` directly as JSON with no redirect. The app identifier is `${APPLE_APP_ID_PREFIX}.com.byronwade.rebuzzle`; use the Apple App ID prefix explicitly because it may differ from the Team ID. Do not hard-code an unknown prefix.
- If `APPLE_APP_ID_PREFIX` is absent, return an explicit unavailable response rather than publishing a malformed association file. Document the required deployment value. Actual device association remains pending until the correct Apple identifier and signing capability are configured.

## Non-goals

- Proving a share was delivered to or opened by another person.
- Rewarding shares or adding social pressure, recipient tracking, leaderboards, or invitations.
- Changing daily selection, answer secrecy, game scoring, Plus access, or puzzle difficulty.
- Claiming improved retention, virality, conversion, or revenue before live cohort evidence exists.
- Sending a TestFlight build or changing App Store Connect metadata as part of this code change.

## Acceptance criteria

- The result action still presents the branded PNG preview and spoiler-safe plain text, and the link contains `source=share`.
- Share start/completion telemetry contains only its event type and remains non-blocking when requests fail.
- Only an exact HTTPS host and supported root URL with `source=share` routes to the app as a share entry; malformed, unrelated, or unsupported URLs are rejected. Existing custom-scheme routing still works.
- The analytics endpoint rejects unknown events, extra fields, client-supplied identity/day/time, and invalid sources.
- Repeated account/event/day writes are idempotent; source aggregation includes share opens without exposing account IDs.
- The admin route and UI return/display aggregate counts only.
- The AASA route emits the correct JSON only when configured and never redirects.
- Unit, route, database, UI, and build verification pass; no claim is made that production Universal Links work before the Apple ID prefix/capability is configured and tested on-device.

## Follow-up: Cross-platform share-to-play

The existing native share URL already uses `?source=share`, but the web share generator still puts the sender's account ID in `?beat=` and emits a query the iOS router rejects. All new share surfaces will use the same canonical root URL and closed `source=share` value. Previously shared `?beat=…&from=share` links remain accepted as share arrivals, but the account ID is ignored and removed from the browser address. No inviter-specific identifier, referral reward, or recipient identity is needed; the product measures aggregate source opens only.

When a web share arrival has an authenticated account, the web client records the existing `daily_opened(source: share)` only after the daily session restores successfully. If a new browser visitor receives a guest account only after making a first guess, the client keeps a temporary same-tab share-arrival marker and records the open once that account exists and its daily session restores successfully. The native app already records the share source after session restore.

The server records a closed `daily_started` event on the first accepted daily guess. The existing server-owned `daily_finished` remains the terminal outcome. The admin funnel may count same-account, same-day share opens that also have a first guess or finish, but must return aggregate counts only and label them as account-days; they do not identify recipients or prove that the sender and player are different people. Analytics remain best-effort and do not gate opening, guessing, sharing, or completion.

This follow-up adds no event fields, event types supplied by clients, or new data category. The `daily_started` event is server-authored, account/day deduplicated, and covered by the existing product-interaction retention/deletion behavior.
