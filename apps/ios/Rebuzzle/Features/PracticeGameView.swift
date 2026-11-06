import SwiftUI
import RebuzzleCore

@MainActor struct PracticeGameView: View {
    let puzzle: Puzzle
    private let api: APIClient
    private let storage: LocalStore
    private let accountID: String

    @State private var session: PracticeSession
    @State private var practiceEve: EveReplyStore
    @State private var answerDraft = ""
    @State private var busy = false
    @State private var error: String?
    @State private var isFollowingLatestTurn = true
    @State private var unseenFeedbackAttempt: Int?
    @FocusState private var answerFocused: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(puzzle: Puzzle, api: APIClient, storage: LocalStore, accountID: String) {
        self.puzzle = puzzle
        self.api = api
        self.storage = storage
        self.accountID = accountID
        _session = State(initialValue: PracticeSession(puzzleId: puzzle.id, hints: puzzle.hints))
        _practiceEve = State(initialValue: EveReplyStore(storage: storage) { puzzleID, guess, scope, update in
            try await api.streamQuip(puzzleID: puzzleID, guess: guess, scope: scope, onUpdate: update)
        })
    }

    var body: some View {
        ScrollViewReader { scroll in
        Page(onNearBottomChange: { isNearBottom in
            isFollowingLatestTurn = isNearBottom
            if isNearBottom { unseenFeedbackAttempt = nil }
        }) {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: puzzle.date ?? "PAST DAILY")
                Text(session.state == .solved ? "Aha, again." : "A fresh look.")
                    .font(Theme.display(36)).tracking(-1)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 10) {
                    Text(puzzle.typeName).font(Theme.font(13, weight: .semibold))
                    PuzzleDifficultyBadge(difficulty: puzzle.difficulty)
                }
            }

