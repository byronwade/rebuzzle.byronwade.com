import SwiftUI
import UIKit
import RebuzzleCore

struct TodayView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("haptics") private var haptics = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var help = false
    @State private var quickStartUsesIntro = false
    @AppStorage("hasSeenFirstSessionQuickStart") private var hasSeenFirstSessionQuickStart = false
    @State private var study: PuzzleStudy?
    @State private var dailyShareRequest: DailyResultShareRequest?
    @State private var continuedScoreLockedPuzzleID: String?
    @State private var showingExpiredReviewFor: String?
    @State private var dismissedExpiredReviewID: String?
    @State private var hintFeedback = 0
    @FocusState private var answerFocused: Bool
    var body: some View {
        @Bindable var model = model
        ScrollViewReader { scroll in
        Page(spacing: 18, bottomSafeAreaClearance: 72) {
            if let daily = model.daily {
                VStack(alignment: .leading, spacing: 6) {
                    let masthead = typeSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                        : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
                    masthead {
                        Text("Make it click.")
                            .font(Theme.display(42)).tracking(-1.5)
                            .fixedSize(horizontal: false, vertical: true)
                        if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
                        EveAvatar(celebrating: model.game?.wasSuccessful == true)
                            .accessibilityLabel("Eve, your AI puzzle author")
                    }
                    Text("Daily puzzle · " + dateLabel)
                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
                .id("dailyHeader")
                if model.game?.gameOver == true {
                    ResultView(shareRequest: $dailyShareRequest)
                    conversation
                } else {
                    VStack(spacing: 0) {
                        let stageHeader = typeSize.isAccessibilitySize
                            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                            : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
                        stageHeader {
                            Text(daily.puzzle.typeName)
                                .font(Theme.font(13, weight: .semibold))
                            if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                            Text("LEVEL \(daily.puzzle.difficulty) / 10")
                                .font(Theme.font(11, weight: .medium)).monospacedDigit()
                                .foregroundStyle(Theme.secondary)
                                .accessibilityLabel("Difficulty \(daily.puzzle.difficulty) out of 10")
                            Button {
                                dismissAnswerKeyboard()
                                study = PuzzleStudy(puzzle: daily.puzzle)
                            } label: {
                                Image(systemName: "arrow.up.left.and.arrow.down.right")
                                    .font(.system(size: 16, weight: .medium))
                                    .frame(minWidth: 44, minHeight: 44)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain).foregroundStyle(Theme.accent)
                            .accessibilityLabel("Study puzzle")
                            .accessibilityIdentifier("studyPuzzle")
                        }.padding(.horizontal, 16).padding(.vertical, 2)
                        Rectangle().fill(Theme.secondary.opacity(0.16)).frame(height: 1)
                        // Keep every clue and its internal geometry untouched.
                        PuzzleBoard(puzzle: daily.puzzle).padding(16)
                    }
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.ink.opacity(0.20), lineWidth: 1))
                    VStack(alignment: .leading, spacing: 14) {
                        attemptHeader
                        if model.game?.attempts.isEmpty == false || !model.nudgeReveals.isEmpty { conversation }
                        if model.game?.gameOver != true, model.hintsShown < daily.puzzle.hints.count {
                            Button {
                                dismissAnswerKeyboard()
                                let previous = model.hintsShown
                                model.revealHint()
                                if model.hintsShown > previous { hintFeedback += 1 }
                            } label: {
                                Group {
                                    if typeSize.isAccessibilitySize {
                                        VStack(alignment: .leading, spacing: 10) {
                                            nudgeButtonCopy
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                            Text("\(daily.puzzle.hints.count - model.hintsShown) left")
                                                .font(Theme.font(12, weight: .medium))
                                                .foregroundStyle(Theme.secondary)
                                        }
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(12)
                                    } else {
                                        HStack(spacing: 12) {
                                            nudgeButtonCopy
                                            Spacer(minLength: 6)
                                            Text("\(daily.puzzle.hints.count - model.hintsShown) left")
                                                .font(Theme.font(11, weight: .medium))
                                                .foregroundStyle(Theme.secondary)
                                        }
                                        .frame(minHeight: 56)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 4)
                                    }
                                }
                                .contentShape(Rectangle())
                                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 15))
                                .overlay(RoundedRectangle(cornerRadius: 15).strokeBorder(Theme.accent.opacity(0.18), lineWidth: 1))
                            }
                            .buttonStyle(.plain).foregroundStyle(Theme.ink)
                            .disabled(!model.sessionReady)
                            .accessibilityLabel("Ask Eve for a nudge")
                            .accessibilityHint("Reveals the next hint in your conversation")
                            .accessibilityIdentifier("askEveForNudge")
                        }
                        if model.game?.scoreLocked == true {
                            scoreLockCard.id("scoreLockCard")
                        }
                        if !awaitingScoreLockDecision {
                            VStack(alignment: .leading, spacing: 12) {
                                TextField("Your answer", text: $model.draft, prompt: Text("Your answer…").foregroundStyle(Theme.secondary), axis: .horizontal)
                                    .lineLimit(1...3).textInputAutocapitalization(.never).autocorrectionDisabled()
                                    .submitLabel(.go).focused($answerFocused).modifier(FieldStyle())
                                    .accessibilityLabel("Your answer")
                                    .accessibilityIdentifier("answerField")
                                    .onSubmit { submitAnswer() }
                                    .onChange(of: model.draft) { _, _ in model.saveDraft() }
                                if let error = model.error { Notice(message: error) }
                                if model.needsReconciliation || !model.sessionReady {
                                    Button { Task { await model.load() } } label: {
                                        HStack { if model.busy { ProgressView().tint(Theme.canvas) }; Text("Refresh progress"); Image(systemName: "arrow.clockwise") }
                                    }.buttonStyle(CommitStyle()).disabled(model.busy)
                                } else if !answerFocused {
                                    Button { submitAnswer() } label: {
                                        HStack { Text("Check answer"); if model.submitting { ProgressView().tint(Theme.canvas) } else { Image(systemName: "arrow.right") } }
                                    }.buttonStyle(CommitStyle()).disabled(model.submitting || model.busy).accessibilityIdentifier("checkAnswer")
                                }
                            }
                        }
                        if let review = model.game?.expiredReview, dismissedExpiredReviewID != review.puzzleId {
                            expiredReviewCard(review)
                        }
                    }.id("answerSection")
                }
            } else if model.busy {
                VStack(spacing: 16) { ProgressView(); Text("Finding today’s puzzle…").font(Theme.font(15)) }.frame(maxWidth: .infinity, minHeight: 280)
            } else {
                ContentUnavailableView("A puzzle worth waiting for", systemImage: "wifi.slash", description: Text(model.error ?? "Connect to load today’s puzzle."))
                Button("Try again") { Task { await model.load() } }.buttonStyle(CommitStyle())
            }
            if let error = model.storageError { Notice(message: error) }
        }
        .onChange(of: model.game?.attempts.count) { old, new in
            guard let old, let new, new > old else { return }
            let destination = model.game?.gameOver == true
                ? "dailyHeader"
                : model.game?.scoreLocked == true
                    ? "scoreLockCard"
                    : "answerSection"
            let anchor: UnitPoint = model.game?.gameOver == true || model.game?.scoreLocked == true
                ? .top
                : .bottom
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo(destination, anchor: anchor)
                }
            }
        }
        .onChange(of: model.nudgeReveals.count) { old, new in
            guard new > old else { return }
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo("answerSection", anchor: .bottom)
                }
            }
        }
        .onChange(of: model.game?.scoreLocked) { old, isLocked in
            guard old != true, isLocked == true else { return }
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo("scoreLockCard", anchor: .center)
                }
            }
        }
        }
        .navigationTitle("Rebuzzle").navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("How to play", systemImage: "questionmark.circle") {
                    quickStartUsesIntro = false
                    help = true
                }
            }
            ToolbarItemGroup(placement: .keyboard) {
                Button("Hide keyboard", systemImage: "keyboard.chevron.compact.down") {
                    dismissAnswerKeyboard(forceResign: true)
                }
                .accessibilityIdentifier("dismissAnswerKeyboard")
                Spacer()
                Button("Check answer", systemImage: "arrow.right") {
                    submitAnswer()
                }
                .disabled(model.submitting || model.busy || !model.sessionReady || model.needsReconciliation)
                .accessibilityIdentifier("checkAnswerFromKeyboard")
            }
        }
        .sheet(isPresented: $help, onDismiss: {
            hasSeenFirstSessionQuickStart = true
            quickStartUsesIntro = false
        }) {
            HelpView(firstSession: quickStartUsesIntro)
        }
        .sheet(item: $study) { selection in
            PuzzleStudyView(puzzle: selection.puzzle)
        }
        .refreshable { await model.load() }
        .onChange(of: model.daily?.puzzle.id) { _, _ in
            continuedScoreLockedPuzzleID = nil
            showingExpiredReviewFor = nil
            dismissedExpiredReviewID = nil
        }
        .task(id: model.daily?.puzzle.id) {
            guard model.daily != nil, !hasSeenFirstSessionQuickStart, !help else { return }
            quickStartUsesIntro = true
            help = true
        }
        .sensoryFeedback(.success, trigger: model.game?.wasSuccessful == true) { _, new in new && haptics }
        .sensoryFeedback(.selection, trigger: hintFeedback) { _, _ in haptics }
        .sensoryFeedback(.impact(weight: .light), trigger: model.game?.attempts.count) { old, new in
            guard let old, let new else { return false }
            return haptics && new > old && model.game?.attempts.last?.correct == false
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: model.game?.gameOver)
    }
    private func submitAnswer() {
        dismissAnswerKeyboard()
        Task { await model.submit() }
    }
    private func dismissAnswerKeyboard(forceResign: Bool = false) {
        let shouldResign = answerFocused || forceResign
        answerFocused = false
        guard shouldResign else { return }
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
    private var awaitingScoreLockDecision: Bool {
        guard let game = model.game else { return false }
        return game.scoreLocked == true && game.phase == "score_locked" && continuedScoreLockedPuzzleID != game.puzzleId
    }
    private var scoreLockCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "scope").font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.accent)
                VStack(alignment: .leading, spacing: 5) {
                    Text("Your scored round is complete.")
                        .font(Theme.font(15, weight: .semibold))
                        .accessibilityIdentifier("scoreLockedMessage")
                    Text("Your three scored guesses are saved. Take as long as you need to find the connection.")
                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            if let error = model.error { Notice(message: error) }
            if awaitingScoreLockDecision {
                HStack(spacing: 10) {
                    Button {
                        if let puzzleID = model.game?.puzzleId { continuedScoreLockedPuzzleID = puzzleID }
                        dismissAnswerKeyboard()
                    } label: {
                        Label("Keep solving", systemImage: "arrow.right")
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(CommitStyle())
                    .accessibilityIdentifier("continueSolving")
                    Button {
                        dismissAnswerKeyboard()
                        Task { await model.revealAnswer() }
                    } label: {
                        HStack(spacing: 6) {
                            if model.submitting { ProgressView().tint(Theme.ink) }
                            Text("Reveal")
                        }
                        .frame(minWidth: 82, minHeight: 44)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 12)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.secondary.opacity(0.25), lineWidth: 1))
                    .disabled(model.submitting || model.busy)
                    .accessibilityIdentifier("revealAnswer")
                }
            } else {
                HStack {
                    Text("Score locked · puzzle still open")
                        .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                    Spacer(minLength: 8)
                    Button("Reveal answer") { dismissAnswerKeyboard(); Task { await model.revealAnswer() } }
                        .font(Theme.font(12, weight: .semibold)).foregroundStyle(Theme.accent)
                        .disabled(model.submitting || model.busy)
                        .accessibilityIdentifier("revealAnswer")
                }
            }
        }
        .padding(14)
        .background(Theme.field, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.accent.opacity(0.28), lineWidth: 1))
    }
    private func expiredReviewCard(_ review: ExpiredDailyReview) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "clock.arrow.circlepath").foregroundStyle(Theme.accent)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Yesterday’s puzzle")
                        .font(Theme.font(14, weight: .semibold))
                    Text("Your new daily is ready. Review the connection from yesterday whenever you like.")
                        .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Button {
                    dismissedExpiredReviewID = review.puzzleId
                    showingExpiredReviewFor = nil
                } label: {
                    Image(systemName: "xmark.circle.fill").font(.system(size: 18)).foregroundStyle(Theme.secondary)
                }
                .accessibilityLabel("Dismiss yesterday’s puzzle review")
                .accessibilityIdentifier("dismissExpiredReview")
            }
            if showingExpiredReviewFor == review.puzzleId {
                Text(review.answer)
                    .font(Theme.display(24)).tracking(-0.5)
                    .accessibilityIdentifier("expiredReviewAnswer")
                if !review.explanation.isEmpty {
                    Text(review.explanation).font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
            } else {
                Button("Review yesterday’s answer") {
                    showingExpiredReviewFor = review.puzzleId
                }
                .font(Theme.font(13, weight: .semibold)).foregroundStyle(Theme.accent)
                .accessibilityIdentifier("reviewExpiredAnswer")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.field, in: RoundedRectangle(cornerRadius: 16))
    }
    private var conversation: some View {
        VStack(alignment: .leading, spacing: 24) {
            ForEach(DailyConversationTimeline.entries(attempts: model.game?.attempts ?? [], reveals: model.nudgeReveals)) { entry in
                switch entry {
                case .guess(let guess):
                    GuessTurnView(guess: guess, reply: model.eve.replies[guess.attemptNumber],
                                  pending: model.eve.pendingAttempts.contains(guess.attemptNumber),
                                  failed: model.eve.failedAttempts.contains(guess.attemptNumber),
                                  canRetry: !model.eve.pendingAttempts.contains(guess.attemptNumber),
                                  latest: guess.id == model.game?.attempts.last?.id,
                                  onRetry: { _ = model.eve.retry(guess: guess) })
                        .id("turn-\(guess.attemptNumber)")
                case .nudge(let reveal):
                    if let daily = model.daily, daily.puzzle.hints.indices.contains(reveal.hintIndex) {
                        EveNudgeTurnView(number: reveal.hintIndex + 1, hint: daily.puzzle.hints[reveal.hintIndex])
                            .id("eveNudge-\(reveal.hintIndex + 1)")
                    }
                }
            }
        }
    }
    private var dateLabel: String {
        guard let date = model.daily?.puzzleDate else { return Date().formatted(.dateTime.weekday(.wide).month(.wide).day()) }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let parsed = formatter.date(from: date) else { return date }
        return parsed.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }
    private var attemptHeader: some View {
        let attempts = model.game?.attempts ?? []
        let maximum = model.game?.maxAttempts ?? 3
        let remaining = model.game?.attemptsLeft ?? maximum
        let progressValue = model.game?.scoreLocked == true
            ? "Your score is saved. Keep solving."
            : "\(remaining) \(remaining == 1 ? "guess" : "guesses") remaining"
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            HStack(spacing: 8) {
                ForEach(0..<maximum, id: \.self) { index in
                    let submitted = index < attempts.count
                    let active = index == attempts.count
                    let correct = submitted && attempts[index].correct
                    let resultColor = correct ? Theme.success : Theme.error
                    ZStack {
                        Circle().fill(active ? Theme.accent : submitted ? resultColor.opacity(0.13) : Theme.field)
                        Circle().strokeBorder(active ? Theme.accent : submitted ? resultColor.opacity(0.48) : Theme.secondary.opacity(0.25), lineWidth: 1)
                        if submitted {
                            Image(systemName: correct ? "checkmark" : "xmark")
                                .font(.system(size: 15, weight: .bold))
                                .transition(reduceMotion ? .opacity : .scale(scale: 0.55).combined(with: .opacity))
                        } else {
                            Text("\(index + 1)").font(Theme.display(18)).monospacedDigit()
                        }
                    }
                    .foregroundStyle(submitted ? resultColor : active ? Color.white : Theme.secondary)
                    .frame(width: 40, height: 40)
                    .shadow(color: active ? Theme.accent.opacity(0.20) : .clear, radius: 0, x: 0, y: 3)
                    .animation(reduceMotion ? nil : .spring(response: 0.38, dampingFraction: 0.64), value: model.game?.attempts.count)
                }
            }.accessibilityHidden(true)
            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 3) {
                Text(model.game?.scoreLocked == true ? "Take your time" : "Your move")
                    .font(Theme.font(14, weight: .semibold))
                Text(model.game?.scoreLocked == true ? "Your score is saved" : "\(remaining) \(remaining == 1 ? "guess" : "guesses") remaining")
                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("dailyGuessProgress")
        .accessibilityLabel("Guess progress")
        .accessibilityValue(progressValue)
    }
    private var nudgeButtonCopy: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Theme.accent)
                .frame(width: 38, height: 38)
                .background(Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 3) {
                Text("Ask Eve for a nudge")
                    .font(Theme.font(14, weight: .semibold))
                    .fixedSize(horizontal: false, vertical: true)
                Text("A hint appears in your conversation")
                    .font(Theme.font(12))
                    .foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
private struct PuzzleStudy: Identifiable {
    let id = UUID()
    let puzzle: Puzzle
}

private struct PuzzleStudyView: View {
    @Environment(\.dismiss) private var dismiss
    let puzzle: Puzzle

    var body: some View {
        NavigationStack {
            Page {
                Text("Take your time. Your guesses stay here.")
                    .font(Theme.font(16)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                PuzzleBoard(puzzle: puzzle)
                    .padding(16)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.secondary.opacity(0.20), lineWidth: 1))
            }
            .navigationTitle("Study puzzle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close", systemImage: "xmark") { dismiss() }
                        .accessibilityIdentifier("closeStudyPuzzle")
                }
            }
        }
    }
}

