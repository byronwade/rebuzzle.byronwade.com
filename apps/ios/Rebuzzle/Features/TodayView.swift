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
                        VStack(alignment: .leading, spacing: 8) {
                            dateHeading
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
                        VStack(alignment: .leading, spacing: 12) {
                            let stageHeader = typeSize.isAccessibilitySize
                                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                                : AnyLayout(HStackLayout(alignment: .center, spacing: 8))
                            stageHeader {
                                DailyRibbon(text: daily.puzzle.typeName)
                                PuzzleDifficultyBadge(difficulty: daily.puzzle.difficulty)
                                if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                                Button {
                                    answerFocused = false
                                    study = PuzzleStudy(puzzle: daily.puzzle)
                                } label: {
                                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                                        .font(.system(size: 15, weight: .heavy))
                                        .foregroundStyle(Theme.accent)
                                        .frame(width: 44, height: 44)
                                        .background(Theme.field, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                                        .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Study puzzle")
                                .accessibilityIdentifier("studyPuzzle")
                            }
                            // Keep every clue and its internal geometry untouched.
                            PuzzleBoard(puzzle: daily.puzzle)
                                .padding(12)
                                .frame(maxWidth: .infinity)
                                .background(Theme.field, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
                        }
                        .gameCard(padding: 14)
                        DailyPuzzleTicker(
                            resetAt: DailyReturnTiming.deadline(daily.nextPuzzleTime),
                            roundComplete: false
                        )
                        .padding(.horizontal, 8)
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
                            .font(Theme.font(14, weight: .heavy))
                        }
                        .buttonStyle(ChunkyButtonStyle(variant: .primary, compact: true))
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
                    // The result replaces the board and composer, so settle on its top once it has laid out.
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(320))
                        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                            scroll.scrollTo("dailyHeader", anchor: .top)
                        }
                    }
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
            guard isFollowingLatestTurn, model.game?.gameOver != true,
                  let latestAttempt = model.game?.attempts.last?.attemptNumber,
                  oldReplies[latestAttempt] != newReplies[latestAttempt] else { return }
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                scroll.scrollTo("turn-\(latestAttempt)", anchor: .bottom)
            }
        }
        .onChange(of: model.eve.unavailableAttempts) { oldAttempts, newAttempts in
            guard isFollowingLatestTurn, model.game?.gameOver != true, oldAttempts != newAttempts,
                  let latestAttempt = model.game?.attempts.last?.attemptNumber else { return }
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                scroll.scrollTo("turn-\(latestAttempt)", anchor: .bottom)
            }
        }
        .onChange(of: model.eve.interruptedAttempts) { oldAttempts, newAttempts in
            guard isFollowingLatestTurn, model.game?.gameOver != true, oldAttempts != newAttempts,
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
            IconTile(systemImage: "quote.bubble.fill", face: Theme.eveFill, ledge: Theme.eveLedge, size: 40)
            VStack(alignment: .leading, spacing: 5) {
                Text("ROUND RULES")
                    .font(Theme.font(11, weight: .heavy, relativeTo: .caption))
                    .tracking(0.8)
                    .foregroundStyle(Theme.eve)
                Text("Three guesses. Hints don’t use a try. Eve gives feedback after each guess.")
                    .font(Theme.font(15, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .gameCard(padding: 14)
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
            .font(Theme.font(15, weight: .heavy))
            .foregroundStyle(Theme.secondary)
            .accessibilityAddTraits(.isHeader)
    }
    private var completedRoundLabel: some View {
        Pill(
            text: "ROUND COMPLETE",
            systemImage: model.game?.wasSuccessful == true ? "checkmark.seal.fill" : "sparkles",
            tint: model.game?.wasSuccessful == true ? Theme.success : Theme.reward
        )
    }
    private var attemptHeader: some View {
        let attempts = model.game?.attempts ?? []
        let maximum = model.game?.maxAttempts ?? 3
        let remaining = model.game?.attemptsLeft ?? maximum
        let tileSize: CGFloat = typeSize.isAccessibilitySize ? 48 : 34
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            HStack(spacing: 8) {
                ForEach(0..<maximum, id: \.self) { index in
                    let submitted = index < attempts.count
                    let active = index == attempts.count
                    let guess = submitted ? attempts[index] : nil
                    let feedback = GuessFeedbackPresentation(tier: guess?.correct == true ? "correct" : guess?.reaction?.tier)
                    DailyGuessSlot(
                        state: guess?.correct == true ? .solved : submitted ? .missed : active ? .active : .open,
                        number: index + 1,
                        size: tileSize
                    )
                    .scaleEffect(active && !reduceMotion ? 1.06 : 1)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(submitted
                        ? "Guess \(index + 1), \(feedback.accessibilityLabel)"
                        : active ? "Guess \(index + 1), your next guess" : "Guess \(index + 1), not played yet")
                    .accessibilityIdentifier("guessStep.\(index + 1)")
                }
            }
            .animation(reduceMotion ? nil : Theme.Motion.pop, value: attempts.count)
            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            Pill(
                text: "\(remaining) \(remaining == 1 ? "guess" : "guesses") left",
                systemImage: "target",
                tint: remaining == 1 ? Theme.error : Theme.accent
            )
            .fixedSize(horizontal: !typeSize.isAccessibilitySize, vertical: true)
        }
    }
}

/// The in-game guess tile. It matches `GuessSlots`, but each step keeps its own
/// accessibility element so the per-guess identifiers and labels survive.
private struct DailyGuessSlot: View {
    enum SlotState { case open, active, missed, solved }
    let state: SlotState
    let number: Int
    let size: CGFloat

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
        ZStack {
            switch state {
            case .open:
                shape.fill(Theme.field)
                shape.strokeBorder(Theme.panelLedge, lineWidth: 2.5)
                Text("\(number)")
                    .font(Theme.display(size * 0.46, relativeTo: .caption)).monospacedDigit()
                    .foregroundStyle(Theme.secondary)
            case .active:
                shape.fill(Theme.accentLedge).offset(y: 3)
                shape.fill(Theme.accentFill)
                Text("\(number)")
                    .font(Theme.display(size * 0.46, relativeTo: .caption)).monospacedDigit()
                    .foregroundStyle(.white)
            case .missed:
                shape.fill(Theme.errorLedge).offset(y: 3)
                shape.fill(Theme.errorFill)
                Image(systemName: "xmark").font(.system(size: size * 0.42, weight: .black)).foregroundStyle(.white)
            case .solved:
                shape.fill(Theme.successLedge).offset(y: 3)
                shape.fill(Theme.successFill)
                Image(systemName: "checkmark").font(.system(size: size * 0.42, weight: .black)).foregroundStyle(.white)
            }
        }
        .frame(width: size, height: size)
        .padding(.bottom, 3)
    }
}

