import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DailyPuzzleQualityTable,
  DailySolvePulseMetric,
  PlusOfferSourceBreakdown,
} from "../NativeGrowthCard";

describe("PlusOfferSourceBreakdown", () => {
  it("shows account counts, hides small counts, and labels every offer surface", () => {
    const markup = renderToStaticMarkup(
      createElement(PlusOfferSourceBreakdown, {
        sources: {
          archive: {
            viewerAccounts: 6,
            purchaseStarterAccounts: 0,
            verifiedPurchaserAccounts: 5,
            pendingAccounts: null,
            cancelledAccounts: 0,
            unverifiedAccounts: 0,
            failedAccounts: 0,
            sameDayVerifiedPurchaserAccounts: 5,
            sameDayConversionRate: 5 / 6,
          },
          settings: {
            viewerAccounts: null,
            purchaseStarterAccounts: 0,
            verifiedPurchaserAccounts: 0,
            pendingAccounts: 0,
            cancelledAccounts: 0,
            unverifiedAccounts: 0,
            failedAccounts: 0,
            sameDayVerifiedPurchaserAccounts: null,
            sameDayConversionRate: null,
          },
          journey_insights: {
            viewerAccounts: 0,
            purchaseStarterAccounts: 0,
            verifiedPurchaserAccounts: 0,
            pendingAccounts: 0,
            cancelledAccounts: 0,
            unverifiedAccounts: 0,
            failedAccounts: 0,
            sameDayVerifiedPurchaserAccounts: 0,
            sameDayConversionRate: null,
          },
          journal: {
            viewerAccounts: 4,
            purchaseStarterAccounts: 0,
            verifiedPurchaserAccounts: 0,
            pendingAccounts: 0,
            cancelledAccounts: 0,
            unverifiedAccounts: 0,
            failedAccounts: 0,
            sameDayVerifiedPurchaserAccounts: 0,
            sameDayConversionRate: null,
          },
          free_sample: {
            viewerAccounts: 5,
            purchaseStarterAccounts: 0,
            verifiedPurchaserAccounts: 4,
            pendingAccounts: 0,
            cancelledAccounts: 0,
            unverifiedAccounts: 0,
            failedAccounts: 0,
            sameDayVerifiedPurchaserAccounts: 4,
            sameDayConversionRate: null,
          },
        },
      })
    );

    expect(markup).toContain("Unique account counts");
    expect(markup).toContain("Archive");
    expect(markup).toContain("Settings");
    expect(markup).toContain("Journey insights");
    expect(markup).toContain("Journal");
    expect(markup).toContain("Free sample");
    expect(markup).toContain("Accounts may appear under more than one surface");
    expect(markup).toContain("Hidden (&lt;5)");
    expect(markup).toContain("83.3%");
    expect(markup).toMatch(/>0</);
    expect(markup).not.toContain("5 of 6");
  });
});

describe("DailySolvePulseMetric", () => {
  it("labels the optional view as a distinct account-day aggregate", () => {
    const markup = renderToStaticMarkup(createElement(DailySolvePulseMetric, { accountDays: 7 }));

    expect(markup).toContain("Solve mix viewed");
    expect(markup).toContain("distinct account-days");
    expect(markup).toContain(">7</div>");
  });
});

describe("DailyPuzzleQualityTable", () => {
  it("renders all-platform daily player counts and outcome distributions in an accessible table", () => {
    const markup = renderToStaticMarkup(
      createElement(DailyPuzzleQualityTable, {
        rows: [
          {
            puzzleDate: "2026-10-27",
            players: 5,
            guessBuckets: { one: 1, two: 1, three: 1, fourPlus: 2 },
            outcomes: { solved: 2, revealed: 1, expired: 0, ranOut: 1, inProgress: 1 },
            medianWallClockHoursToSolve: 2.75,
            nativeRatings: {
              total: 4,
              too_easy: 1,
              just_right: 1,
              tough_but_fair: 1,
              unclear: 1,
            },
          },
          {
            puzzleDate: "2026-10-26",
            players: 3,
            guessBuckets: { one: 1, two: 1, three: 1, fourPlus: 0 },
            outcomes: { solved: 2, revealed: 0, expired: 0, ranOut: 0, inProgress: 1 },
            medianWallClockHoursToSolve: null,
            nativeRatings: { total: 0, too_easy: 0, just_right: 0, tough_but_fair: 0, unclear: 0 },
          },
        ],
      })
    );

    expect(markup).toContain("Daily puzzle play patterns");
    expect(markup).toContain("All platforms");
    expect(markup).toContain('aria-label="Daily puzzle play patterns by date"');
    expect(markup).toContain('role="region"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('scope="colgroup">Guesses per player-day</th>');
    expect(markup).toContain("4+ guesses");
    expect(markup).toContain("Solved");
    expect(markup).toContain("Revealed");
    expect(markup).toContain("Expired");
    expect(markup).toContain("Ran out");
    expect(markup).toContain("In progress");
    expect(markup).toContain("Median wall-clock to solve");
    expect(markup).toContain("2.8 h");
    expect(markup).toContain("Not enough data");
    expect(markup).toContain("first recorded session restore");
    expect(markup).toContain("includes idle/background time");
    expect(markup).toContain("Player ratings by puzzle date");
    expect(markup).toContain("Native app · optional, self-selected responses");
    expect(markup).toContain("not matched to all-platform gameplay counts");
    expect(markup).toContain('aria-label="Player ratings by puzzle date"');
    expect(markup).toContain("Too easy");
    expect(markup).toContain("Just right");
    expect(markup).toContain("Tough but fair");
    expect(markup).toContain("Unclear");
    expect(markup).toMatch(
      /<div aria-label="Player ratings by puzzle date; scroll horizontally to see all columns"[^>]*role="region"[^>]*tabindex="0"/s
    );
    expect(markup).toMatch(/<td[^>]*>5<\/td>/);
    expect(markup).toMatch(/<td[^>]*>4<\/td>/);
    expect(markup.match(/dateTime="2026-10-26"/g)).toHaveLength(2);
    expect(markup).toContain("2026");
  });

  it("shows an independent empty state for ratings while preserving gameplay outcomes", () => {
    const markup = renderToStaticMarkup(
      createElement(DailyPuzzleQualityTable, {
        rows: [
          {
            puzzleDate: "2026-10-27",
            players: 5,
            guessBuckets: { one: 1, two: 1, three: 1, fourPlus: 2 },
            outcomes: { solved: 2, revealed: 1, expired: 0, ranOut: 1, inProgress: 1 },
            medianWallClockHoursToSolve: null,
            nativeRatings: { total: 0, too_easy: 0, just_right: 0, tough_but_fair: 0, unclear: 0 },
          },
        ],
      })
    );

    expect(markup).toContain("Daily puzzle play patterns");
    expect(markup).toContain("No optional native-app ratings for these puzzle dates yet.");
    expect(markup).toContain('aria-label="Daily puzzle play patterns by date"');
    expect(markup).not.toContain('aria-label="Player ratings by puzzle date"');
  });

  it("shows a clear empty state when no server-recorded attempts exist", () => {
    const markup = renderToStaticMarkup(createElement(DailyPuzzleQualityTable, { rows: [] }));

    expect(markup).toContain("No server-recorded daily guesses in this period.");
    expect(markup).not.toContain("<table");
  });
});
