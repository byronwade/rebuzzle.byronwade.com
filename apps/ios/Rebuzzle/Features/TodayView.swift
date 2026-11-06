import SwiftUI
import RebuzzleCore

struct TodayView: View {
    @Environment(AppModel.self) private var model
    var onOpenMenu: () -> Void = {}
    @AppStorage("haptics") private var haptics = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var help = false
    @State private var showWarmup = false
    @State private var showWarmupAfterHelp = false
    @State private var study: PuzzleStudy?
    @State private var hintFeedback = 0
    @State private var isFollowingLatestTurn = true
    @State private var unseenFeedbackAttempt: Int?
    @FocusState private var answerFocused: Bool
    var body: some View {
        @Bindable var model = model
        ScrollViewReader { scroll in
        Page(spacing: 16, onNearBottomChange: { isNearBottom in
            isFollowingLatestTurn = isNearBottom
            if isNearBottom { unseenFeedbackAttempt = nil }
        }, scrollTrackingReady: model.daily != nil) {
            if let daily = model.daily {
                if typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(alignment: .center, spacing: 12) {
                            dateHeading
                            Spacer(minLength: 8)
                            if model.game?.gameOver == true { completedRoundLabel }
                        }
                        if model.game?.gameOver != true,
                           let summary = completeJourneySummary {
                            ActiveJourneyProgress(progress: JourneyProgress(summary: summary))
                        }
                    }
                    .id("dailyHeader")
                } else {
                    ViewThatFits(in: .horizontal) {
                        HStack(alignment: .center, spacing: 8) {
                            dateHeading
                            Spacer(minLength: 0)
                            if model.game?.gameOver == true {
                                completedRoundLabel
                            } else if let summary = completeJourneySummary {
                                ActiveJourneyProgress(
                                    progress: JourneyProgress(summary: summary),
                                    compact: true
                                )
                            }
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            dateHeading
                            if model.game?.gameOver == true {
                                completedRoundLabel
                            } else if let summary = completeJourneySummary {
                                ActiveJourneyProgress(
                                    progress: JourneyProgress(summary: summary),
                                    compact: true
                                )
                            }
                        }
                    }
                    .id("dailyHeader")
                }
                if model.game?.gameOver == true {
                    DailyPuzzleTicker(
                        resetAt: DailyReturnTiming.deadline(daily.nextPuzzleTime),
                        roundComplete: true
                    )
                    ResultView()
                        .transition(.opacity)
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        VStack(spacing: 0) {
                            let stageHeader = typeSize.isAccessibilitySize
                                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                                : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
                            stageHeader {
                                Text(daily.puzzle.typeName)
                                    .font(Theme.font(13, weight: .semibold))
                                if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                                PuzzleDifficultyBadge(difficulty: daily.puzzle.difficulty)
                                Button {
                                    answerFocused = false
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
                        .background(Theme.field, in: RoundedRectangle(cornerRadius: 20))
                        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
                        .environment(\.colorScheme, .dark)
                        DailyPuzzleTicker(
                            resetAt: DailyReturnTiming.deadline(daily.nextPuzzleTime),
                            roundComplete: false
                        )
                        .padding(.leading, model.sessionReady && !typeSize.isAccessibilitySize ? 48 : 0)
                    }
                    VStack(alignment: .leading, spacing: 14) {
                        attemptHeader
                        if model.game?.attempts.isEmpty == true && model.sessionReady {
                            roundGuide
                        }
                        if model.game?.attempts.isEmpty == false || !model.hintReveals.isEmpty { conversation }
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
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if model.daily != nil && model.game?.gameOver != true {
                VStack(spacing: 0) {
                    if let unseenAttempt = unseenFeedbackAttempt {
                        Button {
                            isFollowingLatestTurn = true
                            unseenFeedbackAttempt = nil
                            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                                scroll.scrollTo("turn-\(unseenAttempt)", anchor: .bottom)
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.down.circle.fill")
                                    .accessibilityHidden(true)
                                Text("New feedback")
                                Spacer(minLength: 8)
                                Image(systemName: "arrow.down")
                                    .font(.system(size: 12, weight: .semibold))
                                    .accessibilityHidden(true)
                            }
                            .font(Theme.font(13, weight: .semibold))
                            .foregroundStyle(Theme.accent)
                            .padding(.horizontal, 16)
                            .frame(minHeight: 44)
                            .background(Theme.accent.opacity(0.08), in: Capsule())
                            .contentShape(Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Jump to new feedback, guess \(unseenAttempt)")
                        .accessibilityIdentifier("newFeedbackButton")
                        .frame(maxWidth: 552)
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                        .padding(.bottom, 2)
                        .frame(maxWidth: .infinity)
                        .transition(reduceMotion ? .identity : .move(edge: .bottom).combined(with: .opacity))
                    }
                    let availableHints = max(0, (model.daily?.puzzle.hints.count ?? 0) - model.hintsShown)
                    let noHints = model.daily?.puzzle.hints.isEmpty ?? true
                    GuessComposer(
                        text: $model.draft,
                        isFocused: $answerFocused,
                        fieldAccessibilityIdentifier: "answerField",
                        submitAccessibilityIdentifier: "checkAnswer",
                        error: model.error,
                        isFieldDisabled: model.submitting || model.busy || !model.sessionReady || model.needsReconciliation,
                        isSubmitting: model.submitting,
                        isSubmitDisabled: model.submitting || model.busy || !model.sessionReady || model.needsReconciliation,
                        recoveryAction: model.needsReconciliation || !model.sessionReady
                            ? GuessComposer.RecoveryAction(
                                title: model.busy
                                    ? (model.needsReconciliation ? "Syncing progress…" : "Loading your game…")
                                    : "Refresh progress",
                                symbol: "arrow.clockwise",
                                accessibilityIdentifier: "refreshProgress",
                                isLoading: model.busy,
                                isDisabled: model.busy,
                                action: { Task { await model.load() } }
                            )
                            : nil,
                        hintAction: GuessComposer.HintAction(
                            title: availableHints > 0 ? "Nudge" : noHints ? "No hints" : "All used",
                            detail: availableHints > 0 ? "\(availableHints) left" : nil,
                            symbol: availableHints > 0 ? "lightbulb" : noHints ? "lightbulb.slash" : "checkmark",
                            accessibilityLabel: availableHints > 0
                                ? "Reveal hint \(model.hintsShown + 1), \(availableHints) remaining"
                                : noHints ? "No hints are available for this puzzle" : "All hints have been revealed",
                            accessibilityHint: "Reveals the next clue without using a guess.",
                            accessibilityIdentifier: "dailyHintComposer",
                            isDisabled: availableHints == 0 || model.submitting || model.busy || !model.sessionReady || model.needsReconciliation,
                            action: {
                                let previous = model.hintsShown
                                model.revealHint()
                                if model.hintsShown > previous { hintFeedback += 1 }
                            }
                        ),
                        onDraftChange: { model.saveDraft() },
                        onSubmit: submitAnswer
                    )
                }
            }
        }
        .onChange(of: model.game?.attempts.count) { old, new in
            guard let old, let new, new > old else { return }
            let latestAttempt = model.game?.attempts.last?.attemptNumber ?? new
            let shouldFollowLatestTurn = isFollowingLatestTurn || old == 0
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                if model.game?.gameOver == true {
                    unseenFeedbackAttempt = nil
                    scroll.scrollTo("dailyHeader", anchor: .top)
                } else if shouldFollowLatestTurn {
                    isFollowingLatestTurn = true
                    unseenFeedbackAttempt = nil
                    scroll.scrollTo("turn-\(latestAttempt)", anchor: .bottom)
                } else {
                    unseenFeedbackAttempt = latestAttempt
                }
            }
        }
        .onChange(of: model.eve.replies) { oldReplies, newReplies in
            guard isFollowingLatestTurn,
                  let latestAttempt = model.game?.attempts.last?.attemptNumber,
                  oldReplies[latestAttempt] != newReplies[latestAttempt] else { return }
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                scroll.scrollTo("turn-\(latestAttempt)", anchor: .bottom)
            }
        }
        .onChange(of: model.eve.unavailableAttempts) { oldAttempts, newAttempts in
            guard isFollowingLatestTurn, oldAttempts != newAttempts,
                  let latestAttempt = model.game?.attempts.last?.attemptNumber else { return }
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                scroll.scrollTo("turn-\(latestAttempt)", anchor: .bottom)
            }
        }
        .onChange(of: model.eve.interruptedAttempts) { oldAttempts, newAttempts in
            guard isFollowingLatestTurn, oldAttempts != newAttempts,
                  let latestAttempt = model.game?.attempts.last?.attemptNumber else { return }
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                scroll.scrollTo("turn-\(latestAttempt)", anchor: .bottom)
            }
        }
        .onChange(of: model.hintsShown) { oldCount, newCount in
            guard newCount > oldCount,
                  let latestHint = model.hintReveals.last?.hintIndex else { return }
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                scroll.scrollTo("hint-\(latestHint)", anchor: .bottom)
            }
        }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            AppScreenHeader(
                title: "Daily",
                onOpenMenu: {
                    answerFocused = false
                    onOpenMenu()
                },
                subtitle: "Today's challenge",
                trailingTitle: "How to play",
                trailingSymbol: "questionmark",
                trailingAction: { help = true }
            )
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(model.game?.gameOver == true ? .visible : .hidden, for: .tabBar)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Button("Hide keyboard", systemImage: "keyboard.chevron.compact.down") {
                    answerFocused = false
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
            guard showWarmupAfterHelp else { return }
            showWarmupAfterHelp = false
            showWarmup = true
        }) {
            HelpView {
                showWarmupAfterHelp = true
                help = false
            }
        }
        .sheet(item: $study) { selection in
            PuzzleStudyView(puzzle: selection.puzzle)
        }
        .fullScreenCover(isPresented: $showWarmup) {
            FirstRunTutorialView {
                showWarmup = false
            }
            .interactiveDismissDisabled()
        }
        .refreshable { await model.load() }
        .sensoryFeedback(.success, trigger: model.game?.wasSuccessful == true) { _, new in new && haptics }
        .sensoryFeedback(.selection, trigger: hintFeedback) { _, _ in haptics }
        .sensoryFeedback(.impact(weight: .light), trigger: model.game?.attempts.count) { old, new in
            guard let old, let new else { return false }
            return haptics && new > old && model.game?.attempts.last?.correct == false
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.24), value: model.game?.gameOver)
    }
    private func submitAnswer() {
        let keyboardWasOpen = answerFocused
        Task {
            await model.submit()
            guard model.game?.gameOver != true,
                  !model.needsReconciliation,
                  model.sessionReady,
                  !model.busy else {
                answerFocused = false
                return
            }
            answerFocused = keyboardWasOpen
        }
    }
    private var conversation: some View {
        GuessConversationView(
            attempts: model.game?.attempts ?? [],
            hintTexts: model.daily?.puzzle.hints ?? [],
            hintReveals: model.hintReveals,
            replies: model.eve.replies,
            pendingAttempt: model.eve.pendingAttempt,
            unavailableAttempts: model.eve.unavailableAttempts,
            interruptedAttempts: model.eve.interruptedAttempts
        )
    }

    private var roundGuide: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Theme.accent.opacity(0.10))
                    .frame(width: 40, height: 40)
                Image(systemName: "quote.bubble.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Theme.accent)
            }
            VStack(alignment: .leading, spacing: 5) {
                Text("ROUND RULES")
                    .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                    .tracking(0.8)
                    .foregroundStyle(Theme.secondary)
                Text("Three guesses. Hints don’t use a try. Eve gives feedback after each guess.")
                    .font(Theme.font(14, weight: .medium))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.13), lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("dailyRoundGuide")
    }
    private var dateLabel: String {
        guard let date = model.daily?.puzzleDate else { return Date().formatted(.dateTime.weekday(.wide).month(.wide).day()) }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        guard let parsed = formatter.date(from: date) else { return date }
        return parsed.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }
    private var completeJourneySummary: JourneyProgressSummary? {
        guard let snapshot = model.journeySnapshot,
              snapshot.backfill.status == .complete else { return nil }
        return snapshot.summary
    }
    private var dateHeading: some View {
        Text(dateLabel)
            .font(Theme.font(15, weight: .medium))
            .foregroundStyle(Theme.secondary)
            .accessibilityAddTraits(.isHeader)
    }
    private var completedRoundLabel: some View {
        Label("ROUND COMPLETE", systemImage: model.game?.wasSuccessful == true ? "checkmark.seal.fill" : "sparkles")
            .font(Theme.font(10, weight: .bold)).tracking(0.45)
            .foregroundStyle(model.game?.wasSuccessful == true ? Theme.success : Theme.reward)
    }
    private var attemptHeader: some View {
        let attempts = model.game?.attempts ?? []
        let maximum = model.game?.maxAttempts ?? 3
        let remaining = model.game?.attemptsLeft ?? maximum
        let stepDiameter: CGFloat = typeSize.isAccessibilitySize ? 48 : 32
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            HStack(spacing: 0) {
                ForEach(0..<maximum, id: \.self) { index in
                    let submitted = index < attempts.count
                    let active = index == attempts.count
                    let guess = submitted ? attempts[index] : nil
                    let feedback = GuessFeedbackPresentation(tier: guess?.correct == true ? "correct" : guess?.reaction?.tier)
                    let fill = active ? Theme.accent : submitted ? feedback.tint.opacity(feedback.isNeutral ? 0.08 : 0.12) : Theme.field
                    let stroke = active ? Theme.accent : submitted ? feedback.tint.opacity(feedback.isNeutral ? 0.24 : 0.42) : Theme.secondary.opacity(0.25)
                    ZStack {
                        Circle().fill(fill)
                        Circle().strokeBorder(stroke, lineWidth: 1)
                        Text("\(index + 1)")
                            .font(Theme.display(18, relativeTo: .caption)).monospacedDigit()
                            .foregroundStyle(active ? Color.white : submitted ? feedback.tint : Theme.secondary)
                    }
                    .frame(width: stepDiameter, height: stepDiameter)
                    .scaleEffect(active && !reduceMotion ? 1.05 : 1)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(submitted
                        ? "Guess \(index + 1), \(feedback.accessibilityLabel)"
                        : active ? "Guess \(index + 1), your next guess" : "Guess \(index + 1), not played yet")
                    .accessibilityIdentifier("guessStep.\(index + 1)")
                    if index < maximum - 1 {
                        Capsule()
                            .fill(index < attempts.count ? Theme.accent.opacity(0.48) : Theme.secondary.opacity(0.22))
                            .frame(width: typeSize.isAccessibilitySize ? 16 : 11, height: 2)
                            .accessibilityHidden(true)
                    }
                }
            }
            .animation(reduceMotion ? nil : .spring(duration: 0.24, bounce: 0.14), value: attempts.count)
            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            Text("\(remaining) \(remaining == 1 ? "guess" : "guesses") left")
                .font(Theme.font(typeSize.isAccessibilitySize ? 15 : 12, weight: .semibold))
                .foregroundStyle(Theme.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }
}