/// A small blue ribbon for the puzzle type, matching the Arcade hub's challenge label.
private struct DailyRibbon: View {
    let text: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "puzzlepiece.fill").font(.system(size: 11, weight: .black)).accessibilityHidden(true)
            Text(text.uppercased())
                .font(Theme.font(12, weight: .heavy, relativeTo: .caption))
                .tracking(0.9)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 11)
        .padding(.vertical, 6)
        .background(Capsule().fill(Theme.accentFill))
        .background(Capsule().fill(Theme.accentLedge).offset(y: 3))
        .padding(.bottom, 3)
        .accessibilityElement(children: .combine)
    }
}

private struct EveOpeningMessage: View {
    var body: some View {
        EveSpeechBubble {
            EveNameTag()
            Text("Today’s clues are ready. What phrase do you see?")
                .font(Theme.font(16, weight: .medium)).foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
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
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .gameCard(padding: 16)
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
        Pill(text: "DIFFICULTY \(difficulty)/10", systemImage: "dial.medium.fill", tint: Theme.eve)
            .accessibilityElement(children: .ignore)
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
                RewardStage(
                    puzzleID: game.puzzleId,
                    solved: game.wasSuccessful == true,
                    stars: stars(for: game),
                    points: points(for: game),
                    attempts: game.attempts.count,
                    maxAttempts: game.maxAttempts
                )
                .id(game.puzzleId)
                VStack(alignment: .leading, spacing: 16) {
                    if let puzzle = model.daily?.puzzle {
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow(text: "THE CLUE")
                            PuzzleBoard(puzzle: puzzle, compactForReveal: !typeSize.isAccessibilitySize)
                                .padding(.horizontal, 10)
                                .padding(.vertical, typeSize.isAccessibilitySize ? 8 : 2)
                                .frame(maxWidth: .infinity)
                                .background(Theme.field, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
                        }
                    }
                    if showsAnswer {
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow(text: "THE CONNECTION")
                            Text(game.revealedAnswer ?? "Puzzle complete")
                                .font(Theme.display(32)).tracking(-0.6).textSelection(.enabled)
                                .foregroundStyle(game.wasSuccessful == true ? Theme.success : Theme.ink)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .transition(reduceMotion
                            ? .identity
                            : .opacity.combined(with: .scale(scale: 0.96, anchor: .leading))
                        )
                    } else {
                        Label("One last look…", systemImage: "sparkles")
                            .font(Theme.font(14, weight: .semibold))
                            .foregroundStyle(Theme.secondary)
                            .frame(minHeight: 44, alignment: .leading)
                            .accessibilityHidden(true)
                            .transition(.opacity)
                    }
                    if showsExplanation, let explanation = game.explanation, !explanation.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Eyebrow(text: "WHY IT CLICKS")
                            Text(explanation)
                                .font(Theme.font(16, weight: .medium)).foregroundStyle(Theme.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .transition(reduceMotion
                            ? .identity
                            : .opacity.combined(with: .offset(y: 4))
                        )
                    }
                }
                .gameCard(padding: 20)
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
                .gameCard(padding: 18)
                DailyReturnCard()
                DailyStreakCard(presentation: model.streakPresentation(for: game), context: .result)
                shareInvite(for: game)
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: "YOUR ROUND")
                    let metrics = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10)) : AnyLayout(HStackLayout(alignment: .top, spacing: 10))
                    metrics {
                        resultMetric("\(game.attempts.count)/\(game.maxAttempts)", "Guesses", symbol: "target", face: Theme.accentFill, ledge: Theme.accentLedge)
                        resultMetric("\(model.hintsShown)", "Hints", symbol: "lightbulb.fill", face: Theme.eveFill, ledge: Theme.eveLedge)
                        resultMetric("\(model.journal.entries.count)", "Days played here", symbol: "calendar", face: Theme.successFill, ledge: Theme.successLedge)
                    }
                }
                DailyQualityPulse { rating in
                    model.recordGrowthEvent(.dailyQualityFeedback(rating))
                }
                if model.journal.entries.contains(where: { $0.id == game.puzzleId }) {
                    NavigationLink { JournalView() } label: {
                        Label(model.purchases.hasPlus ? "Add a thought to your journal" : "Keep this connection", systemImage: "book.closed")
                    }
                    .buttonStyle(ChunkyButtonStyle(variant: .secondary))
                    .accessibilityIdentifier("keepConnection")
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
            .buttonStyle(ChunkyButtonStyle(variant: .secondary))
            .accessibilityIdentifier("shareDailyResult")
            .accessibilityLabel("Challenge a friend with today's result")
            .accessibilityHint("Shares a spoiler-free Rebuzzle card and invitation.")
        } else {
            ShareLink(item: game.shareText) {
                shareInviteLabel
            }
            .buttonStyle(ChunkyButtonStyle(variant: .secondary))
            .accessibilityIdentifier("shareDailyResult")
            .accessibilityLabel("Challenge a friend with today's result")
            .accessibilityHint("Shares a spoiler-free Rebuzzle result and invitation.")
        }
    }

    private var shareInviteLabel: some View {
        HStack(spacing: 12) {
            IconTile(systemImage: "person.2.fill", face: Theme.accentFill, ledge: Theme.accentLedge, size: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text("Challenge a friend")
                    .font(Theme.font(17, weight: .heavy, relativeTo: .headline))
                    .foregroundStyle(Theme.ink)
                Text("Same puzzle · no spoilers")
                    .font(Theme.font(13, weight: .medium, relativeTo: .caption))
                    .foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .multilineTextAlignment(.leading)
            if !typeSize.isAccessibilitySize {
                Spacer(minLength: 4)
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundStyle(Theme.accent)
                    .accessibilityHidden(true)
            }
        }
    }

    /// Same reward math the journey summary uses; nothing here is invented for display.
    private func points(for game: GameSession) -> Int {
        JourneyProgress.points(won: game.wasSuccessful == true, attempts: game.attempts.count, hintsUsed: model.hintsShown)
    }

    private func stars(for game: GameSession) -> Int {
        game.wasSuccessful == true ? max(1, 4 - game.attempts.count) : 0
    }

    private func resultMetric(_ value: String, _ label: String, symbol: String, face: Color, ledge: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            IconTile(systemImage: symbol, face: face, ledge: ledge, size: 30)
            Text(value)
                .font(Theme.display(24, relativeTo: .title2)).monospacedDigit()
                .foregroundStyle(Theme.ink)
            Text(label)
                .font(Theme.font(12, weight: .bold, relativeTo: .caption))
                .foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .gameCard(padding: 12)
        .accessibilityElement(children: .combine)
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
                    .font(Theme.font(18, weight: .heavy, relativeTo: .headline))
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
                                .font(Theme.font(14, weight: .bold, relativeTo: .subheadline))
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                        .foregroundStyle(isSelected ? Color.white : Theme.ink)
                        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                        .padding(.horizontal, 10)
                        .background(isSelected ? Theme.accentFill : Theme.field, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 13, style: .continuous).strokeBorder(isSelected ? Theme.accentFill : Theme.panelLedge, lineWidth: 2))
                        .background(RoundedRectangle(cornerRadius: 13, style: .continuous).fill(isSelected ? Theme.accentLedge : Theme.panelLedge).offset(y: 3))
                        .padding(.bottom, 3)
                        .contentShape(RoundedRectangle(cornerRadius: 13))
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
        .gameCard(padding: 16)
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
                Text("Small puzzle. Big aha.").font(Theme.display(30, relativeTo: .title))
                Text("A few clues. One hidden connection. Read the pictures, words or patterns, then try the word or phrase that clicks.").font(Theme.font(17, weight: .medium))
                VStack(spacing: 12) {
                    Text("💡 + 🏠").font(.system(size: 42)).accessibilityLabel("Light bulb plus house")
                    Text("Light + house = lighthouse").font(Theme.font(17, weight: .heavy))
                    Text("That’s the aha. Today’s connection is yours to find.").font(Theme.font(13, weight: .medium)).foregroundStyle(Theme.secondary)
                }.frame(maxWidth: .infinity).multilineTextAlignment(.center).gameCard(padding: 20)
                VStack(alignment: .leading, spacing: 24) {
                    Label("Three guesses. Take your time.", systemImage: "circle.grid.3x1")
                    Label("Eve reacts to each guess. Hints offer a nudge.", systemImage: "sparkles")
                    Label("A new puzzle at your local midnight.", systemImage: "sunrise")
                    Label("Earn XP, collect badges, challenge a friend.", systemImage: "star")
                }.font(Theme.font(16, weight: .semibold)).symbolRenderingMode(.monochrome).tint(Theme.accent)
                Text("Daily play is free. Plus adds a personal journal and deeper insights, never an advantage.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                Button(action: onStartWarmup) {
                    Label("Try the practice round", systemImage: "play.circle")
                }
                .buttonStyle(ChunkyButtonStyle(variant: .secondary))
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

/// Eve's speech bubble: a grape-tinted card with a small ledge, led by Eve's avatar.
private struct EveSpeechBubble<Content: View>: View {
    var celebrating = false
    @ViewBuilder let content: Content

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            EveAvatar(celebrating: celebrating).accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 8) { content }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background {
                    ZStack {
                        EveBubbleShape().fill(Theme.panel)
                        EveBubbleShape().fill(Theme.eve.opacity(0.12))
                        EveBubbleShape().stroke(Theme.eve.opacity(0.32), lineWidth: 2)
                    }
                }
                .background(EveBubbleShape().fill(Theme.eveLedge.opacity(0.35)).offset(y: 4))
                .padding(.bottom, 4)
        }
    }
}

