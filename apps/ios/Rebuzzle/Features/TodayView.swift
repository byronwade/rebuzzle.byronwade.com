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
    @State private var guessHapticEvent: GuessHapticEvent?
    @State private var guessRevealEvent: GuessTurnRevealEvent?
    @State private var pendingGuessSubmission: PendingGuessSubmission?
    @State private var answerSubmissionInFlight = false
    var body: some View {
        @Bindable var model = model
        ScrollViewReader { scroll in
        Page(spacing: 18, bottomSafeAreaClearance: 0) {
            if let daily = model.daily {
                if model.game?.gameOver != true {
                    VStack(alignment: .leading, spacing: 6) {
                        let masthead = typeSize.isAccessibilitySize
                            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                            : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
                        masthead {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("TODAY’S PUZZLE")
                                    .font(Theme.font(11, weight: .semibold, relativeTo: .caption))
                                    .tracking(1.1)
                                    .foregroundStyle(Theme.secondary)
                                Text("Make it click.")
                                    .font(Theme.display(typeSize.isAccessibilitySize ? 38 : 34)).tracking(-1.2)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
                            EveAvatar(celebrating: model.game?.wasSuccessful == true)
                                .accessibilityLabel("Eve, your AI puzzle author")
                        }
                        puzzleDateAndCountdown
                        if let snapshot = model.journeySnapshot,
                           snapshot.backfill.status == .complete,
                           let summary = snapshot.summary {
                            WeeklyTrailTodayCard(
                                progress: JourneyProgress(summary: summary),
                                reward: snapshot.weeklyTrailReward
                            ) {
                                model.selectedTab = .journey
                            }
                        }
                    }
                    .id("dailyHeader")
                }
                if model.game?.gameOver == true {
                    ResultView(shareRequest: $dailyShareRequest)
                        .id("dailyResult")
                    conversation
                } else {
                    PuzzleArenaView(puzzle: daily.puzzle) {
                        openStudyPuzzle(daily.puzzle)
                    }
                    VStack(alignment: .leading, spacing: 14) {
                        if model.game?.attempts.isEmpty == false || !model.nudgeReveals.isEmpty || visiblePendingGuessSubmission != nil { conversation }
                        if model.game?.scoreLocked == true {
                            scoreLockCard.id("scoreLockCard")
                        }
                        if let review = model.game?.expiredReview, dismissedExpiredReviewID != review.puzzleId {
                            expiredReviewCard(review)
                        }
                    }
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
                            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.accent.opacity(0.16), lineWidth: 1))
                            .contentShape(RoundedRectangle(cornerRadius: 16))
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
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if model.daily != nil, model.game?.gameOver != true, !awaitingScoreLockDecision {
                answerComposer
            }
        }
        .onChange(of: model.game?.attempts.count) { old, new in
            guard let old, let new, new > old else { return }
            let isAwaitingScoreLockDecision = awaitingScoreLockDecision
            let destination: String
            if model.game?.gameOver == true {
                destination = "dailyResult"
            } else if isAwaitingScoreLockDecision {
                destination = "scoreLockCard"
            } else if let latestGuess = model.game?.attempts.last {
                destination = "turn-\(latestGuess.attemptNumber)"
            } else {
                return
            }
            let anchor: UnitPoint = model.game?.gameOver == true || isAwaitingScoreLockDecision
                ? .top
                : .bottom
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo(destination, anchor: anchor)
                }
            }
        }
        .onChange(of: visiblePendingGuessSubmission?.id) { old, new in
            guard old != new, let submission = visiblePendingGuessSubmission else { return }
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo("pending-turn-\(submission.attemptNumber)", anchor: .bottom)
                }
            }
        }
        .onChange(of: model.nudgeReveals.count) { old, new in
            guard new > old else { return }
            guard let latestHintIndex = model.nudgeReveals.map(\.hintIndex).max() else { return }
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo("eveNudge-\(latestHintIndex + 1)", anchor: .bottom)
                }
            }
        }
        .onChange(of: model.eve.requestedNudgeFollowUpHintIndexes.count) { old, new in
            guard new > old, let hintIndex = model.eve.requestedNudgeFollowUpHintIndexes.max() else { return }
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                    scroll.scrollTo("eveNudge-\(hintIndex + 1)", anchor: .bottom)
                }
            }
        }
        .onChange(of: model.eve.nudgeFollowUpReplies.count) { old, new in
            guard new > old, let hintIndex = model.eve.nudgeFollowUpReplies.keys.max() else { return }
            Task { @MainActor in
                await Task.yield()
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                    scroll.scrollTo("eveNudge-\(hintIndex + 1)", anchor: .bottom)
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
                if let daily = model.daily {
                    Button("View puzzle", systemImage: "arrow.up.left.and.arrow.down.right") {
                        openStudyPuzzle(daily.puzzle)
                    }
                    .accessibilityIdentifier("viewPuzzleFromToolbar")
                }
            }
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
                Button {
                    submitAnswer()
                } label: {
                    if model.submitting {
                        HStack(spacing: 8) {
                            ProgressView().controlSize(.mini)
                            Text("Checking…")
                        }
                    } else {
                        Label("Check answer", systemImage: "arrow.right")
                    }
                }
                .disabled(model.submitting || model.busy || !model.sessionReady || model.needsReconciliation)
                .accessibilityLabel(model.submitting ? "Checking answer" : "Check answer")
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
            dismissAnswerKeyboard()
            pendingGuessSubmission = nil
            continuedScoreLockedPuzzleID = nil
            showingExpiredReviewFor = nil
            dismissedExpiredReviewID = nil
        }
        .onChange(of: model.daily?.puzzleDate) { _, _ in
            dismissAnswerKeyboard()
            pendingGuessSubmission = nil
        }
        .onChange(of: model.player?.id) { _, _ in
            pendingGuessSubmission = nil
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
        .modifier(GuessHapticFeedback(event: guessHapticEvent, enabled: haptics))
        .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: model.game?.gameOver)
    }
    private var answerComposer: some View {
        VStack(alignment: .leading, spacing: 10) {
            if typeSize.isAccessibilitySize {
                askEveComposerButton
            }
            if let game = model.game,
               game.scoreLocked == true,
               continuedScoreLockedPuzzleID == game.puzzleId {
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .accessibilityHidden(true)
                    Text("Score locked · solve at your pace")
                        .accessibilityIdentifier("continuedSolveStatus")
                }
                .font(Theme.font(typeSize.isAccessibilitySize ? 14 : 12, weight: .medium))
                .foregroundStyle(Theme.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 10) {
                if !typeSize.isAccessibilitySize {
                    askEveComposerButton
                }
                answerField
                if model.sessionReady && !model.needsReconciliation {
                    Button { submitAnswer() } label: {
                        Group {
                            if model.submitting {
                                ProgressView().controlSize(.small).tint(Theme.canvas)
                            } else {
                                Image(systemName: "arrow.up")
                                    .font(.system(size: 18, weight: .semibold))
                            }
                        }
                        .frame(width: 52, height: 52)
                        .foregroundStyle(Theme.canvas)
                        .background(Theme.ink, in: RoundedRectangle(cornerRadius: 14))
                    }
                    .buttonStyle(.plain)
                    .disabled(model.submitting || model.busy)
                    .accessibilityLabel(model.submitting ? "Checking answer" : "Check answer")
                    .accessibilityHint("Send your guess to Eve for feedback.")
                    .accessibilityIdentifier("checkAnswer")
                }
            }
            if let error = model.error { Notice(message: error) }
            if model.needsReconciliation || !model.sessionReady {
                Button { Task { await model.load() } } label: {
                    HStack {
                        if model.busy { ProgressView().tint(Theme.canvas) }
                        Text("Refresh progress")
                        Image(systemName: "arrow.clockwise")
                    }
                }
                .buttonStyle(CommitStyle())
                .disabled(model.busy)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .frame(maxWidth: 600)
        .frame(maxWidth: .infinity)
        .background(Theme.canvas)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.secondary.opacity(0.16)).frame(height: 1)
        }
    }
    @ViewBuilder private var askEveComposerButton: some View {
        if let daily = model.daily, model.hintsShown < daily.puzzle.hints.count {
            let hintsRemaining = daily.puzzle.hints.count - model.hintsShown
            Button { revealEveHint() } label: {
                if typeSize.isAccessibilitySize {
                    HStack(spacing: 10) {
                        EveAvatar(size: 30).accessibilityHidden(true)
                        Text("Ask Eve for a nudge")
                            .font(Theme.font(14, weight: .semibold, relativeTo: .body))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 8)
                        Text("\(hintsRemaining) left")
                            .font(Theme.font(12, weight: .medium, relativeTo: .caption))
                            .foregroundStyle(Theme.secondary)
                    }
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.accent.opacity(0.18), lineWidth: 1))
                } else {
                    ZStack(alignment: .topTrailing) {
                        VStack(spacing: 0) {
                            EveAvatar(size: 26).accessibilityHidden(true)
                            Text("NUDGE")
                                .font(Theme.font(9, weight: .bold, relativeTo: .caption2))
                                .tracking(0.2)
                                .foregroundStyle(Theme.accent)
                        }
                        Text("\(hintsRemaining)")
                            .font(Theme.font(9, weight: .bold, relativeTo: .caption2))
                            .foregroundStyle(Theme.canvas)
                            .frame(width: 16, height: 16)
                            .background(Theme.accent, in: Circle())
                            .overlay(Circle().strokeBorder(Theme.panel, lineWidth: 1))
                            .offset(x: 2, y: -2)
                    }
                    .frame(width: 52, height: 52)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.accent.opacity(0.18), lineWidth: 1))
                }
            }
            .buttonStyle(.plain)
            .disabled(!model.sessionReady || model.submitting || answerSubmissionInFlight)
            .accessibilityLabel("Ask Eve for a nudge")
            .accessibilityValue("\(hintsRemaining) hints left")
            .accessibilityHint("Reveals the next hint in your conversation.")
            .accessibilityIdentifier("askEveForNudge")
        }
    }
    private func revealEveHint() {
        let previous = model.hintsShown
        model.revealHint()
        if model.hintsShown > previous { hintFeedback += 1 }
    }
    /// Kept out of `body`, which is already near the type checker’s time budget.
    private var answerField: some View {
        @Bindable var model = model
        return TextField("Your answer", text: $model.draft, prompt: Text("Your answer…").foregroundStyle(Theme.secondary), axis: .horizontal)
            .lineLimit(1...3).textInputAutocapitalization(.never).autocorrectionDisabled()
            .submitLabel(.go).focused($answerFocused).modifier(FieldStyle())
            // The padded box reads as the field, so a tap anywhere in it should focus.
            .contentShape(RoundedRectangle(cornerRadius: 10))
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
    private func openStudyPuzzle(_ puzzle: Puzzle) {
        dismissAnswerKeyboard(forceResign: true)
        study = PuzzleStudy(puzzle: puzzle)
    }
    private func submitAnswer() {
        guard !answerSubmissionInFlight else { return }
        answerSubmissionInFlight = true
        let puzzleID = model.daily?.puzzle.id
        let puzzleDate = model.daily?.puzzleDate
        let attemptCount = model.game?.attempts.count ?? 0
        let submittedGuess = model.draft.trimmingCharacters(in: .whitespacesAndNewlines)
        let pendingSubmission: PendingGuessSubmission?
        if let puzzleID, let puzzleDate, let accountID = model.player?.id,
           model.sessionReady, !model.submitting, !model.busy, !model.needsReconciliation,
           model.game?.gameOver == false, !submittedGuess.isEmpty, submittedGuess.count <= 200 {
            pendingSubmission = PendingGuessSubmission(
                puzzleID: puzzleID,
                puzzleDate: puzzleDate,
                accountID: accountID,
                attemptNumber: attemptCount + 1,
                guess: submittedGuess
            )
        } else {
            pendingSubmission = nil
        }
        Task { @MainActor in
            defer {
                answerSubmissionInFlight = false
                if let pendingSubmission, pendingGuessSubmission == pendingSubmission {
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                        pendingGuessSubmission = nil
                    }
                }
            }
            let revealEvent: GuessTurnRevealEvent?
            if let puzzleID, let puzzleDate {
                revealEvent = GuessTurnRevealEvent(
                    puzzleID: puzzleID,
                    puzzleDate: puzzleDate,
                    attemptNumber: attemptCount + 1
                )
                guessRevealEvent = revealEvent
            } else {
                revealEvent = nil
            }
            await model.submit(answer: submittedGuess, onGuessRequestStarted: {
                guard let pendingSubmission,
                      model.daily?.puzzle.id == pendingSubmission.puzzleID,
                      model.daily?.puzzleDate == pendingSubmission.puzzleDate,
                      model.player?.id == pendingSubmission.accountID,
                      model.game?.attempts.count == pendingSubmission.attemptNumber - 1 else { return }
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                    pendingGuessSubmission = pendingSubmission
                }
            })
            let isCurrentPuzzle = model.daily?.puzzle.id == puzzleID && model.daily?.puzzleDate == puzzleDate
            if !isCurrentPuzzle || model.game?.gameOver == true || awaitingScoreLockDecision {
                dismissAnswerKeyboard()
            }
            guard let puzzleID, let puzzleDate,
                  model.daily?.puzzle.id == puzzleID,
                  model.daily?.puzzleDate == puzzleDate,
                  model.game?.attempts.count == attemptCount + 1,
                  let guess = model.game?.attempts.last else {
                if let revealEvent, guessRevealEvent == revealEvent { guessRevealEvent = nil }
                return
            }
            guard !guess.correct, let tier = guess.reaction?.tier else { return }
            guessHapticEvent = GuessHapticEvent(
                puzzleID: puzzleID,
                puzzleDate: puzzleDate,
                attemptNumber: guess.attemptNumber,
                tier: tier
            )
        }
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
                        if let puzzleID = model.game?.puzzleId {
                            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                                continuedScoreLockedPuzzleID = puzzleID
                            }
                        }
                        Task { @MainActor in
                            await Task.yield()
                            answerFocused = true
                        }
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
                              revealsResult: guessRevealEvent?.matches(
                                  guess,
                                  puzzleID: model.daily?.puzzle.id,
                                  puzzleDate: model.daily?.puzzleDate
                              ) == true,
                                  onRetry: { _ = model.eve.retry(guess: guess) })
                        .id("turn-\(guess.attemptNumber)")
                case .nudge(let reveal):
                    if let daily = model.daily, daily.puzzle.hints.indices.contains(reveal.hintIndex) {
                        let followUpWasRequested = model.eve.requestedNudgeFollowUpHintIndexes.contains(reveal.hintIndex)
                        EveNudgeTurnView(
                            number: reveal.hintIndex + 1,
                            hint: daily.puzzle.hints[reveal.hintIndex],
                            followUpWasRequested: followUpWasRequested,
                            followUpPending: model.eve.pendingNudgeFollowUpHintIndexes.contains(reveal.hintIndex),
                            followUpFailed: model.eve.failedNudgeFollowUpHintIndexes.contains(reveal.hintIndex),
                            followUpReply: model.eve.nudgeFollowUpReplies[reveal.hintIndex],
                            canRetryFollowUp: model.game?.gameOver == false && model.eve.canRetryNudgeFollowUp(hintIndex: reveal.hintIndex),
                            canAskFollowUp: model.game?.gameOver == false && !followUpWasRequested,
                            onAskFollowUp: { model.requestEveNudgeFollowUp(hintIndex: reveal.hintIndex) },
                            onRetryFollowUp: { model.requestEveNudgeFollowUp(hintIndex: reveal.hintIndex, retry: true) }
                        )
                            .id("eveNudge-\(reveal.hintIndex + 1)")
                    }
                }
            }
            if let submission = visiblePendingGuessSubmission {
                PendingGuessTurnView(submission: submission)
                    .id("pending-turn-\(submission.attemptNumber)")
                    .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.16), value: visiblePendingGuessSubmission?.id)
    }
    private var visiblePendingGuessSubmission: PendingGuessSubmission? {
        guard let submission = pendingGuessSubmission,
              submission.puzzleID == model.daily?.puzzle.id,
              submission.puzzleDate == model.daily?.puzzleDate,
              submission.accountID == model.player?.id,
              model.game?.gameOver != true,
              model.game?.attempts.contains(where: { $0.attemptNumber == submission.attemptNumber }) != true else {
            return nil
        }
        return submission
    }
    private var dailyThoughtIcon: some View {
        Image(systemName: "pencil.and.list.clipboard")
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(Theme.accent)
            .frame(width: 42, height: 42)
            .background(Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 13))
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
    @ViewBuilder
    private var puzzleDateAndCountdown: some View {
        let date = Text(dateLabel)
            .font(Theme.font(13, relativeTo: .subheadline))
            .foregroundStyle(Theme.secondary)

        if typeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 8) {
                date
                activeStreakBadge
                DailyPuzzleCountdown(style: .compact)
            }
        } else {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 10) {
                    date
                    Spacer(minLength: 4)
                    activeStreakBadge
                    DailyPuzzleCountdown(style: .compact)
                }
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        date
                        Spacer(minLength: 4)
                        activeStreakBadge
                    }
                    DailyPuzzleCountdown(style: .compact)
                }
            }
        }
    }

    @ViewBuilder
    private var activeStreakBadge: some View {
        if let streak = model.stats?.streak, streak > 0 {
            HStack(spacing: 5) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.reward)
                    .accessibilityHidden(true)
                Text("\(streak)-day streak")
                    .font(Theme.font(12, weight: .semibold, relativeTo: .caption))
                    .foregroundStyle(Theme.ink)
                    .fixedSize()
            }
            .padding(.horizontal, 10)
            .frame(minHeight: 32)
            .background(Theme.reward.opacity(0.12), in: Capsule())
            .overlay(Capsule().strokeBorder(Theme.reward.opacity(0.24), lineWidth: 1))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(streak) day streak")
            .accessibilityIdentifier("todayStreakBadge")
            .transition(reduceMotion ? .identity : .scale.combined(with: .opacity))
        }
    }

}

