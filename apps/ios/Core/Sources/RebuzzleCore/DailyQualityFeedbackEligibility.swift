import Foundation

public enum DailyQualityFeedbackEligibility {
    public static func canRate(
        resultPuzzleDate: String,
        dailyPuzzleDate: String,
        nextPuzzleTime: String,
        now: Date = Date()
    ) -> Bool {
        guard resultPuzzleDate == dailyPuzzleDate,
              let deadline = DailyReturnTiming.deadline(nextPuzzleTime)
        else { return false }
        return now < deadline
    }
}
