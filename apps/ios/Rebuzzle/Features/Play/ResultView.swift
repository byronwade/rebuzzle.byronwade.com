import SwiftUI
import UIKit
import RebuzzleCore

struct ResultView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    /// Celebrate a solve once per puzzle, not every time the result is reopened.
    @AppStorage("celebratedDailyPuzzleID") private var celebratedPuzzleID = ""
    @State private var celebrating = false
    @Binding var shareRequest: DailyResultShareRequest?
    @State private var renderedShareSummary: DailyShareSummary?
    @State private var renderedSharePNG: Data?
    private func celebrateFirstSolve(of game: GameSession) {
        guard game.wasSuccessful == true, celebratedPuzzleID != game.puzzleId else { return }
        celebratedPuzzleID = game.puzzleId
        celebrating = true
    }
    var body: some View {
        if let game = model.game {
            let continuationGuessCount = max(0, game.attempts.count - game.maxAttempts)
            let hasContinuationGuesses = continuationGuessCount > 0
            let resultOutcome = game.wasSuccessful == true ? "solved" : "answer revealed"
            let attemptHistoryAccessibilityLabel = hasContinuationGuesses
                ? "\(game.maxAttempts) scored guesses, \(continuationGuessCount) continuation \(continuationGuessCount == 1 ? "guess" : "guesses"), \(resultOutcome)"
                : "\(game.attempts.count) of \(game.maxAttempts) guesses, \(resultOutcome)"
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 16) {
                    let lateSolve = game.wasSuccessful == true && game.scoreLocked == true && game.attempts.count > game.maxAttempts
                    Text(game.wasSuccessful == true ? "Aha!" : "The reveal.")
                        .font(Theme.display(game.wasSuccessful == true ? 80 : 48)).tracking(-2)
                        .foregroundStyle(game.wasSuccessful == true ? Theme.reward : Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Label(game.wasSuccessful == true ? "You found it." : "Here’s the connection.", systemImage: game.wasSuccessful == true ? "checkmark.seal.fill" : "eye")
                        .font(Theme.font(14, weight: .medium)).foregroundStyle(game.wasSuccessful == true ? Theme.reward : Theme.secondary)
                    Text(game.revealedAnswer ?? "Puzzle complete")
                        .font(Theme.display(32)).tracking(-0.8).textSelection(.enabled)
                        .fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: 8) {
                        ForEach(0..<game.maxAttempts, id: \.self) { index in
                            let guess = game.attempts.first { $0.attemptNumber == index + 1 }
                            Image(systemName: guess?.correct == true ? "checkmark" : guess != nil ? "minus" : "circle")
                                .font(.system(size: 16, weight: .semibold))
                                .frame(width: 44, height: 44)
                                .foregroundStyle(guess?.correct == true ? Theme.panel : Theme.secondary)
                                .background(guess?.correct == true ? Theme.success : Theme.field, in: RoundedRectangle(cornerRadius: Theme.radius))
                        }
                    }.accessibilityElement(children: .ignore)
                    .accessibilityLabel(attemptHistoryAccessibilityLabel)
                    if let explanation = game.explanation, !explanation.isEmpty {
                        Text(explanation).font(Theme.font(16)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                    }
                    if lateSolve {
                        Text("Your official score was set after three guesses. This solve still counts toward today’s streak and Journey progress.")
                            .font(Theme.font(13, weight: .medium)).foregroundStyle(Theme.reward)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("lateSolveMessage")
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(game.wasSuccessful == true ? Theme.reward.opacity(0.40) : Theme.secondary.opacity(0.20), lineWidth: 1))
                .overlay(alignment: .top) { CelebrationBurst(isActive: celebrating) }
                .onAppear { celebrateFirstSolve(of: game) }
                if let summary = game.dailyShareSummary {
                    dailyShareAction(summary)
                } else {
                    ShareLink(item: game.shareText) { Label("Challenge a friend", systemImage: "square.and.arrow.up") }
                        .buttonStyle(CommitStyle())
                        .accessibilityIdentifier("dailyResultShare")
                }
                Text("Same puzzle. Your answer stays a secret.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                DailyReturnCard()
                DailyStreakCard(presentation: model.streakPresentation(for: game), context: .result)
                if let daily = model.daily,
                   game.puzzleId == daily.puzzle.id,
                   game.puzzleDate == daily.puzzleDate {
                    DailySolvePulseCard(
                        puzzleID: daily.puzzle.id,
                        solvedAttemptNumber: game.attempts.first(where: \.correct)?.attemptNumber,
                        isSolved: game.wasSuccessful == true,
                        api: model.api,
                        onViewed: { model.recordGrowthEvent(.dailySolvePulseViewed) }
                    )
                }
                JourneyRewards(game: game)
                let metrics = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 20)) : AnyLayout(HStackLayout(spacing: 32))
                metrics {
                    resultMetric(
                        hasContinuationGuesses ? "\(game.attempts.count)" : "\(game.attempts.count)/\(game.maxAttempts)",
                        hasContinuationGuesses ? "Total guesses" : "Guesses"
                    )
                    resultMetric("\(model.hintsShown)", "Hints")
                    resultMetric("\(model.journal.entries.count)", "Days played here")
                }
                if let daily = model.daily {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        if DailyQualityFeedbackEligibility.canRate(
                            resultPuzzleDate: game.puzzleDate,
                            dailyPuzzleDate: daily.puzzleDate,
                            nextPuzzleTime: daily.nextPuzzleTime,
                            now: context.date
                        ) {
                            DailyQualityPulse { rating in
                                model.recordGrowthEvent(
                                    .dailyQualityFeedback(rating, puzzleDate: game.puzzleDate)
                                )
                            }
                        }
                    }
                }
                if let puzzle = model.daily?.puzzle {
                    DisclosureGroup("See the puzzle") {
                        PuzzleBoard(puzzle: puzzle).padding(.top, 12)
                    }.font(Theme.font(14)).tint(Theme.ink)
                }
                if model.journal.entries.contains(where: { $0.id == game.puzzleId }) {
                    NavigationLink(value: RebuzzleRoute.journal) {
                        Label(model.purchases.hasPlus ? "Add a thought to your journal" : "Keep this connection", systemImage: "book.closed")
                    }.font(Theme.font(14)).frame(minHeight: 44).accessibilityIdentifier("keepConnection")
                }
            }
            .task(id: game.dailyShareSummary) {
                guard let summary = game.dailyShareSummary else {
                    renderedShareSummary = nil
                    renderedSharePNG = nil
                    return
                }
                let image = await MainActor.run {
                    DailyResultShareCardRenderer.renderPNG(summary: summary)
                }
                guard !Task.isCancelled, model.game?.dailyShareSummary == summary else { return }
                renderedSharePNG = image
                renderedShareSummary = image == nil ? nil : summary
            }
        }
    }
    @ViewBuilder
    private func dailyShareAction(_ summary: DailyShareSummary) -> some View {
        Button {
            model.recordGrowthEvent(.dailyShareStarted)
            shareRequest = DailyResultShareRequest(
                summary: summary,
                pngData: DailyResultShareCardRenderer.matchingPNG(
                    renderedSharePNG,
                    renderedFor: renderedShareSummary,
                    current: summary
                )
            )
        } label: {
            Label("Challenge a friend", systemImage: "square.and.arrow.up")
        }
        .buttonStyle(CommitStyle())
        .accessibilityLabel("Challenge a friend")
        .accessibilityHint("Share today's puzzle result without revealing your answer.")
        .accessibilityIdentifier("dailyResultShare")
        .popover(item: $shareRequest, attachmentAnchor: .rect(.bounds), arrowEdge: .bottom) { request in
            DailyResultActivitySheet(pngData: request.pngData, shareText: request.summary.shareText) { completed in
                guard let event = GrowthEvent.dailyShareCompletionEvent(completed: completed) else { return }
                model.recordGrowthEvent(event)
            }
        }
    }
    private func resultMetric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) { Text(value).font(Theme.font(22, weight: .medium)).monospacedDigit(); Text(label).font(Theme.font(11)).foregroundStyle(Theme.secondary) }
    }
    static func date(_ raw: String) -> Date? {
        DailyReturnTiming.deadline(raw)
    }
}

