import Foundation
import Testing
@testable import RebuzzleCore

@Test func dailyConversationPlacesNudgesAtTheirRevealPoint() {
    let attempts = [
        Guess(guess: "second", correct: false, attemptNumber: 2),
        Guess(guess: "first", correct: false, attemptNumber: 1)
    ]
    let reveals = [
        DailyNudgeReveal(hintIndex: 3, afterAttemptCount: 2),
        DailyNudgeReveal(hintIndex: 1, afterAttemptCount: 1),
        DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 0),
        DailyNudgeReveal(hintIndex: 2, afterAttemptCount: 1)
    ]

    let entries = DailyConversationTimeline.entries(attempts: attempts, reveals: reveals)
    let labels = entries.map { entry in
        switch entry {
        case .guess(let guess): "guess-\(guess.attemptNumber)"
        case .nudge(let reveal): "nudge-\(reveal.hintIndex)"
        }
    }

    #expect(labels == ["nudge-0", "guess-1", "nudge-1", "nudge-2", "guess-2", "nudge-3"])
}

@Test func dailyNudgeReconciliationClampsAndFillsLegacyHintProgress() {
    let saved = [
        DailyNudgeReveal(hintIndex: 1, afterAttemptCount: 0),
        DailyNudgeReveal(hintIndex: 1, afterAttemptCount: 2),
        DailyNudgeReveal(hintIndex: -1, afterAttemptCount: 1),
        DailyNudgeReveal(hintIndex: 3, afterAttemptCount: 0),
        DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 99)
    ]

    let reveals = DailyConversationTimeline.reconcile(
        saved,
        revealedHintCount: 3,
        attemptCount: 2
    )

    #expect(reveals == [
        DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 2),
        DailyNudgeReveal(hintIndex: 1, afterAttemptCount: 0),
        DailyNudgeReveal(hintIndex: 2, afterAttemptCount: 2)
    ])
}

@Test func dailyNudgeReconciliationReturnsNoHintsForZeroOrNegativeProgress() {
    let saved = [DailyNudgeReveal(hintIndex: 0, afterAttemptCount: 0)]

    #expect(DailyConversationTimeline.reconcile(saved, revealedHintCount: 0, attemptCount: 0).isEmpty)
    #expect(DailyConversationTimeline.reconcile(saved, revealedHintCount: -1, attemptCount: -1).isEmpty)
}