struct PuzzleBoard: View {
    let clue: String
    let visual: PuzzleVisual?
    init(puzzle: Puzzle) { self.clue = puzzle.clue; self.visual = puzzle.visual }
    init(clue: String, visual: PuzzleVisual?) { self.clue = clue; self.visual = visual }
    var body: some View {
        Group {
            if let canonical = visual?.canonicalBoard {
                CanonicalBoardView(board: canonical, clue: clue)
            } else {
                Group {
                    if let visual, visual.mode != "unicode", let layers = visual.layers, !layers.isEmpty {
                        VisualBoard(visual: visual, layers: layers)
                    } else {
                        Text(clue).font(Theme.font(clue.count > 40 ? 26 : 44, weight: .medium, relativeTo: .largeTitle))
                            .multilineTextAlignment(.center).lineSpacing(12).textSelection(.enabled)
                            .frame(maxWidth: .infinity, minHeight: 190).padding(.vertical, 12)
                    }
                }.accessibilityLabel("Puzzle: \(clue)")
            }
        }
    }
}
struct ResultView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    @Binding var shareRequest: DailyResultShareRequest?
    @State private var renderedShareSummary: DailyShareSummary?
    @State private var renderedSharePNG: Data?
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
                                .background(guess?.correct == true ? Theme.success : Theme.field, in: RoundedRectangle(cornerRadius: 8))
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
                .padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(game.wasSuccessful == true ? Theme.reward.opacity(0.40) : Theme.secondary.opacity(0.20), lineWidth: 1))
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

