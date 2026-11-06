import ActivityKit
import Foundation
import RebuzzleCore
import UIKit

final class DailyLiveActivityStore: Sendable {
    static let shared = DailyLiveActivityStore()
    static let preferenceKey = "liveRoundEnabled"

    var activitiesAreEnabled: Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    func setEnabled(_ enabled: Bool, daily: DailyResponse?, game: GameSession?) async -> Bool {
        guard enabled else {
            UserDefaults.standard.set(false, forKey: Self.preferenceKey)
            await endAll()
            return true
        }

        guard activitiesAreEnabled else {
            UserDefaults.standard.set(false, forKey: Self.preferenceKey)
            await endAll()
            return false
        }

        UserDefaults.standard.set(true, forKey: Self.preferenceKey)
        await reconcile(daily: daily, game: game)
        return true
    }

    func reconcile(daily: DailyResponse?, game: GameSession?) async {
        let activeActivities = Activity<DailyRoundActivityAttributes>.activities.filter {
            $0.activityState == .active || $0.activityState == .stale
        }
        guard UserDefaults.standard.bool(forKey: Self.preferenceKey), activitiesAreEnabled else {
            await end(activeActivities)
            return
        }
        guard let daily, let game,
              let reset = DailyReturnTiming.deadline(daily.nextPuzzleTime), reset > Date() else {
            await end(activeActivities)
            return
        }

        let matching = activeActivities.filter { $0.attributes.puzzleID == daily.puzzle.id }
        let previousRounds = activeActivities.filter { $0.attributes.puzzleID != daily.puzzle.id }
        await end(previousRounds)

        let state = DailyRoundActivityAttributes.ContentState(
            guessesRemaining: game.attemptsLeft,
            isComplete: game.gameOver
        )
        let content = ActivityContent(state: state, staleDate: reset)

        if game.gameOver {
            for activity in matching {
                await activity.end(content, dismissalPolicy: .after(Date().addingTimeInterval(20 * 60)))
            }
            return
        }

        if let activity = matching.first {
            await activity.update(content)
            await end(Array(matching.dropFirst()))
            return
        }

        // ActivityKit only allows a standard activity request while the app is visible.
        let applicationIsActive = await MainActor.run {
            UIApplication.shared.applicationState == .active
        }
        guard applicationIsActive else { return }
        let attributes = DailyRoundActivityAttributes(puzzleID: daily.puzzle.id, nextPuzzleTime: reset)
        _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
    }

    func endAll() async {
        let activeActivities = Activity<DailyRoundActivityAttributes>.activities.filter {
            $0.activityState == .active || $0.activityState == .stale
        }
        await end(activeActivities)
    }

    private func end(_ activities: [Activity<DailyRoundActivityAttributes>]) async {
        for activity in activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
