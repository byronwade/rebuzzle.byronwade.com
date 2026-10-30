import Foundation
import Testing
@testable import RebuzzleCore

private func journeySnapshot(completedThisWeek: Int = 2) throws -> JourneyProgressSnapshot {
    let data = Data("""
    {"asOfPuzzleDate":"2026-10-26","currentWeekStart":"2026-10-26","currentWeekEnd":"2026-11-01","summary":{"totalXP":325,"level":2,"xpIntoLevel":25,"finishes":3,"solves":2,"firstGuessSolves":1,"unassistedSolves":1,"completedThisWeek":\(completedThisWeek),"badges":["first-finish","first-guess-solve"]},"recentEntries":[],"backfill":{"status":"complete"}}
    """.utf8)
    return try JSONDecoder().decode(JourneyProgressSnapshot.self, from: data)
}

@Test func serverSummaryOwnsLifetimeLevelWeeklyProgressAndBadges() throws {
    let snapshot = try journeySnapshot()
    let progress = try JourneyProgress(summary: #require(snapshot.summary))

    #expect(progress.totalXP == 325)
    #expect(progress.level == 2)
    #expect(progress.levelXP == 25)
    #expect(progress.weeklyDays == 2)
    #expect(progress.badges.filter(\.earned).map(\.id) == ["first-finish", "first-guess-solve"])
}

@Test func weeklyTrailUsesServerCountAndCapsTheThreeDayGoal() throws {
    let emptyWeek = try journeySnapshot(completedThisWeek: 0)
    let completeWeek = try journeySnapshot(completedThisWeek: 5)
    let emptySummary = try #require(emptyWeek.summary)
    let completeSummary = try #require(completeWeek.summary)

    #expect(JourneyProgress(summary: emptySummary).weeklyDays == 0)
    #expect(JourneyProgress(summary: completeSummary).weeklyDays == 3)
}

@Test func perPuzzleRewardPreviewMatchesTheServerRewardRules() {
    #expect(JourneyProgress.points(won: false, attempts: 3, hintsUsed: 0) == 25)
    #expect(JourneyProgress.points(won: true, attempts: 2, hintsUsed: 1) == 100)
    #expect(JourneyProgress.points(won: true, attempts: 2, hintsUsed: 0) == 125)
}