private struct DailyQualityPulse: View {
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
                        .background(isSelected ? Theme.ink : Theme.field, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.secondary.opacity(isSelected ? 0.35 : 0.16), lineWidth: 1))
                        .contentShape(RoundedRectangle(cornerRadius: 12))
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
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Theme.secondary.opacity(0.18), lineWidth: 1))
    }
}

private extension DailyQualityRating {
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

struct HelpView: View {
    @Environment(\.dismiss) private var dismiss
    let firstSession: Bool

    init(firstSession: Bool = false) {
        self.firstSession = firstSession
    }

    var body: some View {
        NavigationStack {
            Page {
                if firstSession {
                    Text("Make it click.").font(Theme.font(30, weight: .medium))
                    Text("Pictures, words, and patterns can combine to make a familiar word or phrase.")
                        .font(Theme.font(17)).fixedSize(horizontal: false, vertical: true)
                    VStack(spacing: 12) {
                        Eyebrow(text: "EXAMPLE")
                        Text("☀️ + 🌼").font(.system(size: 42)).accessibilityLabel("Sun plus flower")
                        Text("Sun + flower = sunflower").font(Theme.font(16, weight: .medium))
                    }
                    .frame(maxWidth: .infinity).padding(20)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                    Text("Three scored guesses. Then keep solving until it clicks.")
                        .font(Theme.font(16, weight: .medium)).fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("Small puzzle. Big aha.").font(Theme.font(30, weight: .medium))
                    Text("A few clues. One hidden connection. Read the pictures, words or patterns, then try the word or phrase that clicks.").font(Theme.font(17))
                    VStack(spacing: 12) {
                        Eyebrow(text: "EXAMPLE")
                        Text("☀️ + 🌼").font(.system(size: 42)).accessibilityLabel("Sun plus flower")
                        Text("Sun + flower = sunflower").font(Theme.font(16, weight: .medium))
                        Text("That’s the aha. Today’s connection is yours to find.").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                    }.frame(maxWidth: .infinity).padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                    VStack(alignment: .leading, spacing: 24) {
                        Label("Three scored guesses. Then keep solving.", systemImage: "circle.grid.3x1")
                        Label("Eve reacts to each guess. Hints offer a nudge.", systemImage: "sparkles")
                        Label("A new puzzle at your local midnight.", systemImage: "sunrise")
                        Label("Earn XP, collect badges, challenge a friend.", systemImage: "star")
                    }.font(Theme.font(16))
                    Text("Daily play is free. Plus adds a personal journal and deeper insights, never an advantage.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                    Button("Let’s play") { dismiss() }.buttonStyle(CommitStyle())
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if firstSession {
                    Button { dismiss() } label: {
                        Label("Let’s play", systemImage: "arrow.right")
                    }
                    .buttonStyle(CommitStyle())
                    .accessibilityLabel("Let’s play")
                    .accessibilityIdentifier("quickStartStartPlaying")
                    .padding(.horizontal, 24)
                    .padding(.top, 12)
                    .padding(.bottom, 10)
                    .background(Theme.canvas)
                }
            }
            .navigationTitle(firstSession ? "Your first puzzle" : "How to play")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close", systemImage: "xmark") { dismiss() }
                        .accessibilityIdentifier(firstSession ? "quickStartClose" : "closeHelp")
                }
            }
        }
    }
}

/// Conversation uses confirmed guesses and server feedback, never the hidden answer.
struct GuessTurnView: View {
    let guess: Guess
    let reply: String?
    let pending: Bool
    let failed: Bool
    let canRetry: Bool
    let latest: Bool
    let onRetry: () -> Void
    private var title: String {
        switch guess.reaction?.tier {
        case "correct": "Connection made"
        case "out": "The final reveal"
        case "close": "You’re close."
        case "warm": "A promising direction."
        case "cold": "Try another angle."
        default: "Keep looking."
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .trailing, spacing: 6) {
                Text("YOU · GUESS \(guess.attemptNumber)")
                    .font(Theme.font(10, weight: .semibold)).tracking(1).foregroundStyle(Theme.secondary)
                Text(guess.guess).font(Theme.font(17, weight: .medium)).textSelection(.enabled)
                    .padding(.horizontal, 16).padding(.vertical, 12)
                    .background(Theme.field, in: RoundedRectangle(cornerRadius: 16))
            }.frame(maxWidth: .infinity, alignment: .trailing).padding(.leading, 28)
            HStack(alignment: .top, spacing: 10) {
                EveAvatar(celebrating: guess.correct).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 10) {
                    Text("Eve · AI puzzle author")
                        .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: 10) {
                        Text(title).font(Theme.display(20))
                            .accessibilityIdentifier(latest ? "guessFeedback" : "guessFeedback-\(guess.id)")
                        if let reaction = guess.reaction {
                            Text(reaction.line).font(Theme.font(15)).foregroundStyle(Theme.secondary)
                        }
                        if let reply, !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            Text(reply).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                                .accessibilityIdentifier("eveReply-\(guess.id)")
                        }
                        if pending {
                            HStack(spacing: 8) {
                                ProgressView().controlSize(.mini)
                                Text("Eve is thinking…").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            }.accessibilityLabel("Eve is thinking")
                        } else if failed {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Eve couldn't reply just now. Your guess is saved.")
                                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .accessibilityIdentifier("eveReplyFailure-\(guess.id)")
                                if canRetry {
                                    Button(action: onRetry) {
                                        Label("Ask Eve again", systemImage: "arrow.clockwise")
                                            .font(Theme.font(13, weight: .semibold))
                                            .frame(minHeight: 44, alignment: .leading)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain).foregroundStyle(Theme.accent)
                                    .accessibilityLabel("Ask Eve to retry the reply for guess \(guess.attemptNumber)")
                                    .accessibilityIdentifier("retryEveReply-\(guess.id)")
                                }
                            }
                        }
                        if let words = guess.wordResults, words.count > 1,
                           words.contains(where: { $0.correct || ($0.similarity ?? 0) >= 70 }) {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), alignment: .leading)], alignment: .leading, spacing: 8) {
                                ForEach(Array(words.enumerated()), id: \.offset) { _, word in
                                    let near = !word.correct && (word.similarity ?? 0) >= 70
                                    Label(word.word, systemImage: word.correct ? "checkmark" : near ? "approximate" : "minus")
                                        .font(Theme.font(13, weight: .medium))
                                        .foregroundStyle(word.correct ? Theme.success : Theme.secondary)
                                        .padding(8).background(Theme.field, in: RoundedRectangle(cornerRadius: 6))
                                        .accessibilityLabel("\(word.word), \(word.correct ? "exact match" : near ? "near match" : "not matched")")
                                }
                            }
                            Text("✓ Exact match   ≈ Near match").font(Theme.font(11)).foregroundStyle(Theme.secondary)
                        }
                    }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.12), lineWidth: 1))
                }
            }
        }.accessibilityElement(children: .contain)
    }
}

private struct EveNudgeTurnView: View {
    let number: Int
    let hint: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            EveAvatar().accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 10) {
                Text("Eve · A nudge")
                    .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                VStack(alignment: .leading, spacing: 8) {
                    Eyebrow(text: "NUDGE \(number)")
                    Text(hint).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("eveNudge-\(number)")
                }
                .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.12), lineWidth: 1))
            }
        }
        .accessibilityElement(children: .contain)
    }
}

struct EveAvatar: View {
    var celebrating = false
    var body: some View {
        Image(systemName: "face.smiling.inverse")
            .font(.system(size: 30, weight: .regular))
            .foregroundStyle(celebrating ? Theme.reward : Theme.accent)
            .frame(width: 38, height: 38)
            .background(celebrating ? Theme.reward.opacity(0.12) : Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 13))
            .rotationEffect(.degrees(celebrating ? -8 : 0))
            .accessibilityLabel("Eve")
    }
}