/// A rounded bubble with a short tail pointing up-left toward Eve's avatar.
private struct EveBubbleShape: Shape {
    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 18
        var path = Path(roundedRect: rect, cornerRadius: radius, style: .continuous)
        var tail = Path()
        tail.move(to: CGPoint(x: rect.minX + 1, y: rect.minY + 14))
        tail.addLine(to: CGPoint(x: rect.minX - 7, y: rect.minY + 19))
        tail.addLine(to: CGPoint(x: rect.minX + 1, y: rect.minY + 27))
        tail.closeSubpath()
        path.addPath(tail)
        return path
    }
}

private struct EveNameTag: View {
    var body: some View {
        Text("Eve")
            .font(Theme.font(13, weight: .heavy))
            .foregroundStyle(Theme.eve)
    }
}

private struct EveHintTurn: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let hintIndex: Int
    let text: String

    var body: some View {
        EveSpeechBubble {
            HStack(spacing: 8) {
                EveNameTag()
                Pill(text: "NUDGE · HINT \(hintIndex + 1)", systemImage: "lightbulb.fill", tint: Theme.eve)
            }
            Text(text)
                .font(Theme.font(16, weight: .medium))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
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
            .font(Theme.font(13, weight: .medium))
            .foregroundStyle(Theme.secondary)
            .fixedSize(horizontal: false, vertical: true)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
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
                    .font(Theme.font(12, weight: .heavy)).foregroundStyle(Theme.secondary)
                HStack(spacing: 8) {
                    Image(systemName: guess.correct ? "checkmark" : "xmark")
                        .font(.system(size: 13, weight: .black))
                        .foregroundStyle(.white)
                        .frame(width: 24, height: 24)
                        .background(guess.correct ? Theme.successFill : Theme.errorFill, in: Circle())
                        .accessibilityLabel(guess.correct ? "Correct" : "Not it")
                    Text(guess.guess)
                        .font(Theme.font(17, weight: .heavy))
                        .foregroundStyle(.white)
                        .textSelection(.enabled)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.leading, 10).padding(.trailing, 16).padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Theme.accentFill))
                .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Theme.accentLedge).offset(y: 4))
                .padding(.bottom, 4)
            }.frame(maxWidth: .infinity, alignment: .trailing).padding(.leading, 28)
            EveSpeechBubble(celebrating: guess.correct) {
                let feedbackLayout = typeSize.isAccessibilitySize
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 7))
                    : AnyLayout(HStackLayout(spacing: 7))
                feedbackLayout {
                    EveNameTag()
                    feedbackBadge
                    if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                    FeedbackMeter(level: feedback.meterLevel, tint: feedback.tint)
                }
                if let reply, !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Text(reply)
                        .font(Theme.font(16, weight: .medium))
                        .foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("eveReply-\(guess.id)")
                } else if let reaction = guess.reaction {
                    Text(reaction.line)
                        .font(Theme.font(16, weight: .medium))
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
                                .font(Theme.font(13, weight: .heavy))
                                .foregroundStyle(word.correct ? Theme.success : near ? Theme.reward : Theme.secondary)
                                .padding(8)
                                .background((word.correct ? Theme.success : near ? Theme.reward : Theme.secondary).opacity(0.12), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .accessibilityLabel("\(word.word), \(word.correct ? "exact match" : near ? "near match" : "not matched")")
                        }
                    }
                    Text("✓ Exact match   ≈ Near match").font(Theme.font(11, weight: .medium)).foregroundStyle(Theme.secondary)
                }
            }
        }.accessibilityElement(children: .contain)
    }

    /// Correct reads as a solid success badge; a miss keeps its warmth tier but is marked in error colors.
    private var feedbackBadge: some View {
        let tint = guess.correct ? Theme.successFill : Theme.errorFill
        let ledge = guess.correct ? Theme.successLedge : Theme.errorLedge
        return HStack(spacing: 6) {
            Image(systemName: guess.correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 12, weight: .black))
                .accessibilityHidden(true)
            Text(feedback.title).font(Theme.font(11, weight: .heavy, relativeTo: .caption)).tracking(0.7)
                .accessibilityLabel("\(feedback.title), \(feedback.accessibilityLabel)")
                .accessibilityIdentifier(latest ? "guessFeedback" : "guessFeedback-\(guess.id)")
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Capsule().fill(tint))
        .background(Capsule().fill(ledge).offset(y: 2))
        .padding(.bottom, 2)
    }
}

