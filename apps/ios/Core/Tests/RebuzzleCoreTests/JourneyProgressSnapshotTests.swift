import Foundation
import Testing
@testable import RebuzzleCore

private func snapshotPayload(
    status: String = "complete",
    summary: String = #"{"totalXP":300,"level":2,"xpIntoLevel":0,"finishes":7,"solves":5,"firstGuessSolves":2,"unassistedSolves":3,"completedThisWeek":3,"badges":["first-finish","first-guess-solve","three-unassisted-solves","seven-finishes"]}"#,
    entries: String = #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"solved","attempts":1,"hintCount":0,"completedAt":"2026-10-26T12:34:56Z","timeZone":"America/Los_Angeles"}]"#
) -> Data {
    Data("""
    {"asOfPuzzleDate":"2026-10-26","currentWeekStart":"2026-10-26","currentWeekEnd":"2026-11-01","summary":\(summary),"recentEntries":\(entries),"backfill":{"status":"\(status)"}}
    """.utf8)
}

@Test func completeSnapshotDecodesServerOwnedSummaryAndEntries() throws {
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: snapshotPayload())

    #expect(snapshot.summary?.totalXP == 300)
    #expect(snapshot.summary?.level == 2)
    #expect(snapshot.summary?.xpIntoLevel == 0)
    #expect(snapshot.summary?.completedThisWeek == 3)
    #expect(snapshot.recentEntries.first?.puzzleId == "daily-1")
    #expect(snapshot.recentEntries.first?.outcome.rawValue == "solved")
}

@Test func incompleteSnapshotHasNoSummaryOrEntriesAndKeepsServerWeekBounds() throws {
    let snapshot = try JSONDecoder().decode(
        JourneyProgressSnapshot.self,
        from: snapshotPayload(status: "in_progress", summary: "null", entries: "[]")
    )

    #expect(snapshot.summary == nil)
    #expect(snapshot.recentEntries.isEmpty)
    #expect(snapshot.currentWeekStart == "2026-10-26")
    #expect(snapshot.currentWeekEnd == "2026-11-01")
}

@Test func badgeIDsRemainStableServerIdentifiers() throws {
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: snapshotPayload())

    #expect(snapshot.summary?.badges == [
        "first-finish",
        "first-guess-solve",
        "three-unassisted-solves",
        "seven-finishes"
    ])
}

@Test func legacyUnknownHintCountStaysNilForZeroGuessReveal() throws {
    let payload = snapshotPayload(entries: #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"revealed","attempts":0,"hintCount":null,"completedAt":"2026-10-26T12:34:56Z","timeZone":"UTC"}]"#)
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: payload)

    #expect(snapshot.recentEntries.first?.hintCount == nil)
    #expect(snapshot.recentEntries.first?.attempts == 0)
}

@Test func malformedProgressPayloadsAreRejected() {
    let unknownBadge = #"{"totalXP":300,"level":2,"xpIntoLevel":0,"finishes":0,"solves":0,"firstGuessSolves":0,"unassistedSolves":0,"completedThisWeek":0,"badges":["unknown-badge"]}"#
    let invalidLevelProgress = #"{"totalXP":300,"level":2,"xpIntoLevel":300,"finishes":0,"solves":0,"firstGuessSolves":0,"unassistedSolves":0,"completedThisWeek":0,"badges":[]}"#
    let missingNullableHintCount = #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"solved","attempts":1,"completedAt":"2026-10-26T12:34:56Z","timeZone":"UTC"}]"#

    #expect(throws: DecodingError.self) {
        try JSONDecoder().decode(
            JourneyProgressSnapshot.self,
            from: snapshotPayload(summary: unknownBadge)
        )
    }
    #expect(throws: DecodingError.self) {
        try JSONDecoder().decode(
            JourneyProgressSnapshot.self,
            from: snapshotPayload(summary: invalidLevelProgress)
        )
    }
    #expect(throws: DecodingError.self) {
        try JSONDecoder().decode(
            JourneyProgressSnapshot.self,
            from: snapshotPayload(entries: missingNullableHintCount)
        )
    }
    #expect(throws: DecodingError.self) {
        try JSONDecoder().decode(
            JourneyProgressSnapshot.self,
            from: snapshotPayload(status: "failed", summary: "null")
        )
    }
}
