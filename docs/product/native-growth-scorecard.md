# Native Rebuzzle: enjoyment and revenue evidence

Objective: an exceptionally fun single-puzzle-a-day iOS game that players voluntarily return to and that earns sustainable revenue.

Current product: one daily scored puzzle, Eve feedback/hints, spoiler-free sharing, local XP/levels/badges/weekly goals, countdown, opt-in daily reminders, widgets and Siri entry. Optional Plus is a one-time non-consumable for completed-puzzle journal, notes and insights. Price displayed in-app always comes from StoreKit. Current configured US baseline was $9.99; verify in App Store Connect before changing pricing.

Evidence must distinguish implementation from outcomes. Native tests and TestFlight availability prove delivery, not enjoyment, retention, conversion or profitability. There are no measured improvements to those outcomes in this scorecard yet.

Measurement implementation (October 27, 2026; production not verified): the native app can report daily opens by entry source, Plus offer views, successful reminder scheduling, and an optional four-choice rating after the daily result. The server records accepted terminal daily finishes. A changed rating replaces the previous one for that account and local puzzle day. An admin-only 30-day summary reports opened and finished account-days, finish/open ratio, source counts, accounts returning on multiple puzzle days, Plus offer viewers, accounts with scheduled reminders, and aggregate rating counts. It exposes aggregates only. Rating replies are self-selected and directional editorial input, not objective difficulty or enjoyment measurements. Funnel events have a 90-day TTL configured in source and are removed during account deletion; confirm the live production index and deployed event volume before treating this as an operating baseline. Plus offer views are not purchase conversions; use App Store Connect sales for verified purchases. No retention, enjoyment, conversion, or profit outcome has yet been measured.

Next release gates:
1. App Review contact and notes are saved; build 1.0.0 (8) is selected in the public version draft.
2. Four medium-iPhone and four 13-inch-iPad screenshots are uploaded and persisted after reload, along with the Plus IAP review screenshot. Apple scales the medium-iPhone set to other iPhone display sizes. The separate large-iPhone captures remain local. Browser file-access restriction is resolved. Apple submission validation subsequently required screenshots to finish processing, Content Rights Information, and App Privacy completion. Five source-backed data types are saved as an unpublished privacy draft (email, gameplay content, user ID, device ID, product interaction); purpose/linkage/tracking setup and additional backend/processor reconciliation remain incomplete. Do not treat this initial draft as the final disclosure.
3. Physical beta: actual notification delivery, widget placement, Siri voice invocation, StoreKit purchase/restore. Simulator and local StoreKit evidence do not replace these checks.
4. Latest native/backend changes reviewed and CI verified; public store submission/approval completed.

After release, collect a baseline before asserting success:
- Daily puzzle starts → confirmed finishes, including solved/revealed and attempt distribution.
- Return play on subsequent days and weekly active days, counting confirmed activity rather than notification opens alone.
- Plus product-page exposure → verified purchase; cancellation, pending approval and store unavailability kept distinct.
- Refunds/restores/support reports and per-active-player backend/AI cost alongside revenue.
- Qualitative beta feedback: clarity of first clue, enjoyment after wrong guesses, satisfaction at the reveal, value of Plus.

Use existing first-party gameplay records and Apple analytics where possible. Any new event collection must be specified with minimum necessary fields and reconciled with the privacy manifest/policy before deployment. Do not collect guesses, private notes or notification contents merely to measure conversion.

Run one meaningful product or offer change at a time, keep a defined baseline/cohort, and report uncertainty when samples are small. Do not declare a winner from a single enthusiastic beta tester, clicks without purchases, or more notification delivery without more enjoyable play.