private struct EveOpeningMessage: View {
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            EveAvatar(celebrating: false).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text("Eve").font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                Text("Today’s clues are ready. What phrase do you see?")
                    .font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.trailing, 22)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("eveOpeningMessage")
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
    var compactForReveal = false
    init(puzzle: Puzzle, compactForReveal: Bool = false) {
        self.clue = puzzle.clue
        self.visual = puzzle.visual
        self.compactForReveal = compactForReveal
    }
    init(clue: String, visual: PuzzleVisual?, compactForReveal: Bool = false) {
        self.clue = clue
        self.visual = visual
        self.compactForReveal = compactForReveal
    }
    var body: some View {
        Group {
            if let canonical = visual?.canonicalBoard {
                CanonicalBoardView(board: canonical, clue: clue)
            } else {
                Group {
                    if let visual, visual.mode != "unicode", let layers = visual.layers, !layers.isEmpty {
                        VisualBoard(visual: visual, layers: layers, compactForReveal: compactForReveal)
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

struct PuzzleDifficultyBadge: View {
    let difficulty: Int

    var body: some View {
        Text("DIFFICULTY \(difficulty) / 10")
            .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
            .tracking(0.35)
            .monospacedDigit()
            .foregroundStyle(Theme.secondary)
            .padding(.horizontal, 10)
            .frame(minHeight: 28)
            .background(Theme.field.opacity(0.8), in: Capsule())
            .accessibilityLabel("Puzzle difficulty \(difficulty) out of 10")
    }
}

struct ResultView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shareArtifact: DailyResultShareArtifact?
    @State private var revealStep: RevealStep = .board

    private enum RevealStep: Int {
        case board
        case answer
        case explanation
    }

    private var showsAnswer: Bool {
        reduceMotion || revealStep.rawValue >= RevealStep.answer.rawValue
    }

    private var showsExplanation: Bool {
        reduceMotion || revealStep == .explanation
    }

    var body: some View {
        if let game = model.game {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 16) {
                    Text(game.wasSuccessful == true ? "Aha!" : "The reveal.")
                        .font(Theme.display(game.wasSuccessful == true ? 44 : 40)).tracking(-1.2)
                        .foregroundStyle(game.wasSuccessful == true ? Theme.reward : Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Label(game.wasSuccessful == true ? "You found it." : "Here’s the connection.", systemImage: game.wasSuccessful == true ? "checkmark.seal.fill" : "eye")
                        .font(Theme.font(14, weight: .medium)).foregroundStyle(game.wasSuccessful == true ? Theme.reward : Theme.secondary)
                    if let puzzle = model.daily?.puzzle {
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow(text: "THE CLUE")
                            PuzzleBoard(puzzle: puzzle, compactForReveal: !typeSize.isAccessibilitySize)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, typeSize.isAccessibilitySize ? 8 : 2)
                        }
                    }
                    if showsAnswer {
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow(text: "THE CONNECTION")
                            Text(game.revealedAnswer ?? "Puzzle complete")
                                .font(Theme.display(32)).tracking(-0.8).textSelection(.enabled)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .transition(reduceMotion
                            ? .identity
                            : .opacity.combined(with: .scale(scale: 0.96, anchor: .leading))
                        )
                    } else {
                        Label("One last look…", systemImage: "sparkles")
                            .font(Theme.font(14, weight: .medium))
                            .foregroundStyle(Theme.secondary)
                            .frame(minHeight: 44, alignment: .leading)
                            .accessibilityHidden(true)
                            .transition(.opacity)
                    }
                    if showsAnswer {
                        Rectangle()
                            .fill(Theme.secondary.opacity(0.16))
                            .frame(height: 1)
                            .padding(.top, 4)
                        Eyebrow(text: "YOUR REWARD")
                        DailyRewardSummary(game: game)
                            .id(game.puzzleId)
                            .transition(reduceMotion ? .identity : .opacity.combined(with: .offset(y: 6)))
                    }
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
                    .accessibilityLabel("\(game.attempts.count) of \(game.maxAttempts) guesses, \(game.wasSuccessful == true ? "solved" : "answer revealed")")
                    if showsExplanation, let explanation = game.explanation, !explanation.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow(text: "WHY IT CLICKS")
                            Text(explanation)
                                .font(Theme.font(16)).foregroundStyle(Theme.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .transition(reduceMotion
                            ? .identity
                            : .opacity.combined(with: .offset(y: 4))
                        )
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(game.wasSuccessful == true ? Theme.reward.opacity(0.40) : Theme.secondary.opacity(0.20), lineWidth: 1))
                if !game.attempts.isEmpty || !model.hintReveals.isEmpty {
                    GuessConversationView(
                        attempts: game.attempts,
                        hintTexts: model.daily?.puzzle.hints ?? [],
                        hintReveals: model.hintReveals,
                        replies: model.eve.replies,
                        pendingAttempt: model.eve.pendingAttempt,
                        unavailableAttempts: model.eve.unavailableAttempts,
                        interruptedAttempts: model.eve.interruptedAttempts,
                        sectionTitle: "EVE’S DEBRIEF"
                    )
                    .accessibilityIdentifier("postgameDebrief")
                }
                VStack(alignment: .leading, spacing: 12) {
                    Eyebrow(text: "YOUR JOURNEY")
                    JourneyProgressUpdate(game: game).id(game.puzzleId)
                }
                .padding(20)
                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(Theme.reward.opacity(0.22), lineWidth: 1))
                DailyReturnCard()
                DailyStreakCard(presentation: model.streakPresentation(for: game), context: .result)
                shareInvite(for: game)
                let metrics = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 20)) : AnyLayout(HStackLayout(spacing: 32))
                metrics {
                    resultMetric("\(game.attempts.count)/\(game.maxAttempts)", "Guesses")
                    resultMetric("\(model.hintsShown)", "Hints")
                    resultMetric("\(model.journal.entries.count)", "Days played here")
                }
                DailyQualityPulse { rating in
                    model.recordGrowthEvent(.dailyQualityFeedback(rating))
                }
                if model.journal.entries.contains(where: { $0.id == game.puzzleId }) {
                    NavigationLink { JournalView() } label: {
                        Label(model.purchases.hasPlus ? "Add a thought to your journal" : "Keep this connection", systemImage: "book.closed")
                    }.font(Theme.font(14)).frame(minHeight: 44).accessibilityIdentifier("keepConnection")
                }
            }
            .task(id: game.shareSummary) {
                shareArtifact = DailyResultShareCardRenderer.render(summary: game.shareSummary)
            }
            .task(id: game.puzzleId) {
                await playReveal()
            }
        }
    }

    private func playReveal() async {
        revealStep = .board
        guard !reduceMotion else { return }
        do {
            try await Task.sleep(for: .milliseconds(360))
            guard !Task.isCancelled else { return }
            withAnimation(.spring(response: 0.42, dampingFraction: 0.76)) {
                revealStep = .answer
            }
            guard model.game?.explanation?.isEmpty == false else { return }
            try await Task.sleep(for: .milliseconds(220))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.26)) {
                revealStep = .explanation
            }
        } catch {
            return
        }
    }

    @ViewBuilder private func shareInvite(for game: GameSession) -> some View {
        if let shareArtifact, shareArtifact.matches(game.shareSummary) {
            ShareLink(
                item: shareArtifact.payload,
                preview: SharePreview(shareArtifact.previewTitle, image: Image(uiImage: shareArtifact.previewImage))
            ) {
                shareInviteLabel
            }
            .buttonStyle(CommitStyle())
            .accessibilityIdentifier("shareDailyResult")
            .accessibilityLabel("Challenge a friend with today's result")
            .accessibilityHint("Shares a spoiler-free Rebuzzle card and invitation.")
        } else {
            ShareLink(item: game.shareText) {
                shareInviteLabel
            }
            .buttonStyle(CommitStyle())
            .accessibilityIdentifier("shareDailyResult")
            .accessibilityLabel("Challenge a friend with today's result")
            .accessibilityHint("Shares a spoiler-free Rebuzzle result and invitation.")
        }
    }

    private var shareInviteLabel: some View {
        HStack(spacing: 10) {
            Image(systemName: "person.2.fill")
                .font(.system(size: 16, weight: .semibold))
                .frame(width: 44, height: 44)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text("Challenge a friend")
                    .font(Theme.font(16, weight: .medium))
                Text("Same puzzle · no spoilers")
                    .font(Theme.font(12, relativeTo: .caption))
                    .foregroundStyle(Theme.canvas.opacity(0.76))
                    .fixedSize(horizontal: false, vertical: true)
            }
            if !typeSize.isAccessibilitySize {
                Spacer(minLength: 4)
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(width: 44, height: 44)
                    .accessibilityHidden(true)
            }
        }
        .padding(.horizontal, 12)
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
    let onStartWarmup: () -> Void

    init(onStartWarmup: @escaping () -> Void = {}) {
        self.onStartWarmup = onStartWarmup
    }

    var body: some View {
        NavigationStack {
            Page {
                Text("Small puzzle. Big aha.").font(Theme.font(30, weight: .medium))
                Text("A few clues. One hidden connection. Read the pictures, words or patterns, then try the word or phrase that clicks.").font(Theme.font(17))
                VStack(spacing: 12) {
                    Text("💡 + 🏠").font(.system(size: 42)).accessibilityLabel("Light bulb plus house")
                    Text("Light + house = lighthouse").font(Theme.font(16, weight: .medium))
                    Text("That’s the aha. Today’s connection is yours to find.").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }.frame(maxWidth: .infinity).padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 24) {
                    Label("Three guesses. Take your time.", systemImage: "circle.grid.3x1")
                    Label("Eve reacts to each guess. Hints offer a nudge.", systemImage: "sparkles")
                    Label("A new puzzle at your local midnight.", systemImage: "sunrise")
                    Label("Earn XP, collect badges, challenge a friend.", systemImage: "star")
                }.font(Theme.font(16))
                Text("Daily play is free. Plus adds a personal journal and deeper insights, never an advantage.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                Button(action: onStartWarmup) {
                    Label("Try the practice round", systemImage: "play.circle")
                        .font(Theme.font(14, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(Theme.accent)
                .accessibilityIdentifier("tutorialReplay")
                Button("Let’s play") { dismiss() }.buttonStyle(CommitStyle())
            }.navigationTitle("How to play").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close", systemImage: "xmark") { dismiss() } } }
        }
    }
}

private struct GuessFeedbackPresentation {
    private enum Tier: String {
        case correct, close, warm, cold, out, unknown
    }

    private let tier: Tier

    init(tier rawTier: String?) {
        tier = Tier(rawValue: rawTier?.lowercased() ?? "") ?? .unknown
    }

    var title: String {
        switch tier {
        case .correct: "AHA!"
        case .out: "REVEALED"
        case .close: "SO CLOSE"
        case .warm: "WARMING UP"
        case .cold: "CHILLY"
        case .unknown: "NEXT TRY"
        }
    }

    var symbol: String {
        switch tier {
        case .correct: "checkmark.circle.fill"
        case .close: "arrow.up.right.circle.fill"
        case .warm: "thermometer.medium"
        case .cold: "snowflake"
        case .out: "eye"
        case .unknown: "circle.dashed"
        }
    }

    var tint: Color {
        switch tier {
        case .correct: Theme.success
        case .close: Theme.accent
        case .warm: Theme.reward
        case .cold: Theme.chill
        case .out, .unknown: Theme.secondary
        }
    }

    var accessibilityLabel: String {
        switch tier {
        case .correct: "correct"
        case .close: "close"
        case .warm: "warm"
        case .cold: "cold"
        case .out: "answer revealed"
        case .unknown: "submitted"
        }
    }

    var isNeutral: Bool {
        switch tier {
        case .cold, .out, .unknown: true
        case .correct, .close, .warm: false
        }
    }

    var meterLevel: Int {
        switch tier {
        case .correct, .close: 3
        case .warm: 2
        case .cold: 1
        case .out, .unknown: 0
        }
    }
}

private enum GuessConversationItem: Identifiable {
    case hint(DailyHintReveal, String)
    case guess(Guess)

    var id: String {
        switch self {
        case .hint(let reveal, _): "hint-\(reveal.hintIndex)"
        case .guess(let guess): "turn-\(guess.attemptNumber)"
        }
    }

    var order: Int {
        switch self {
        case .hint(let reveal, _): max(0, reveal.afterAttemptCount) * 2
        case .guess(let guess): max(0, guess.attemptNumber - 1) * 2 + 1
        }
    }

    var tieBreak: Int {
        switch self {
        case .hint(let reveal, _): reveal.hintIndex
        case .guess(let guess): guess.attemptNumber
        }
    }
}

/// The same confirmed guess thread is used during play and in Eve's postgame debrief.
private struct GuessConversationView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let attempts: [Guess]
    let hintTexts: [String]
    let hintReveals: [DailyHintReveal]
    let replies: [Int: String]
    let pendingAttempt: Int?
    let unavailableAttempts: Set<Int>
    let interruptedAttempts: Set<Int>
    var sectionTitle: String? = nil

    private var timeline: [GuessConversationItem] {
        let hints = hintReveals.compactMap { reveal -> GuessConversationItem? in
            guard hintTexts.indices.contains(reveal.hintIndex) else { return nil }
            return .hint(reveal, hintTexts[reveal.hintIndex])
        }
        let guesses = attempts.map { GuessConversationItem.guess($0) }
        return (hints + guesses).sorted {
            $0.order == $1.order ? $0.tieBreak < $1.tieBreak : $0.order < $1.order
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let sectionTitle {
                Eyebrow(text: sectionTitle)
            }
            VStack(alignment: .leading, spacing: 24) {
                ForEach(timeline) { item in
                    switch item {
                    case .hint(let reveal, let text):
                        EveHintTurn(hintIndex: reveal.hintIndex, text: text)
                            .id(item.id)
                            .transition(reduceMotion
                                ? .identity
                                : .asymmetric(
                                    insertion: .opacity.combined(with: .move(edge: .bottom)),
                                    removal: .opacity
                                )
                            )
                    case .guess(let guess):
                        GuessTurnView(
                            guess: guess,
                            reply: replies[guess.attemptNumber],
                            pending: pendingAttempt == guess.attemptNumber,
                            unavailable: unavailableAttempts.contains(guess.attemptNumber),
                            interrupted: interruptedAttempts.contains(guess.attemptNumber),
                            latest: guess.id == attempts.last?.id
                        )
                        .id(item.id)
                        .transition(reduceMotion
                            ? .identity
                            : .asymmetric(
                                insertion: .opacity.combined(with: .move(edge: .bottom)),
                                removal: .opacity
                            )
                        )
                    }
                }
            }
            .animation(reduceMotion ? nil : .spring(duration: 0.32, bounce: 0.08), value: timeline.count)
        }
    }
}