struct DailyQualityPulse: View {
    @State private var selectedRating: DailyQualityRating?
    let onSelect: (DailyQualityRating) -> Void

    private let columns = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("How did today’s puzzle feel?")
                    .font(Theme.font(16, weight: .medium, relativeTo: .headline))
                    .accessibilityAddTraits(.isHeader)
                Text("A quick read helps us shape future dailies.")
                    .font(Theme.font(13, relativeTo: .subheadline))
                    .foregroundStyle(Theme.secondary)
            }

            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(DailyQualityRating.allCases) { rating in
                    let isSelected = selectedRating == rating
                    Button {
                        selectedRating = rating
                        onSelect(rating)
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: isSelected ? "checkmark.circle.fill" : rating.symbol)
                                .font(.system(size: 15, weight: .medium))
                            Text(rating.title)
                                .font(Theme.font(13, weight: .medium, relativeTo: .subheadline))
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                        .foregroundStyle(isSelected ? Theme.canvas : Theme.ink)
                        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                        .padding(.horizontal, 10)
                        .background(isSelected ? Theme.ink : Theme.field, in: RoundedRectangle(cornerRadius: Theme.radius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(isSelected ? 0.35 : 0.16), lineWidth: 1))
                        .contentShape(RoundedRectangle(cornerRadius: Theme.radius))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(rating.title)
                    .accessibilityValue(isSelected ? "Selected" : "")
                    .accessibilityHint("Share how the daily puzzle felt.")
                    .accessibilityIdentifier("qualityRating.\(rating.rawValue)")
                }
            }

            if selectedRating != nil {
                Label("Thanks for the read. It helps us shape future dailies.", systemImage: "checkmark.seal.fill")
                    .font(Theme.font(13, weight: .medium, relativeTo: .subheadline))
                    .foregroundStyle(Theme.success)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("qualityFeedbackThanks")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(0.18), lineWidth: 1))
    }
}

extension DailyQualityRating {
    var title: String {
        switch self {
        case .tooEasy: "Too easy"
        case .justRight: "Just right"
        case .toughButFair: "Tough but fair"
        case .unclear: "The clues didn’t click"
        }
    }

    var symbol: String {
        switch self {
        case .tooEasy: "sun.max"
        case .justRight: "sparkle"
        case .toughButFair: "brain.head.profile"
        case .unclear: "questionmark.circle"
        }
    }
}
