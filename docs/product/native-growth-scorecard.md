# Native Rebuzzle: enjoyment and revenue evidence

Objective: an exceptionally fun single-puzzle-a-day iOS game that players voluntarily return to and that earns sustainable revenue.

Current product: one daily scored puzzle, Eve feedback/hints, spoiler-free sharing, local XP/levels/badges/weekly goals, countdown, opt-in daily reminders, widgets and Siri entry. Optional Plus is a one-time non-consumable for completed-puzzle journal, notes and insights. Price displayed in-app always comes from StoreKit. Current configured US baseline was $9.99; verify in App Store Connect before changing pricing.

Evidence must distinguish implementation from outcomes. Native tests and TestFlight availability prove delivery, not enjoyment, retention, conversion or profitability. There are no measured improvements to those outcomes in this scorecard yet.

Next release gates:
1. App Review contact: Apple currently rejects draft save for missing name/email/phone. User input requested; do not invent contact details.
2. Public listing and IAP screenshots: twelve native listing captures are prepared locally (four each for medium iPhone, large iPhone, and 13-inch iPad), with original dimensions and opaque PNGs verified. See `docs/marketing/native-store-screenshots.md` for reproduction and example-data disclosures. IAP review screenshot and public upload remain outstanding; the browser file-access upload restriction is a separate unresolved submission constraint. Do not bypass the restriction.
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