private struct EveTypingIndicator: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 8) {
            dots
            Text("Eve is thinking…")
                .font(Theme.font(13, weight: .medium))
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
                    .fill(Theme.eve.opacity(active < 0 ? 0.5 : active == index ? 1 : 0.3))
                    .frame(width: 7, height: 7)
                    .offset(y: active == index ? -2 : 0)
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
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                let active = revealed && index < level
                Capsule()
                    .fill(active ? tint : Theme.panelLedge)
                    .frame(width: 18, height: 9)
                    .animation(
                        reduceMotion ? nil : Theme.Motion.pop.delay(Double(index) * 0.06),
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
    var size: CGFloat = 38
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let face = celebrating ? Theme.gold : Theme.eveFill
        let ledge = celebrating ? Theme.goldLedge : Theme.eveLedge
        let ink = celebrating ? Theme.onGold : Color.white
        let scale = size / 38
        ZStack {
            Circle().fill(ledge).offset(y: 3 * scale)
            Circle().fill(face)
            ZStack {
                HStack(spacing: 6 * scale) {
                    Circle().frame(width: 4 * scale, height: 4 * scale)
                    Circle().frame(width: 4 * scale, height: 4 * scale)
                }
                .offset(y: -3 * scale)
                EveSmile()
                    .stroke(ink, style: StrokeStyle(lineWidth: 2 * scale, lineCap: .round))
                    .frame(width: 13 * scale, height: 8 * scale)
                    .offset(y: 5 * scale)
            }
            .foregroundStyle(ink)
            .rotationEffect(.degrees(celebrating && !reduceMotion ? -6 : 0))
            Image(systemName: "sparkle")
                .font(.system(size: 11 * scale, weight: .black))
                .foregroundStyle(celebrating ? Theme.reward : Theme.eve)
                .offset(x: 15 * scale, y: -15 * scale)
                .rotationEffect(.degrees(celebrating && !reduceMotion ? 18 : 0))
        }
        .frame(width: size, height: size)
        .padding(.bottom, 3 * scale)
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

// MARK: - Reward stage

/// The solve celebration at the top of the result. It only shows numbers the round already has:
/// the outcome, the guesses used, the stars and the XP the journey summary awards.
private struct RewardStage: View {
    let puzzleID: String
    let solved: Bool
    let stars: Int
    let points: Int
    let attempts: Int
    let maxAttempts: Int

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var starsShown = false
    @State private var displayedPoints = 0
    @State private var eveHop = false
    @State private var confettiLive = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            let heading = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10))
                : AnyLayout(HStackLayout(alignment: .center, spacing: 14))
            heading {
                EveAvatar(celebrating: solved, size: 58)
                    .offset(y: eveHop ? -10 : 0)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text(solved ? "Aha!" : "The reveal.")
                        .font(Theme.display(solved ? 44 : 38))
                        .tracking(-1)
                        .foregroundStyle(solved ? Theme.reward : Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    Label(solved ? "You found it." : "Here’s the connection.", systemImage: solved ? "checkmark.seal.fill" : "eye")
                        .font(Theme.font(15, weight: .heavy))
                        .foregroundStyle(solved ? Theme.success : Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            let rewardRow = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
                : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
            rewardRow {
                HStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { index in
                        star(earned: index < stars, index: index)
                    }
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(stars) of 3 stars")

                if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }

                Text("+\(displayedPoints) XP")
                    .font(Theme.display(typeSize.isAccessibilitySize ? 28 : 26, relativeTo: .title2))
                    .monospacedDigit()
                    .foregroundStyle(Theme.onGold)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Theme.gold))
                    .background(Capsule().fill(Theme.goldLedge).offset(y: 4))
                    .padding(.bottom, 4)
                    .accessibilityLabel("\(points) experience points earned")
                    .accessibilityIdentifier("earnedXP")
            }