private struct DailyThoughtSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @FocusState private var editorFocused: Bool
    @State private var thought = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Pick up where you left off.")
                            .font(Theme.display(30))
                            .tracking(-0.6)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Jot down a connection, a hunch, or what you want to try next.")
                            .font(Theme.font(15))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("TODAY’S THOUGHT")
                                .font(Theme.font(11, weight: .semibold))
                                .tracking(1.1)
                                .foregroundStyle(Theme.secondary)
                            Spacer()
                            Text("\(thought.count)/600")
                                .font(Theme.font(12, weight: .medium))
                                .monospacedDigit()
                                .foregroundStyle(Theme.secondary)
                                .accessibilityLabel("\(thought.count) of 600 characters")
                        }
                        ZStack(alignment: .topLeading) {
                            if thought.isEmpty {
                                Text("What have you noticed so far?")
                                    .font(.body)
                                    .foregroundStyle(Theme.secondary.opacity(0.78))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 9)
                                    .allowsHitTesting(false)
                            }
                            TextEditor(text: $thought)
                                .font(.body)
                                .foregroundStyle(Theme.ink)
                                .scrollContentBackground(.hidden)
                                .focused($editorFocused)
                                .accessibilityLabel("Private thought for today’s puzzle")
                                .accessibilityHint("Saved on this device and never sent to Eve or submitted as a guess.")
                                .accessibilityIdentifier("dailyThoughtEditor")
                        }
                        .frame(minHeight: 176)
                        .padding(8)
                        .background(Theme.canvas, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.20), lineWidth: 1))
                        Text("Saved on this device for today’s puzzle. It is never sent to Eve, submitted as a guess, or shared.")
                            .font(Theme.font(12))
                            .foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if !thought.isEmpty {
                        Button("Clear thought", systemImage: "trash") {
                            thought = ""
                            editorFocused = false
                            model.saveDailyThought("")
                        }
                        .font(Theme.font(14, weight: .semibold))
                        .foregroundStyle(Theme.secondary)
                        .frame(minHeight: 44, alignment: .leading)
                        .accessibilityIdentifier("clearDailyThought")
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Theme.canvas.ignoresSafeArea())
            .navigationTitle("Save a thought")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        editorFocused = false
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .accessibilityIdentifier("closeDailyThought")
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { editorFocused = false }
                        .accessibilityIdentifier("dismissDailyThoughtKeyboard")
                }
            }
            .onAppear { thought = model.dailyThought }
            .onChange(of: model.dailyThought) { _, updated in
                if thought != updated { thought = updated }
            }
            .onChange(of: model.canSaveDailyThought) { _, canSave in
                guard !canSave else { return }
                thought = ""
                editorFocused = false
                dismiss()
            }
            .onChange(of: thought) { _, updated in
                let bounded = String(updated.prefix(600))
                if bounded != updated { thought = bounded }
                model.saveDailyThought(bounded)
            }
        }
        .presentationDetents(typeSize.isAccessibilitySize ? [.large] : [.medium, .large])
        .presentationDragIndicator(.visible)
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
                PuzzleNotebookStudyContent(puzzle: puzzle)
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
    /// Celebrate a solve once per puzzle, not every time the result is reopened.
    @AppStorage("celebratedDailyPuzzleID") private var celebratedPuzzleID = ""
    @State private var celebrating = false
    @Binding var shareRequest: DailyResultShareRequest?
    @State private var renderedShareSummary: DailyShareSummary?
    @State private var renderedSharePNG: Data?
    private var matchingDailyPuzzle: Puzzle? {
        guard let game = model.game,
              let daily = model.daily,
              game.puzzleId == daily.puzzle.id,
              game.puzzleDate == daily.puzzleDate else { return nil }
        return daily.puzzle
    }
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
            VStack(alignment: .leading, spacing: typeSize.isAccessibilitySize ? 24 : 12) {
                VStack(alignment: .leading, spacing: typeSize.isAccessibilitySize ? 16 : 12) {
                    let lateSolve = game.wasSuccessful == true && game.scoreLocked == true && game.attempts.count > game.maxAttempts
                    let resultHeroLayout = typeSize.isAccessibilitySize
                        ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
                        : AnyLayout(HStackLayout(alignment: .center, spacing: 14))
                    resultHeroLayout {
                        VStack(alignment: .leading, spacing: typeSize.isAccessibilitySize ? 16 : 12) {
                            Text(game.wasSuccessful == true ? "Aha!" : "The reveal.")
                                .font(Theme.display(game.wasSuccessful == true ? (typeSize.isAccessibilitySize ? 80 : 64) : 48)).tracking(-2)
                                .foregroundStyle(game.wasSuccessful == true ? Theme.reward : Theme.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Label(game.wasSuccessful == true ? "You found it." : "Here’s the connection.", systemImage: game.wasSuccessful == true ? "checkmark.seal.fill" : "eye")
                                .font(Theme.font(14, weight: .medium)).foregroundStyle(game.wasSuccessful == true ? Theme.reward : Theme.secondary)
                        }
                        if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                        EveAvatar(
                            size: typeSize.isAccessibilitySize ? 52 : 68,
                            celebrating: game.wasSuccessful == true && celebrating
                        )
                        .padding(typeSize.isAccessibilitySize ? 0 : 8)
                        .background(
                            (game.wasSuccessful == true ? Theme.reward : Theme.accent).opacity(0.09),
                            in: Circle()
                        )
                        .accessibilityHidden(true)
                    }
                    Text(game.revealedAnswer ?? "Puzzle complete")
                        .font(Theme.display(typeSize.isAccessibilitySize ? 32 : 30)).tracking(-0.8).textSelection(.enabled)
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
                    NavigationLink(value: RebuzzleRoute.archive) {
                        Label("Find another puzzle", systemImage: "arrow.right")
                            .padding(.horizontal, 16).padding(.vertical, 8)
                    }
                    .buttonStyle(CommitStyle())
                    .accessibilityIdentifier("findAnotherPuzzle")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(typeSize.isAccessibilitySize ? 24 : 16).background(Theme.panel, in: RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(game.wasSuccessful == true ? Theme.reward.opacity(0.40) : Theme.secondary.opacity(0.20), lineWidth: 1))
                .overlay(alignment: .top) { CelebrationBurst(isActive: celebrating) }
                .onAppear { celebrateFirstSolve(of: game) }
                if game.wasSuccessful == true, let puzzle = matchingDailyPuzzle {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("The puzzle")
                            .font(Theme.font(15, weight: .semibold))
                            .foregroundStyle(Theme.ink)
                        PuzzleBoard(puzzle: puzzle)
                    }
                    .padding(16)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.secondary.opacity(0.20), lineWidth: 1))
                    .accessibilityIdentifier("solvedPuzzleReveal")
                }
                DailyStreakCard(presentation: model.streakPresentation(for: game), context: .result)
                if let summary = game.dailyShareSummary {
                    dailyShareAction(summary)
                } else {
                    ShareLink(item: game.shareText) {
                        Label("Challenge a friend", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity, minHeight: 48)
                    }
                        .buttonStyle(.bordered)
                        .tint(Theme.ink)
                        .accessibilityIdentifier("dailyResultShare")
                }
                Text("Same puzzle. Your answer stays a secret.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                DailyReturnCard()
                JourneyRewards(game: game)
                DisclosureGroup {
                    VStack(alignment: .leading, spacing: 20) {
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
                        let metrics = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 20)) : AnyLayout(HStackLayout(spacing: 32))
                        metrics {
                            resultMetric(
                                hasContinuationGuesses ? "\(game.attempts.count)" : "\(game.attempts.count)/\(game.maxAttempts)",
                                hasContinuationGuesses ? "Total guesses" : "Guesses"
                            )
                            resultMetric("\(model.hintsShown)", "Hints")
                            resultMetric("\(model.journal.entries.count)", "Days played here")
                        }
                    }
                    .padding(.top, 12)
                } label: {
                    // Identify only the toggle: an identifier on the whole group would
                    // overwrite the solve-pulse and metric identifiers nested inside it.
                    Label("Your round", systemImage: "chart.bar.fill")
                        .accessibilityIdentifier("dailyResultRoundDetails")
                }
                .font(Theme.font(14, weight: .medium))
                .tint(Theme.ink)
                .padding(18)
                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
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
                if game.wasSuccessful != true, let puzzle = matchingDailyPuzzle {
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
                .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(.bordered)
        .tint(Theme.ink)
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let firstSession: Bool
    @AppStorage("haptics") private var haptics = true
    @FocusState private var tutorialAnswerFocused: Bool
    @State private var tutorialAnswer = ""
    @State private var tutorialHintShown = false
    @State private var tutorialSolved = false
    @State private var tutorialReply: String?

    init(firstSession: Bool = false) {
        self.firstSession = firstSession
    }

    var body: some View {
        NavigationStack {
            Page {
                if firstSession {
                    firstSessionTutorial
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
                    Button {
                        dismissTutorialKeyboard()
                        dismiss()
                    } label: {
                        Label(tutorialSolved ? "Let’s play today" : "Skip to today", systemImage: tutorialSolved ? "arrow.right" : "forward.end")
                    }
                    .buttonStyle(CommitStyle())
                    .accessibilityLabel(tutorialSolved ? "Let’s play today" : "Skip to today")
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
                if firstSession {
                    ToolbarItemGroup(placement: .keyboard) {
                        Button("Hide keyboard", systemImage: "keyboard.chevron.compact.down") {
                            dismissTutorialKeyboard(forceResign: true)
                        }
                        .accessibilityIdentifier("quickStartDismissKeyboard")
                        Spacer()
                        Button("Check answer", systemImage: "arrow.right") {
                            checkTutorialAnswer()
                        }
                        .disabled(tutorialAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || tutorialSolved)
                        .accessibilityIdentifier("quickStartCheckAnswerFromKeyboard")
                    }
                }
            }
        }
        .sensoryFeedback(.success, trigger: tutorialSolved) { _, solved in solved && haptics }
    }

    private var firstSessionTutorial: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "QUICK PRACTICE ROUND")
                Text("Make it click.")
                    .font(Theme.font(30, weight: .medium))
                    .fixedSize(horizontal: false, vertical: true)
                Text("Try one tiny rebus with Eve. Nothing here counts toward today’s score.")
                    .font(Theme.font(17)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: 16) {
                Eyebrow(text: tutorialSolved ? "THAT’S THE AHA" : "YOUR FIRST CLUE")
                HStack(spacing: 12) {
                    tutorialPicture("☀️", label: "Sun")
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Theme.secondary)
                        .accessibilityHidden(true)
                    tutorialPicture("🌼", label: "Flower")
                }
                .frame(maxWidth: .infinity)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Sun plus flower")

                if tutorialSolved {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("SUNFLOWER")
                            .font(Theme.font(11, weight: .semibold)).tracking(1.1)
                            .foregroundStyle(Theme.reward)
                        Text("Sun + flower. A familiar word hiding in two pictures.")
                            .font(Theme.font(16, weight: .medium))
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("quickStartSolved")
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Theme.reward.opacity(0.10), in: RoundedRectangle(cornerRadius: 14))
                    .transition(reduceMotion ? .identity : .scale.combined(with: .opacity))
                } else {
                    Text("Read the pictures from left to right. Join the two words.")
                        .font(Theme.font(15, weight: .medium))
                        .foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Theme.ink.opacity(0.14), lineWidth: 1))

            if let tutorialReply {
                HStack(alignment: .top, spacing: 10) {
                    EveAvatar()
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 5) {
                        Text("EVE")
                            .font(Theme.font(10, weight: .semibold)).tracking(1)
                            .foregroundStyle(Theme.accent)
                        Text(tutorialReply)
                            .font(Theme.font(15))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                }
                .accessibilityElement(children: .combine)
                .accessibilityIdentifier("quickStartEveReply")
                .transition(reduceMotion ? .identity : .move(edge: .top).combined(with: .opacity))
            }

            if !tutorialSolved {
                VStack(alignment: .leading, spacing: 12) {
                    TextField("Your answer", text: $tutorialAnswer, prompt: Text("Put the words together…"))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.go)
                        .focused($tutorialAnswerFocused)
                        .modifier(FieldStyle())
                        .accessibilityLabel("Practice answer")
                        .accessibilityIdentifier("quickStartTutorialAnswer")
                        .onSubmit(checkTutorialAnswer)

                    Button(action: checkTutorialAnswer) {
                        Label("Check answer", systemImage: "arrow.right")
                    }
                    .buttonStyle(CommitStyle())
                    .disabled(tutorialAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityIdentifier("quickStartCheckAnswer")

                    if !tutorialHintShown {
                        Button {
                            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                                tutorialHintShown = true
                                tutorialReply = "Say each picture’s name, then read them in order."
                            }
                            dismissTutorialKeyboard()
                        } label: {
                            HStack(spacing: 10) {
                                EveAvatar().accessibilityHidden(true)
                                Text("Ask Eve for a nudge")
                                    .font(Theme.font(14, weight: .semibold))
                            }
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(Theme.accent)
                        .accessibilityIdentifier("quickStartAskEve")
                    }
                }
                .padding(16)
                .background(Theme.field.opacity(0.55), in: RoundedRectangle(cornerRadius: 16))
            }

            HStack(spacing: 8) {
                Image(systemName: "sparkles").foregroundStyle(Theme.reward)
                Text("Practice only · your daily guesses stay fresh")
                    .font(Theme.font(13, weight: .medium)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityIdentifier("quickStartPracticeOnly")

            if !tutorialSolved {
                Text("Today has three scored guesses. You can keep solving after that.")
                    .font(Theme.font(14, weight: .medium)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .animation(reduceMotion ? nil : .spring(duration: 0.3, bounce: 0.12), value: tutorialSolved)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: tutorialReply)
    }

    private func tutorialPicture(_ emoji: String, label: String) -> some View {
        Text(emoji)
            .font(.system(size: 40))
            .frame(maxWidth: .infinity, minHeight: 76)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: 16))
            .accessibilityLabel(label)
    }

    private func checkTutorialAnswer() {
        guard !tutorialSolved else { return }
        let cleaned = tutorialAnswer
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            .filter { $0.isLetter }
        guard !cleaned.isEmpty else { return }
        dismissTutorialKeyboard()
        if cleaned == "sunflower" {
            withAnimation(reduceMotion ? nil : .spring(duration: 0.34, bounce: 0.18)) {
                tutorialSolved = true
                tutorialReply = "Exactly! You combined both pictures into one familiar word. That’s a rebus."
            }
        } else {
            let hasPictureWord = cleaned.contains("sun") || cleaned.contains("flower")
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
                tutorialReply = hasPictureWord
                    ? "You spotted one part. Try saying both pictures in order."
                    : "Try naming each picture, then joining the two words."
            }
        }
    }

    private func dismissTutorialKeyboard(forceResign: Bool = false) {
        let shouldResign = tutorialAnswerFocused || forceResign
        tutorialAnswerFocused = false
        guard shouldResign else { return }
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}

