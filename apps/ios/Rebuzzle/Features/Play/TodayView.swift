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
    @State private var dailyThoughtEditor = false
    @FocusState private var answerFocused: Bool
    @State private var wrongGuessShakes: CGFloat = 0
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
                            DifficultyBadge(difficulty: daily.puzzle.difficulty)
                                .accessibilityIdentifier("dailyDifficultyTier")
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
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.ink.opacity(0.20), lineWidth: 1))
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
                                .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                                .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.accent.opacity(0.18), lineWidth: 1))
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
                                answerField
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
                    if model.canSaveDailyThought {
                        Button {
                            dismissAnswerKeyboard()
                            dailyThoughtEditor = true
                        } label: {
                            Group {
                                if typeSize.isAccessibilitySize {
                                    VStack(alignment: .leading, spacing: 10) {
                                        HStack(alignment: .top, spacing: 10) {
                                            dailyThoughtIcon
                                            Text("Save a thought")
                                                .font(Theme.font(15, weight: .semibold))
                                                .foregroundStyle(Theme.ink)
                                                .fixedSize(horizontal: false, vertical: true)
                                            Spacer(minLength: 4)
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundStyle(Theme.secondary)
                                                .padding(.top, 10)
                                        }
                                        Text(dailyThoughtSubtitle)
                                            .font(Theme.font(12))
                                            .foregroundStyle(Theme.secondary)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                } else {
                                    HStack(spacing: 12) {
                                        dailyThoughtIcon
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text("Save a thought")
                                                .font(Theme.font(15, weight: .semibold))
                                                .foregroundStyle(Theme.ink)
                                            Text(dailyThoughtSubtitle)
                                                .font(Theme.font(12))
                                                .foregroundStyle(Theme.secondary)
                                                .fixedSize(horizontal: false, vertical: true)
                                        }
                                        Spacer(minLength: 4)
                                        Image(systemName: "chevron.right")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(Theme.secondary)
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
                            .padding(.horizontal, 12)
                            .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                            .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.accent.opacity(0.16), lineWidth: 1))
                            .contentShape(RoundedRectangle(cornerRadius: Theme.radius))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Save a thought")
                        .accessibilityHint("Write a private note and return to it later. It is not sent to Eve or submitted as an answer.")
                        .accessibilityIdentifier("saveDailyThought")
                    }
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
        .sheet(isPresented: $dailyThoughtEditor) {
            DailyThoughtSheet()
        }
        .refreshable { await model.load() }
        .onChange(of: model.daily?.puzzle.id) { _, _ in
            continuedScoreLockedPuzzleID = nil
            showingExpiredReviewFor = nil
            dismissedExpiredReviewID = nil
        }
        .onChange(of: model.canSaveDailyThought) { _, canSave in
            if !canSave { dailyThoughtEditor = false }
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
    /// Kept out of `body`, which is already near the type checker's time budget.
    private var answerField: some View {
        @Bindable var model = model
        return TextField("Your answer", text: $model.draft, prompt: Text("Your answer…").foregroundStyle(Theme.secondary), axis: .horizontal)
            .lineLimit(1...3).textInputAutocapitalization(.never).autocorrectionDisabled()
            .submitLabel(.go).focused($answerFocused).modifier(FieldStyle())
            // The padded box reads as the field, so a tap anywhere in it should focus.
            .contentShape(RoundedRectangle(cornerRadius: Theme.radius))
            .simultaneousGesture(TapGesture().onEnded { answerFocused = true })
            .accessibilityLabel("Your answer")
            .accessibilityIdentifier("answerField")
            .onSubmit { submitAnswer() }
            .onChange(of: model.draft) { _, _ in model.saveDraft() }
            .modifier(WrongGuessShake(shakes: wrongGuessShakes))
            .onChange(of: model.game?.attempts.count, shakeAfterWrongGuess)
    }
    private func shakeAfterWrongGuess(from old: Int?, to new: Int?) {
        guard let old, let new, new > old, !reduceMotion, let game = model.game,
              game.gameOver != true, game.attempts.last?.correct == false else { return }
        withAnimation(.linear(duration: 0.4)) { wrongGuessShakes += 1 }
    }
    private func submitAnswer() {
        dismissAnswerKeyboard()
        Task { await model.submit() }
    }
    private func dismissAnswerKeyboard(forceResign: Bool = false) {
        let shouldResign = answerFocused || forceResign
        answerFocused = false
        guard shouldResign else { return }
        // Let SwiftUI commit the FocusState change before asking UIKit to resign.
        // Sending both in the same update can leave a large-type TextField visually
        // unfocused but unable to reacquire the keyboard on its next tap.
        Task { @MainActor in
            await Task.yield()
            guard !answerFocused else { return }
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
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
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: Theme.radius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.secondary.opacity(0.25), lineWidth: 1))
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
        .background(Theme.field, in: RoundedRectangle(cornerRadius: Theme.radius))
        .overlay(RoundedRectangle(cornerRadius: Theme.radius).strokeBorder(Theme.accent.opacity(0.28), lineWidth: 1))
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
        .background(Theme.field, in: RoundedRectangle(cornerRadius: Theme.radius))
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
    private var dailyThoughtIcon: some View {
        Image(systemName: "pencil.and.list.clipboard")
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Theme.accent)
            .frame(width: 42, height: 42)
            .background(Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: Theme.radius))
    }
    private var dailyThoughtSubtitle: String {
        model.dailyThought.isEmpty ? "Leave yourself a clue for later" : "Your thought is saved on this device"
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
                .background(Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: Theme.radius))
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
