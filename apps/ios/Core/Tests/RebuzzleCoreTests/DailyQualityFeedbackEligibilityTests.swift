import Foundation
import Testing
@testable import RebuzzleCore

struct DailyQualityFeedbackEligibilityTests {
    @Test func allowsTheCurrentDailyPuzzleBeforeItsDeadline() {
        let deadline = DailyReturnTiming.deadline("2026-10-28T00:00:00Z")!
        #expect(
            DailyQualityFeedbackEligibility.canRate(
                resultPuzzleDate: "2026-10-27",
                dailyPuzzleDate: "2026-10-27",
                nextPuzzleTime: "2026-10-28T00:00:00Z",
                now: deadline.addingTimeInterval(-60)
            )
        )
    }

    @Test func rejectsAResultThatDoesNotMatchTheCurrentDailyPuzzle() {
        let deadline = DailyReturnTiming.deadline("2026-10-28T00:00:00Z")!
        #expect(
            !DailyQualityFeedbackEligibility.canRate(
                resultPuzzleDate: "2026-10-26",
                dailyPuzzleDate: "2026-10-27",
                nextPuzzleTime: "2026-10-28T00:00:00Z",
                now: deadline.addingTimeInterval(-60)
            )
        )
    }

    @Test func rejectsTheResultAtOrAfterItsPuzzleDeadline() {
        let deadline = DailyReturnTiming.deadline("2026-10-28T00:00:00Z")!

        #expect(
            !DailyQualityFeedbackEligibility.canRate(
                resultPuzzleDate: "2026-10-27",
                dailyPuzzleDate: "2026-10-27",
                nextPuzzleTime: "2026-10-28T00:00:00Z",
                now: deadline
            )
        )
    }

    @Test func rejectsAnInvalidPuzzleDeadline() {
        #expect(
            !DailyQualityFeedbackEligibility.canRate(
                resultPuzzleDate: "2026-10-27",
                dailyPuzzleDate: "2026-10-27",
                nextPuzzleTime: "not-a-date",
                now: Date(timeIntervalSince1970: 0)
            )
        )
    }
}
