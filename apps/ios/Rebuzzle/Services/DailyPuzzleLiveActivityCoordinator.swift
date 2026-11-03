@preconcurrency import ActivityKit
import Foundation
import RebuzzleCore

@MainActor
final class DailyPuzzleLiveActivityCoordinator {
    private static let preferenceKey = "dailyPuzzleLiveActivityEnabled"
    private static let completionDisplayDuration: TimeInterval = 15 * 60

    private let defaults: UserDefaults
    private var generation = 0

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    private var isEnabled: Bool {
        guard defaults.object(forKey: Self.preferenceKey) != nil else { return true }
        return defaults.bool(forKey: Self.preferenceKey)
    }

    func setEnabled(_ enabled: Bool) async {
        generation += 1
        defaults.set(enabled, forKey: Self.preferenceKey)
        if !enabled {
            await endAllImmediately()
        }
    }

    func sync(
        puzzleID: String,
        puzzleDate: String,
        attempts: Int,
        hintsUsed: Int,
        scoreLocked: Bool,
        isFinished: Bool,
        wasSuccessful: Bool
    ) async {
        let syncGeneration = generation
        let activities = Activity<DailyPuzzleLiveActivityAttributes>.activities
            .filter { $0.activityState == .active }

        guard isEnabled, ActivityAuthorizationInfo().areActivitiesEnabled else {
            await endImmediately(activities)
            return
        }

        guard attempts > 0 || hintsUsed > 0 else {
            await endImmediately(activities)
            return
        }

        let phase: DailyPuzzleLiveActivityAttributes.ContentState.Phase
        if isFinished {
            phase = wasSuccessful ? .solved : .revealed
        } else {
            phase = scoreLocked ? .scoreLocked : .solving
        }

        let state = DailyPuzzleLiveActivityAttributes.ContentState(
            scoredGuessesUsed: min(attempts, 3),
            hintsUsed: hintsUsed,
            phase: phase
        )
        let content = ActivityContent(state: state, staleDate: nil)
        let matching = activities.first {
            $0.attributes.puzzleID == puzzleID && $0.attributes.puzzleDate == puzzleDate
        }

        for activity in activities where
            activity.attributes.puzzleID != puzzleID || activity.attributes.puzzleDate != puzzleDate {
            await activity.end(nil, dismissalPolicy: .immediate)
        }

        guard syncGeneration == generation else { return }
        guard isEnabled, ActivityAuthorizationInfo().areActivitiesEnabled else {
            await endAllImmediately()
            return
        }

        if isFinished {
            guard let matching else { return }
            await matching.end(
                content,
                dismissalPolicy: .after(Date().addingTimeInterval(Self.completionDisplayDuration))
            )
            return
        }

        if let matching {
            await matching.update(content)
            return
        }

        let attributes = DailyPuzzleLiveActivityAttributes(puzzleID: puzzleID, puzzleDate: puzzleDate)
        do {
            _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
        } catch {
            // A Live Activity is optional UI; gameplay stays available if the system refuses it.
        }
    }

    func endAllImmediately() async {
        await endImmediately(Activity<DailyPuzzleLiveActivityAttributes>.activities)
    }

    private func endImmediately(_ activities: [Activity<DailyPuzzleLiveActivityAttributes>]) async {
        for activity in activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