            HStack(spacing: 10) {
                GuessSlots(total: maxAttempts, used: attempts, solved: solved, size: 28)
                    .accessibilityHidden(true)
                Text(solved ? (stars == 3 ? "First guess. Nailed it." : "That’s your daily aha.") : "A new connection, even on the tricky days.")
                    .font(Theme.font(14, weight: .semibold, relativeTo: .subheadline))
                    .foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(attempts) of \(maxAttempts) guesses, \(solved ? "solved" : "answer revealed")")
        }
        .gameCard(padding: 18)
        .overlay {
            if confettiLive {
                ConfettiBurst()
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
        }
        .task(id: puzzleID) { await celebrate() }
    }

    private func star(earned: Bool, index: Int) -> some View {
        let size: CGFloat = typeSize.isAccessibilitySize ? 40 : 34
        let visible = !earned || starsShown || reduceMotion
        return ZStack {
            Image(systemName: "star.fill")
                .font(.system(size: size, weight: .black))
                .foregroundStyle(earned ? Theme.goldLedge : Theme.panelLedge)
                .offset(y: 3)
            Image(systemName: "star.fill")
                .font(.system(size: size, weight: .black))
                .foregroundStyle(earned ? Theme.gold : Theme.field)
        }
        .scaleEffect(visible ? 1 : 0.2)
        .rotationEffect(.degrees(visible ? 0 : -24))
        .opacity(visible ? 1 : 0)
        .animation(reduceMotion ? nil : Theme.Motion.pop.delay(0.15 + Double(index) * 0.15), value: starsShown)
    }