/// Conversation uses confirmed guesses and server feedback, never the hidden answer.
private struct PendingGuessSubmission: Equatable {
    let puzzleID: String
    let puzzleDate: String
    let accountID: String
    let attemptNumber: Int
    let guess: String

    var id: String { "\(accountID):\(puzzleID):\(puzzleDate):\(attemptNumber)" }
}

private struct PendingGuessTurnView: View {
    let submission: PendingGuessSubmission

    var body: some View {
        VStack(alignment: .trailing, spacing: 6) {
            Text("YOU · GUESS \(submission.attemptNumber)")
                .font(Theme.font(10, weight: .semibold)).tracking(1).foregroundStyle(Theme.secondary)
            Text(submission.guess)
                .font(Theme.font(17, weight: .medium)).textSelection(.enabled)
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(Theme.field, in: RoundedRectangle(cornerRadius: 16))
            HStack(spacing: 8) {
                ProgressView().controlSize(.mini)
                Text("Checking with Eve…").font(Theme.font(12)).foregroundStyle(Theme.secondary)
            }
            .padding(.trailing, 4)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.leading, 28)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Guess \(submission.attemptNumber): \(submission.guess). Checking with Eve.")
        .accessibilityIdentifier("pendingGuessTurn")
    }
}

struct GuessTurnView: View {
    let guess: Guess
    let reply: String?
    let pending: Bool
    let failed: Bool
    let canRetry: Bool
    let latest: Bool
    let revealsResult: Bool
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
                            EveSignalMeter(tier: reaction.tier, attemptNumber: guess.attemptNumber)
                            Text(reaction.line).font(Theme.font(15)).foregroundStyle(Theme.secondary)
                        }
                        if let reply, !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            Text(reply).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                                .accessibilityIdentifier("eveReply-\(guess.id)")
                        }
                        if pending {
                            EveTypingIndicator(
                                label: "Eve is thinking…",
                                identifier: "eveTypingIndicator-guess-\(guess.attemptNumber)"
                            )
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
        }
        .confirmedGuessReveal(isNewlyConfirmed: revealsResult)
        .accessibilityElement(children: .contain)
    }
}

