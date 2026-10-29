import Foundation
import Testing
@testable import RebuzzleCore

private func snapshotPayload(
    status: String = "complete",
    summary: String = #"{"totalXP":300,"level":2,"xpIntoLevel":0,"finishes":7,"solves":5,"firstGuessSolves":2,"unassistedSolves":3,"completedThisWeek":3,"badges":["first-finish","first-guess-solve","three-unassisted-solves","seven-finishes"]}"#,
    entries: String = #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"solved","attempts":1,"hintCount":0,"completedAt":"2026-10-26T12:34:56Z","timeZone":"America/Los_Angeles"}]"#,
    reward: String? = #"{"weekStart":"2026-10-26","bonusXP":50,"earned":true}"#
) -> Data {
    let rewardField = reward.map { #""weeklyTrailReward":\#($0),"# } ?? ""
    return Data("""
    {"asOfPuzzleDate":"2026-10-26","currentWeekStart":"2026-10-26","currentWeekEnd":"2026-11-01",\(rewardField)"summary":\(summary),"recentEntries":\(entries),"backfill":{"status":"\(status)"}}
    """.utf8)
}

private func progressEntry(outcome: String, attempts: Int) -> String {
    "{\"puzzleDate\":\"2026-10-26\",\"puzzleId\":\"daily-1\",\"outcome\":\"\(outcome)\",\"attempts\":\(attempts),\"hintCount\":0,\"completedAt\":\"2026-10-26T12:34:56Z\",\"timeZone\":\"UTC\"}"
}

private func progressEntries(outcome: String, attempts: Int) -> String {
    "[" + progressEntry(outcome: outcome, attempts: attempts) + "]"
}

@Test func completeSnapshotDecodesServerOwnedSummaryAndEntries() throws {
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: snapshotPayload())

    #expect(snapshot.summary?.totalXP == 300)
    #expect(snapshot.summary?.level == 2)
    #expect(snapshot.summary?.xpIntoLevel == 0)
    #expect(snapshot.summary?.completedThisWeek == 3)
    #expect(snapshot.recentEntries.first?.puzzleId == "daily-1")
    #expect(snapshot.recentEntries.first?.outcome.rawValue == "solved")
    #expect(snapshot.weeklyTrailReward?.bonusXP == 50)
    #expect(snapshot.weeklyTrailReward?.earned == true)
}

@Test func incompleteSnapshotHasNoSummaryOrEntriesAndKeepsServerWeekBounds() throws {
    let snapshot = try JSONDecoder().decode(
        JourneyProgressSnapshot.self,
        from: snapshotPayload(status: "in_progress", summary: "null", entries: "[]", reward: "null")
    )

    #expect(snapshot.summary == nil)
    #expect(snapshot.recentEntries.isEmpty)
    #expect(snapshot.currentWeekStart == "2026-10-26")
    #expect(snapshot.currentWeekEnd == "2026-11-01")
    #expect(snapshot.weeklyTrailReward == nil)
}

@Test func oldServersCanOmitWeeklyTrailRewardAndMalformedRewardsAreRejected() throws {
    let oldServer = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: snapshotPayload(reward: nil))
    #expect(oldServer.weeklyTrailReward == nil)

    for reward in [
        #"{"weekStart":"2026-10-19","bonusXP":50,"earned":true}"#,
        #"{"weekStart":"2026-10-26","bonusXP":25,"earned":true}"#,
        #"{"weekStart":"2026-10-26","bonusXP":50,"earned":false}"#
    ] {
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(JourneyProgressSnapshot.self, from: snapshotPayload(reward: reward))
        }
    }
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

@Test func failedOutcomeDecodesAndLegacyRevealOutcomeIsRejected() throws {
    let failed = snapshotPayload(entries: #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"failed","attempts":3,"hintCount":0,"completedAt":"2026-10-26T12:34:56Z","timeZone":"UTC"}]"#)
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: failed)

    #expect(snapshot.recentEntries.first?.outcome == .failed)

    let revealed = snapshotPayload(entries: #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"revealed","attempts":3,"hintCount":0,"completedAt":"2026-10-26T12:34:56Z","timeZone":"UTC"}]"#)
    #expect(throws: DecodingError.self) {
        try JSONDecoder().decode(JourneyProgressSnapshot.self, from: revealed)
    }
}

@Test func terminalOutcomesRequireGameValidGuessCounts() throws {
    for attempts in 1...3 {
        let solved = snapshotPayload(entries: progressEntries(outcome: "solved", attempts: attempts))
        let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: solved)
        #expect(snapshot.recentEntries.first?.attempts == attempts)
        #expect(snapshot.recentEntries.first?.outcome == .solved)
    }

    let failedAfterThreeGuesses = snapshotPayload(entries: progressEntries(outcome: "failed", attempts: 3))
    let failedSnapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: failedAfterThreeGuesses)
    #expect(failedSnapshot.recentEntries.first?.attempts == 3)
    #expect(failedSnapshot.recentEntries.first?.outcome == .failed)

    let solvedWithoutGuesses = snapshotPayload(entries: progressEntries(outcome: "solved", attempts: 0))
    #expect(throws: DecodingError.self) {
        try JSONDecoder().decode(JourneyProgressSnapshot.self, from: solvedWithoutGuesses)
    }
    for attempts in 1...2 {
        let earlyFailure = snapshotPayload(entries: progressEntries(outcome: "failed", attempts: attempts))
        #expect(throws: DecodingError.self) {
            try JSONDecoder().decode(JourneyProgressSnapshot.self, from: earlyFailure)
        }
    }
}

@Test func extendedTerminalOutcomesMayExceedTheStandardThreeGuesses() throws {
    let extended = #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"solved","attempts":4,"hintCount":0,"completedAt":"2026-10-26T12:34:56Z","timeZone":"UTC","playMode":"extended"}]"#
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: snapshotPayload(entries: extended))
    #expect(snapshot.recentEntries.first?.playMode == .extended)
    #expect(snapshot.recentEntries.first?.attempts == 4)

    let standard = progressEntries(outcome: "solved", attempts: 4)
    #expect(throws: DecodingError.self) {
        try JSONDecoder().decode(JourneyProgressSnapshot.self, from: snapshotPayload(entries: standard))
    }
}

@Test func legacyUnknownHintCountDecodesAsNilRatherThanZero() throws {
    let payload = snapshotPayload(entries: #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"failed","attempts":3,"hintCount":null,"completedAt":"2026-10-26T12:34:56Z","timeZone":"UTC"}]"#)
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: payload)

    #expect(snapshot.recentEntries.first?.hintCount == nil)
    #expect(snapshot.recentEntries.first?.attempts == 3)
}

@Test func historicalUnknownTimeZoneDecodesAsNil() throws {
    let payload = snapshotPayload(entries: #"[{"puzzleDate":"2026-10-26","puzzleId":"daily-1","outcome":"failed","attempts":3,"hintCount":null,"completedAt":"2026-10-26T12:34:56Z","timeZone":null}]"#)
    let snapshot = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: payload)

    #expect(snapshot.recentEntries.first?.timeZone == nil)
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