private struct EveHintTurn: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let hintIndex: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            EveAvatar().accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 8) {
                    Text("Eve").font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                    Text("NUDGE · HINT \(hintIndex + 1)")
                        .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                        .tracking(0.7)
                        .foregroundStyle(Theme.accent)
                }
                Text(text)
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Eve, nudge \(hintIndex + 1). \(text)")
        .accessibilityIdentifier("eveHint-\(hintIndex)")
        .transition(reduceMotion ? .identity : .asymmetric(
            insertion: .opacity.combined(with: .move(edge: .bottom)),
            removal: .opacity
        ))
    }
}

struct EveReplyStatusNote: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "bubble.left")
            .font(Theme.font(13))
            .foregroundStyle(Theme.secondary)
            .fixedSize(horizontal: false, vertical: true)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: 12))
            .accessibilityElement(children: .combine)
    }
}

/// Conversation uses confirmed guesses and server feedback, never the hidden answer.
struct GuessTurnView: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let guess: Guess
    let reply: String?
    let pending: Bool
    let unavailable: Bool
    let interrupted: Bool
    let latest: Bool
    private var feedback: GuessFeedbackPresentation {
        GuessFeedbackPresentation(tier: guess.correct ? "correct" : guess.reaction?.tier)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .trailing, spacing: 6) {
                Text("Your guess · \(guess.attemptNumber)")
                    .font(Theme.font(11, weight: .medium)).foregroundStyle(Theme.secondary)
                Text(guess.guess).font(Theme.font(17, weight: .medium)).textSelection(.enabled)
                    .padding(.horizontal, 16).padding(.vertical, 12)
                    .background(Theme.accent.opacity(0.09), in: RoundedRectangle(cornerRadius: 18))
            }.frame(maxWidth: .infinity, alignment: .trailing).padding(.leading, 28)
            HStack(alignment: .top, spacing: 10) {
                EveAvatar(celebrating: guess.correct).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 9) {
                    let feedbackLayout = typeSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 7))
                        : AnyLayout(HStackLayout(spacing: 7))
                    feedbackLayout {
                        Text("Eve")
                            .font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                        feedbackBadge
                        if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                        FeedbackMeter(level: feedback.meterLevel, tint: feedback.tint)
                    }
                    if let reply, !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Text(reply)
                            .font(Theme.font(15))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("eveReply-\(guess.id)")
                    } else if let reaction = guess.reaction {
                        Text(reaction.line)
                            .font(Theme.font(15))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if pending {
                        EveTypingIndicator()
                            .transition(reduceMotion ? .identity : .opacity)
                    } else if unavailable {
                        EveReplyStatusNote(message: "Eve’s note didn’t arrive. Your guess is saved.")
                            .accessibilityIdentifier("eveReplyUnavailable-\(guess.id)")
                            .transition(reduceMotion ? .identity : .opacity)
                    }
                    if interrupted {
                        EveReplyStatusNote(message: "Eve’s note didn’t finish. Your guess is saved.")
                            .accessibilityIdentifier("eveReplyInterrupted-\(guess.id)")
                            .transition(reduceMotion ? .identity : .opacity)
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
                }
            }
        }.accessibilityElement(children: .contain)
    }

    private var feedbackBadge: some View {
        HStack(spacing: 8) {
            Image(systemName: feedback.symbol).font(Theme.font(12, weight: .bold))
                .foregroundStyle(feedback.tint).accessibilityHidden(true)
            Text(feedback.title).font(Theme.font(10, weight: .bold, relativeTo: .caption)).tracking(0.7)
                .foregroundStyle(feedback.tint)
                .accessibilityLabel("\(feedback.title), \(feedback.accessibilityLabel)")
                .accessibilityIdentifier(latest ? "guessFeedback" : "guessFeedback-\(guess.id)")
        }
        .padding(.horizontal, 11).padding(.vertical, 7)
        .background(feedback.tint.opacity(feedback.isNeutral ? 0.08 : 0.13), in: Capsule())
        .overlay(Capsule().strokeBorder(feedback.tint.opacity(feedback.isNeutral ? 0.18 : 0.28), lineWidth: 1))
    }
}

