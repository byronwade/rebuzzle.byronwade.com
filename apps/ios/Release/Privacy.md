# Privacy disclosure draft

Source audit: 2026-10-26; bounded follow-up against deployed source 2efafda. This is a release inventory, not a statement that App Store Connect or the live privacy policy has been updated. Reconcile against the exact deployed backend and final binary before submission. Apple's [App privacy details guidance](https://developer.apple.com/app-store/app-privacy-details/) requires assessment of data sent off-device and retained, including partners; local-only data is a different case.

## Source-backed data flows

| Data | Source and use | Proposed disclosure |
| --- | --- | --- |
| Email address | Existing-account login sends email and password to `/api/auth/login`; backend retains account email. Web signup is separate. | Email Address; linked; app functionality. |
| Account ID / username | API identity, account statistics and saved attempt ownership. Login events retain user ID. | User ID; linked; app functionality and analytics where used in login/return analysis. |
| Stable installation device ID | Random UUID in Keychain; `APIClient` sends `X-Device-Id`; lazy guest route retains device ID to recognize returning guests. It is not IDFA. | Device ID; linked; app functionality. |
| Submitted guesses, puzzle results, hints count, play duration | Guess API receives these fields and server attempt/session records retain gameplay. | Gameplay Content; linked; app functionality and analytics. Fast successful solves create user-linked difficulty-calibration records. |
| Login and return activity | Login route writes `USER_LOGIN` and `USER_RETURN` events linked to user ID. | Product Interaction; linked; analytics. No claim of “no analytics.” |
| IP-derived identifier / request metadata | Guest route hashes IP for identity/abuse checks; rate limiting also uses request IP. Hosting logs may retain IP, paths, status and timing. | Confirm applicable category and retention with deployed hosting/backend configuration; app functionality/security. Do not infer anonymous status merely from hashing. |
| Timezone | `rebuzzle-tz` cookie on game requests controls daily boundaries. | Retained as account-linked userStats.streakTimeZone for daily boundaries and streak calculations. Final Apple category still needs review; no GPS permission or GPS collection in native source. |
| Journal notes, drafts, preferences | JSON in app support storage and UserDefaults; journal scoped by account; no note upload path in native source. | Device-local in this implementation. User-directed export goes to the destination the user selects. Do not promise backup exclusion: system backups have not been audited. |
| Purchase entitlement | StoreKit verified transactions checked on device. Native source has no developer purchase-upload endpoint. Apple processes payment. | Do not mark card data collected by Rebuzzle. Review actual Apple reporting and any server transaction processing before final Purchase History answer. |

No native advertising SDK, IDFA access, ATT prompt, remote push registration, or third-party native analytics SDK was found in the reviewed app source. This does not establish the practices of the linked website, hosting provider, or all backend integrations. No tracking use is apparent in the native flows; confirm partner behavior before selecting the final tracking answer.

## Policy text to reconcile with the live website

The iOS app sends account credentials for sign-in and uses an account or guest identity to store gameplay results on Rebuzzle servers. A stable device identifier supports returning guest access. The service processes request metadata for security and records account login/return activity. Your journal, personal notes, unsent drafts, and appearance/reminder preferences stay in local app storage; journal entries are separated by Rebuzzle account. You can export journal text with the system share sheet. Apple handles Plus payments; restoring a purchase restores access, not journal data. Account deletion is available in Settings. Export any journal you wish to retain before deletion.

This paragraph is incomplete without the operator's actual contact details, processor list, retention/deletion and backup schedules, rights process, and jurisdiction-specific policy language. Do not publish invented durations or promise immediate deletion from backups.

## Submission gates

- Reconcile `Rebuzzle/Resources/PrivacyInfo.xcprivacy` with this inventory. The current source manifest includes email, user ID, gameplay content, device ID and product interaction. Gameplay content declares both app functionality and analytics because difficulty calibration evaluates play outcomes. Device ID is declared for app functionality; product interaction for analytics and app functionality. User ID declares app functionality and analytics because login/return analytics retain it. Confirm any additional purposes or data types against the final deployed services.
- Confirm required-reason API declarations against the archive privacy report, including UserDefaults (`CA92.1` currently declared).
- Audit production logging, database analytics, email delivery for achievement notifications, crash reporting, and website flows. Record processors and retention; do not expose credentials/guesses/notes in logs.
- Validate guest and registered-account deletion against the deployed MongoDB transaction-capable environment. The route deletes user-associated collections and unsets creator attribution; confirm all actual stores, logs, backups, and retention exceptions in policy.
- Publish the reconciled policy at the in-app privacy URL, confirm it loads without login, and enter matching App Store privacy answers. Manifest inclusion alone does not populate those answers.

## Confirmed follow-up findings (2026-10-26)

- **AI answer checking:** submitted guess and expected answer can enter the semantic-validation model prompt through Vercel AI Gateway. Configured fast-tier fallbacks include Google, OpenAI and xAI; this does not mean every request reaches each provider. References: `apps/web/src/app/api/puzzles/guess/route.ts:194`, `apps/web/src/ai/services/answer-validation.ts:124`, `apps/web/src/ai/client.ts:162`, `apps/web/src/ai/config.ts:33`. Final processor disclosures must include actual deployed routing and provider retention.
- **Achievement emails:** registered-player achievement unlocks can send email address, username and achievement/progress details through Resend when configured. References: guess route line 398 and `apps/web/src/lib/notifications/email-service.ts:67,274`. Do not describe native-triggered server processing as purely on-device.
- **Timezone:** native request timezone persists in `userStats.streakTimeZone`; references `apps/ios/Rebuzzle/Services/APIClient.swift:28` and `apps/web/src/lib/auth.ts:263,355`.
- **Guest identification:** guest records retain IP-derived hashes, device ID and last-seen metadata. Rate limiting separately uses raw IP in an in-memory key; rate-limit expiry is not a retention policy for other stores. References lazy guest route line 79 and rate-limit middleware line 114.
- **Analytics:** account-linked login/return events are stored in MongoDB analyticsEvents. Fast successful solves retain difficulty-calibration feedback identifiers containing puzzle ID and user ID, duration, attempt count and hints. References login route line 60, `apps/web/src/db/analytics-ops.ts:18`, and `apps/web/src/ai/learning/learning-loop.ts:25`.
- **Deletion:** the account deletion transaction explicitly removes user-linked calibration feedback IDs, analytics events and stats (`apps/web/src/app/api/user/account/route.ts:35,54`). This is source evidence; no claim is made about external processor logs or backups.

Still unresolved: production hosting log retention; database backups/retention; enabled email delivery and its retention; AI Gateway and downstream provider routing/logging/retention; Apple reporting; final archive privacy report. No final store privacy answers or revised public policy were published from this inventory.