            VStack(spacing: 0) {
                PuzzleBoard(puzzle: puzzle).padding(16)
            }
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.ink.opacity(0.20), lineWidth: 1))

            VStack(alignment: .leading, spacing: 8) {
                Label("Practice · unscored", systemImage: "sparkles")
                    .font(Theme.font(14, weight: .medium)).foregroundStyle(Theme.reward)
                    .accessibilityIdentifier("practiceUnscored")
                Text("Three fresh guesses. Your daily result, streak, and rewards stay untouched.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("practiceUnscoredNote")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16).background(Theme.reward.opacity(0.09), in: RoundedRectangle(cornerRadius: 14))

            if session.state == .playing {
                VStack(alignment: .leading, spacing: 14) {
                    HStack {
                        Text("Your guesses").font(Theme.font(17, weight: .medium))
                        Spacer()
                        Text("\(session.attemptsRemaining) left")
                            .font(Theme.font(13, weight: .medium)).monospacedDigit().foregroundStyle(Theme.secondary)
                            .accessibilityIdentifier("practiceAttemptsRemaining")
                    }
                    ForEach(session.guesses) { guess in
                        practiceGuessCard(guess)
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 16) {
                    solutionCard
                    if !session.guesses.isEmpty {
                        practiceRoundDebrief
                    }
                }
            }

            hintsSection

            if session.state == .outOfGuesses {
                Button { Task { await revealSolution() } } label: {
                    Label("Show the solution", systemImage: "eye")
                        .padding(.horizontal, 16).padding(.vertical, 8)
                }
                .buttonStyle(CommitStyle()).disabled(busy)
                .accessibilityIdentifier("revealPracticeSolution")
            }
            if session.state != .playing {
                Button {
                    restartRound()
                } label: {
                    Label("Play this clue again", systemImage: "arrow.counterclockwise")
                        .padding(.horizontal, 16).padding(.vertical, 8)
                }
                .buttonStyle(CommitStyle()).accessibilityIdentifier("restartPracticeRound")
            }
            if let error, session.state != .playing { Notice(message: error) }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 0) {
                if let unseenAttempt = unseenFeedbackAttempt {
                    Button {
                        isFollowingLatestTurn = true
                        unseenFeedbackAttempt = nil
                        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                            scroll.scrollTo("practiceTurn-\(unseenAttempt)", anchor: .bottom)
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
                    .accessibilityIdentifier("practiceNewFeedbackButton")
                    .frame(maxWidth: 552)
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                    .padding(.bottom, 2)
                    .frame(maxWidth: .infinity)
                    .transition(reduceMotion ? .identity : .move(edge: .bottom).combined(with: .opacity))
                }
                if session.state == .playing {
                    GuessComposer(
                        text: $answerDraft,
                        isFocused: $answerFocused,
                        fieldAccessibilityIdentifier: "practiceAnswerField",
                        submitAccessibilityIdentifier: "checkPracticeAnswer",
                        error: error,
                        isFieldDisabled: busy || accountID.isEmpty,
                        isSubmitting: busy,
                        isSubmitDisabled: busy || accountID.isEmpty,
                        recoveryAction: nil,
                        hintAction: GuessComposer.HintAction(
                            title: session.canRevealHint ? "Nudge" : puzzle.hints.isEmpty ? "No hints" : "All used",
                            detail: session.canRevealHint ? "\(puzzle.hints.count - session.revealedHintCount) left" : nil,
                            symbol: session.canRevealHint ? "lightbulb" : puzzle.hints.isEmpty ? "lightbulb.slash" : "checkmark",
                            accessibilityLabel: session.canRevealHint
                                ? "Reveal hint \(session.revealedHintCount + 1), \(puzzle.hints.count - session.revealedHintCount) remaining"
                                : puzzle.hints.isEmpty ? "No hints are available for this puzzle" : "All hints have been revealed",
                            accessibilityHint: "Reveals the next clue without using a guess.",
                            accessibilityIdentifier: "practiceHintComposer",
                            isDisabled: busy || accountID.isEmpty || !session.canRevealHint,
                            action: { revealHint() }
                        ),
                        onDraftChange: {},
                        onSubmit: { Task { await submit() } }
                    )
                }
            }
        }
        .onChange(of: session.guesses.count) { oldCount, newCount in
            guard newCount > oldCount else { return }
            isFollowingLatestTurn = true
            unseenFeedbackAttempt = nil
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                if session.state == .playing {
                    scroll.scrollTo("practiceTurn-\(newCount)", anchor: .bottom)
                } else {
                    scroll.scrollTo("practiceSolution", anchor: .top)
                }
            }
        }
        .onChange(of: session.revealedHints.count) { oldCount, newCount in
            guard newCount > oldCount else { return }
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                scroll.scrollTo("practiceHints", anchor: .bottom)
            }
        }
        .onChange(of: practiceEve.replies) { oldReplies, newReplies in
            guard let latestAttempt = session.guesses.last?.attemptNumber,
                  oldReplies[latestAttempt] != newReplies[latestAttempt] else { return }
            if isFollowingLatestTurn {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo("practiceTurn-\(latestAttempt)", anchor: .bottom)
                }
            } else {
                unseenFeedbackAttempt = latestAttempt
            }
        }
        .onChange(of: practiceEve.unavailableAttempts) { oldAttempts, newAttempts in
            guard oldAttempts != newAttempts,
                  let latestAttempt = session.guesses.last?.attemptNumber else { return }
            if isFollowingLatestTurn {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo("practiceTurn-\(latestAttempt)", anchor: .bottom)
                }
            } else {
                unseenFeedbackAttempt = latestAttempt
            }
        }
        .onChange(of: practiceEve.interruptedAttempts) { oldAttempts, newAttempts in
            guard oldAttempts != newAttempts,
                  let latestAttempt = session.guesses.last?.attemptNumber else { return }
            if isFollowingLatestTurn {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                    scroll.scrollTo("practiceTurn-\(latestAttempt)", anchor: .bottom)
                }
            } else {
                unseenFeedbackAttempt = latestAttempt
            }
        }
        }
        .navigationTitle("Practice")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Button("Hide keyboard", systemImage: "keyboard.chevron.compact.down") { answerFocused = false }
                    .accessibilityIdentifier("dismissPracticeKeyboard")
                Spacer()
                Button("Check answer", systemImage: "arrow.right") { Task { await submit() } }
                    .disabled(busy)
                    .accessibilityIdentifier("checkPracticeAnswerFromKeyboard")
            }
        }
        .task {
            guard !accountID.isEmpty else { error = "Sign in or reconnect to start archive practice."; return }
            try? storage.remove(key: practiceEveKey)
            practiceEve.activate(accountID: accountID, puzzleID: puzzle.id, scope: .practice)
        }
    }

    private var practiceRoundDebrief: some View {
        VStack(alignment: .leading, spacing: 14) {
            Eyebrow(text: "ROUND RECAP")
            ForEach(session.guesses) { guess in
                practiceGuessCard(guess)
            }
        }
        .accessibilityIdentifier("practiceRoundDebrief")
    }

    private func practiceGuessCard(_ guess: PracticeGuess) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(guess.text).font(Theme.font(16, weight: .medium))
                Spacer()
                Text(guess.correct ? "Aha" : "Guess \(guess.attemptNumber) of 3")
                    .font(Theme.font(12, weight: .medium)).foregroundStyle(guess.correct ? Theme.success : Theme.secondary)
            }
            Text(guess.correct ? "You found the connection." : (guess.reaction?.line ?? "Try looking at the clue from a fresh angle."))
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                .accessibilityIdentifier("practiceFeedback.\(guess.attemptNumber)")
            if let reply = practiceEve.replies[guess.attemptNumber],
               !reply.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Text("Eve · \(reply)").font(Theme.font(14)).foregroundStyle(Theme.accent)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("practiceEveReply.\(guess.attemptNumber)")
            }
            if practiceEve.pendingAttempt == guess.attemptNumber {
                Text("Eve is thinking…").font(Theme.font(13)).foregroundStyle(Theme.secondary)
            } else if practiceEve.unavailableAttempts.contains(guess.attemptNumber) {
                EveReplyStatusNote(message: "Eve’s note didn’t arrive. Your guess is saved.")
                    .accessibilityIdentifier("practiceEveUnavailable.\(guess.attemptNumber)")
            }
            if practiceEve.interruptedAttempts.contains(guess.attemptNumber) {
                EveReplyStatusNote(message: "Eve’s note didn’t finish. Your guess is saved.")
                    .accessibilityIdentifier("practiceEveInterrupted.\(guess.attemptNumber)")
            }
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 12))
        .id("practiceTurn-\(guess.attemptNumber)")
    }

    private var solutionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(session.state == .solved ? "YOU FOUND IT" : session.state == .outOfGuesses ? "THE NEXT CONNECTION" : "THE SOLUTION")
                .font(Theme.font(12, weight: .semibold)).foregroundStyle(Theme.reward)
            Text(session.state == .outOfGuesses ? "That was a thoughtful round." : "That connection deserves a little victory lap.")
                .font(Theme.font(15)).foregroundStyle(Theme.secondary)
            if let answer = session.answer {
                Text(answer).font(Theme.display(32)).tracking(-0.8).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("practiceSolutionAnswer")
            }
            if let explanation = session.explanation, !explanation.isEmpty {
                Text(explanation).font(Theme.font(16)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("practiceSolutionExplanation")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.reward.opacity(0.3), lineWidth: 1))
        .id("practiceSolution")
    }

    private var hintsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("A gentle nudge").font(Theme.font(17, weight: .medium))
            if puzzle.hints.isEmpty {
                Text("No hints were saved for this puzzle. You can still play or reveal the solution.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
            } else {
                if session.revealedHints.isEmpty {
                    Text("Use the Hint button beside your answer whenever you want a little help.")
                        .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                }
                ForEach(Array(session.revealedHints.enumerated()), id: \.offset) { index, hint in
                    HStack(alignment: .top, spacing: 12) {
                        Text("\(index + 1)").font(Theme.font(14, weight: .semibold)).foregroundStyle(Theme.reward)
                            .frame(width: 28, height: 28).background(Theme.reward.opacity(0.12), in: Circle())
                        Text(hint).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("practiceHint.\(index + 1)")
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }.padding(14).background(Theme.panel, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .id("practiceHints")
    }

    private var practiceEveKey: String { "eve:\(accountID):\(puzzle.id):practice" }

    private func revealHint() {
        var updated = session
        guard updated.revealNextHint() != nil else { return }
        session = updated
        GameSoundPlayer.shared.play(.hint)
    }

    private func submit() async {
        guard !busy else { return }
        var updated = session
        guard let attemptNumber = updated.submit(guess: answerDraft) else {
            error = answerDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? "Write your answer first, then check it."
                : "Keep your answer to 200 characters or fewer."
            return
        }
        session = updated
        answerFocused = false
        busy = true
        error = nil
        defer { busy = false }
        do {
            let result = try await api.submitPracticeGuess(
                puzzleID: puzzle.id,
                guess: answerDraft.trimmingCharacters(in: .whitespacesAndNewlines),
                attemptNumber: attemptNumber,
                roundToken: updated.roundToken
            )
            updated = session
            guard updated.receive(response: result) else {
                updated.cancelPendingSubmission()
                session = updated
                error = "That practice response didn’t match this round. Please try again."
                return
            }
            session = updated
            if result.correct {
                GameSoundPlayer.shared.play(.solve)
            } else if updated.state == .playing,
                      let tier = result.reaction?.tier.lowercased(),
                      ["close", "warm"].contains(tier) {
                GameSoundPlayer.shared.play(.closeGuess)
            }
            answerDraft = ""
            practiceEve.request(guess: Guess(
                guess: updated.guesses.last?.text ?? "",
                correct: result.correct,
                attemptNumber: result.attemptNumber,
                reaction: result.reaction,
                similarity: result.similarity,
                wordResults: result.wordResults
            ))
        } catch {
            updated.cancelPendingSubmission()
            session = updated
            self.error = error.localizedDescription
        }
    }

    private func revealSolution() async {
        guard !busy, session.state == .outOfGuesses, let roundToken = session.roundToken else { return }
        busy = true
        error = nil
        answerFocused = false
        defer { busy = false }
        do {
            let solution = try await api.revealPracticeSolution(puzzleID: puzzle.id, roundToken: roundToken)
            var updated = session
            updated.revealSolution(answer: solution.answer, explanation: solution.explanation)
            session = updated
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func restartRound() {
        var updated = session
        updated.restartRound()
        session = updated
        isFollowingLatestTurn = true
        unseenFeedbackAttempt = nil
        answerDraft = ""
        error = nil
        practiceEve.reset()
        try? storage.remove(key: practiceEveKey)
        practiceEve.activate(accountID: accountID, puzzleID: puzzle.id, scope: .practice)
    }
}