    private func celebrate() async {
        guard !reduceMotion else {
            starsShown = true
            displayedPoints = points
            return
        }
        starsShown = false
        displayedPoints = 0
        confettiLive = solved
        // Let the stage land, then pop stars and bounce Eve.
        try? await Task.sleep(for: .milliseconds(60))
        starsShown = true
        if solved {
            withAnimation(Theme.Motion.pop) { eveHop = true }
            try? await Task.sleep(for: .milliseconds(220))
            withAnimation(Theme.Motion.settle) { eveHop = false }
        }
        // Count the XP up over about 0.8s.
        let steps = 16
        for step in 1...steps {
            guard !Task.isCancelled else { break }
            try? await Task.sleep(for: .milliseconds(50))
            displayedPoints = Int((Double(points) * Double(step) / Double(steps)).rounded())
        }
        displayedPoints = points
        try? await Task.sleep(for: .milliseconds(1_000))
        confettiLive = false
    }
}

/// A short, dependency-free confetti burst drawn with Canvas. It runs about two seconds.
private struct ConfettiBurst: View {
    @State private var start = Date()
    @State private var finished = false
    private static let colors: [Color] = [Theme.gold, Theme.accentFill, Theme.successFill, Theme.errorFill, Theme.eveFill]
    private static let duration: Double = 2.0