private struct EveTypingIndicator: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 8) {
            dots
            Text("Eve is thinking…")
                .font(Theme.font(12))
                .foregroundStyle(Theme.secondary)
        }
        .frame(minHeight: 24)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Eve is thinking")
    }

    @ViewBuilder private var dots: some View {
        if reduceMotion {
            dotGroup(active: -1)
        } else {
            TimelineView(.periodic(from: .now, by: 0.28)) { context in
                let active = Int(context.date.timeIntervalSinceReferenceDate / 0.28) % 3
                dotGroup(active: active)
            }
        }
    }

    private func dotGroup(active: Int) -> some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(Theme.accent.opacity(active < 0 ? 0.5 : active == index ? 1 : 0.25))
                    .frame(width: 5, height: 5)
                    .offset(y: active == index ? -1.5 : 0)
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.22), value: active)
            }
        }
        .accessibilityHidden(true)
    }
}

private struct FeedbackMeter: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var revealed = false
    let level: Int
    let tint: Color

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { index in
                let active = revealed && index < level
                Capsule()
                    .fill(active ? tint : Theme.field)
                    .frame(width: 20, height: 6)
                    .overlay(Capsule().strokeBorder(Theme.secondary.opacity(active ? 0.12 : 0.22), lineWidth: 0.5))
                    .animation(
                        reduceMotion ? nil : .spring(response: 0.38, dampingFraction: 0.72).delay(Double(index) * 0.06),
                        value: revealed
                    )
            }
        }
        .accessibilityHidden(true)
        .onAppear {
            guard !reduceMotion else {
                revealed = true
                return
            }
            withAnimation(.easeOut(duration: 0.16)) { revealed = true }
        }
    }
}