private struct GuessTurnRevealEvent: Equatable {
    let puzzleID: String
    let puzzleDate: String
    let attemptNumber: Int

    func matches(_ guess: Guess, puzzleID: String?, puzzleDate: String?) -> Bool {
        self.puzzleID == puzzleID && self.puzzleDate == puzzleDate && self.attemptNumber == guess.attemptNumber
    }
}

private struct GuessHapticEvent: Equatable {
    let puzzleID: String
    let puzzleDate: String
    let attemptNumber: Int
    let tier: String
}

private struct GuessHapticFeedback: ViewModifier {
    let event: GuessHapticEvent?
    let enabled: Bool

    func body(content: Content) -> some View {
        content.sensoryFeedback(trigger: event) {
            feedback(for: event)
        }
    }

    private func feedback(for event: GuessHapticEvent?) -> SensoryFeedback? {
        guard enabled, let event else { return nil }
        switch event.tier {
        case "cold": return .impact(weight: .light)
        case "warm": return .impact(weight: .medium)
        case "close": return .impact(weight: .heavy)
        default: return nil
        }
    }
}

private struct EveNudgeTurnView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    let number: Int
    let hint: String
    let followUpWasRequested: Bool
    let followUpPending: Bool
    let followUpFailed: Bool
    let followUpReply: String?
    let canRetryFollowUp: Bool
    let canAskFollowUp: Bool
    let onAskFollowUp: () -> Void
    let onRetryFollowUp: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 10) {
                EveAvatar().accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 10) {
                    Text("Eve · A nudge")
                        .font(metadataFont).foregroundStyle(Theme.secondary)
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

            if canAskFollowUp {
                HStack {
                    Spacer(minLength: 40)
                    Button(action: onAskFollowUp) {
                        HStack(spacing: 8) {
                            Image(systemName: "sparkle.magnifyingglass")
                                .font(.system(size: 14, weight: .semibold))
                                .accessibilityHidden(true)
                            Text("What should I look at?")
                                .font(Theme.font(14, weight: .semibold))
                                .fixedSize(horizontal: false, vertical: true)
                            Image(systemName: "arrow.up.left")
                                .font(.system(size: 11, weight: .bold))
                                .accessibilityHidden(true)
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 48)
                        .foregroundStyle(Theme.accent)
                        .background(Theme.accent.opacity(0.09), in: Capsule())
                        .overlay(Capsule().strokeBorder(Theme.accent.opacity(0.18), lineWidth: 1))
                        .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Ask Eve what to look at")
                    .accessibilityHint("Eve will give one short, answer-free observation about this nudge.")
                    .accessibilityIdentifier("askEveAboutNudge-\(number)")
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            if followUpWasRequested {
                HStack {
                    Spacer(minLength: 56)
                    Text("What should I look at?")
                        .font(Theme.font(15, weight: .medium))
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 15)
                        .padding(.vertical, 12)
                        .foregroundStyle(Theme.canvas)
                        .background(Theme.accent, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .accessibilityIdentifier("eveNudgeQuestion-\(number)")
                }
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            }

            if followUpPending || followUpFailed || followUpReply != nil {
                HStack(alignment: .top, spacing: 10) {
                    EveAvatar(size: 34).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Eve · A closer look")
                            .font(metadataFont).foregroundStyle(Theme.secondary)

                        if followUpPending {
                            EveTypingIndicator(
                                label: "Taking a closer look…",
                                identifier: "eveTypingIndicator-nudge-\(number)"
                            )
                            .padding(16).frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                        } else if let followUpReply {
                            Text(followUpReply)
                                .font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                                .padding(16).frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.accent.opacity(0.14), lineWidth: 1))
                                .accessibilityIdentifier("eveNudgeFollowUp-\(number)")
                        } else if followUpFailed {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("I couldn’t get that thought through.")
                                    .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .accessibilityIdentifier("eveNudgeFailure-\(number)")
                                if canRetryFollowUp {
                                    Button(action: onRetryFollowUp) {
                                        Label("Try again", systemImage: "arrow.clockwise")
                                            .font(Theme.font(14, weight: .semibold))
                                            .frame(minHeight: 44)
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                    .foregroundStyle(Theme.accent)
                                    .accessibilityIdentifier("retryEveNudgeFollowUp-\(number)")
                                } else {
                                    Text("No reply came through.")
                                        .font(Theme.font(13, weight: .medium))
                                        .foregroundStyle(Theme.secondary)
                                }
                            }
                            .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                        }
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .leading)))
            }
        }
        .accessibilityElement(children: .contain)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: followUpWasRequested)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: followUpPending)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: followUpFailed)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: followUpReply)
    }

    private var metadataFont: Font {
        .system(size: typeSize.isAccessibilitySize ? 16 : 12, weight: .medium)
    }
}

struct EveAvatar: View {
    var size: CGFloat = 38
    var celebrating = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Image("EveAvatar")
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .background(celebrating ? Theme.reward.opacity(0.12) : Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 13))
            .scaleEffect(celebrating ? 1.06 : 1)
            .rotationEffect(.degrees(celebrating ? -8 : 0))
            .animation(reduceMotion ? nil : .spring(response: 0.36, dampingFraction: 0.56), value: celebrating)
            .accessibilityLabel("Eve")
    }
}