    var body: some View {
        // Pause the timeline once the burst is over so the screen can go idle.
        TimelineView(.animation(minimumInterval: nil, paused: finished)) { context in
            let elapsed = context.date.timeIntervalSince(start)
            Canvas { canvas, size in
                guard elapsed < Self.duration else { return }
                for index in 0..<56 {
                    let seed = Double(index)
                    let spread = Self.noise(seed * 12.9898)
                    let lift = Self.noise(seed * 78.233)
                    let spin = Self.noise(seed * 3.7)
                    let vx = (spread - 0.5) * size.width * 1.1
                    let vy = -(size.height * (0.9 + lift * 0.9))
                    let gravity = size.height * 2.2
                    let t = elapsed
                    let x = size.width * 0.5 + vx * t
                    let y = size.height * 0.55 + vy * t + 0.5 * gravity * t * t
                    let fade = max(0, min(1, (Self.duration - t) / 0.6))
                    var piece = canvas
                    piece.opacity = fade
                    piece.translateBy(x: x, y: y)
                    piece.rotate(by: .radians((spin - 0.5) * 14 * t + seed))
                    let rect = CGRect(x: -4, y: -2.5, width: 8, height: 5)
                    piece.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(Self.colors[index % Self.colors.count]))
                }
            }
        }
        .task {
            try? await Task.sleep(for: .seconds(Self.duration + 0.1))
            finished = true
        }
    }

    private static func noise(_ value: Double) -> Double {
        let raw = sin(value) * 43_758.5453
        return raw - raw.rounded(.down)
    }
}