struct EveAvatar: View {
    var celebrating = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 13)
                .fill((celebrating ? Theme.reward : Theme.accent).opacity(0.10))
            RoundedRectangle(cornerRadius: 13)
                .strokeBorder((celebrating ? Theme.reward : Theme.accent).opacity(0.14), lineWidth: 1)

            ZStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [celebrating ? Theme.reward : Theme.accent,
                                 (celebrating ? Theme.reward : Theme.accent).opacity(0.82)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 25, height: 25)

                HStack(spacing: 5) {
                    Circle().frame(width: 3, height: 3)
                    Circle().frame(width: 3, height: 3)
                }
                .foregroundStyle(.white)
                .offset(y: -3)

                EveSmile()
                    .stroke(.white, style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
                    .frame(width: 11, height: 7)
                    .offset(y: 4)
            }
            .rotationEffect(.degrees(celebrating && !reduceMotion ? -5 : 0))

            Image(systemName: "sparkle")
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(celebrating ? Theme.reward : Theme.accent)
                .offset(x: 12, y: -12)
                .rotationEffect(.degrees(celebrating && !reduceMotion ? 18 : 0))
        }
        .frame(width: 38, height: 38)
        .animation(reduceMotion ? nil : .spring(response: 0.34, dampingFraction: 0.56), value: celebrating)
            .accessibilityLabel("Eve")
    }
}

private struct EveSmile: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY + rect.height * 0.32))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX, y: rect.minY + rect.height * 0.32),
            control: CGPoint(x: rect.midX, y: rect.maxY + rect.height * 0.45)
        )
        return path
    }
}
