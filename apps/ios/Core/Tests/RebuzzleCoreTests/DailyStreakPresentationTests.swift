import Testing
@testable import RebuzzleCore

@Suite struct DailyStreakPresentationTests {
    @Test func syncingAndUnavailableResultsNeverExposeCachedCounts() {
        let cached = PlayerStats(totalGames: 12, wins: 8, streak: 6, maxStreak: 9, points: 700)

        let syncing = DailyStreakPresentation.result(
            wasSolved: true,
            stats: cached,
            freshness: .syncing,
            celebratesMilestone: true
        )
        let unavailable = DailyStreakPresentation.result(
            wasSolved: true,
            stats: cached,
            freshness: .unavailable,
            celebratesMilestone: true
        )

        #expect(syncing.message == .syncing)
        #expect(syncing.current == nil)
        #expect(syncing.best == nil)
        #expect(unavailable.message == .unavailable)
        #expect(unavailable.current == nil)
        #expect(unavailable.best == nil)
    }

    @Test func missingCurrentStreakIsUnavailableRatherThanZero() {
        let onlyBest = PlayerStats(totalGames: 1, wins: 1, streak: nil, maxStreak: 4, points: 100)
        let presentation = DailyStreakPresentation.result(
            wasSolved: true,
            stats: onlyBest,
            freshness: .fresh,
            celebratesMilestone: true
        )

        #expect(presentation.message == .unavailable)
        #expect(presentation.current == nil)
        #expect(presentation.best == nil)
    }

    @Test func zeroServerStreakStartsTheFirstStepWithoutInventingProgress() {
        let presentation = DailyStreakPresentation.journey(
            stats: PlayerStats(totalGames: 0, wins: 0, streak: 0, maxStreak: 0, points: 0)
        )

        #expect(presentation.message == .firstStep)
        #expect(presentation.current == 0)
        #expect(presentation.best == 0)
        #expect(presentation.nextMilestone == 3)
    }

    @Test func aFailedDailyAttemptShowsTheHeldServerStreak() {
        let presentation = DailyStreakPresentation.result(
            wasSolved: false,
            stats: PlayerStats(totalGames: 5, wins: 3, streak: 3, maxStreak: 3, points: 300),
            freshness: .fresh,
            celebratesMilestone: true
        )

        #expect(presentation.message == .held)
        #expect(presentation.current == 3)
        #expect(presentation.best == 3)
        #expect(presentation.nextMilestone == 7)
    }

    @Test func aSolvedRunShowsTheNextMilestoneWithoutCelebratingEarly() {
        let presentation = DailyStreakPresentation.result(
            wasSolved: true,
            stats: PlayerStats(totalGames: 2, wins: 2, streak: 2, maxStreak: 2, points: 200),
            freshness: .fresh,
            celebratesMilestone: true
        )

        #expect(presentation.message == .solved)
        #expect(presentation.current == 2)
        #expect(presentation.nextMilestone == 3)
    }

    @Test func freshWinsCelebrateOnlyAtTheFourMilestoneBoundaries() {
        for count in [3, 7, 14, 30] {
            let presentation = DailyStreakPresentation.result(
                wasSolved: true,
                stats: PlayerStats(totalGames: count, wins: count, streak: count, maxStreak: count, points: count * 100),
                freshness: .fresh,
                celebratesMilestone: true
            )

            #expect(presentation.message == .milestone(count))
        }
    }

    @Test func restoredMilestoneResultDoesNotReplayCelebration() {
        let presentation = DailyStreakPresentation.result(
            wasSolved: true,
            stats: PlayerStats(totalGames: 7, wins: 7, streak: 7, maxStreak: 7, points: 700),
            freshness: .fresh,
            celebratesMilestone: false
        )

        #expect(presentation.message == .solved)
        #expect(presentation.current == 7)
    }

    @Test func thirtyDayStreakHasNoArtificialNextMilestone() {
        let presentation = DailyStreakPresentation.journey(
            stats: PlayerStats(totalGames: 30, wins: 30, streak: 30, maxStreak: 30, points: 3_000)
        )

        #expect(presentation.message == .active)
        #expect(presentation.current == 30)
        #expect(presentation.nextMilestone == nil)
    }

    @Test func malformedCountsNeverCreateAnInvalidBestRecord() {
        let negativeCurrent = DailyStreakPresentation.journey(
            stats: PlayerStats(totalGames: 0, wins: 0, streak: -1, maxStreak: 4, points: 0)
        )
        let inconsistentBest = DailyStreakPresentation.journey(
            stats: PlayerStats(totalGames: 4, wins: 4, streak: 4, maxStreak: 2, points: 400)
        )

        #expect(negativeCurrent.message == .unavailable)
        #expect(negativeCurrent.current == nil)
        #expect(inconsistentBest.current == 4)
        #expect(inconsistentBest.best == nil)
    }
}
