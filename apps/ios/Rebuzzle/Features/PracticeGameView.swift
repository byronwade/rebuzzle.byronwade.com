import SwiftUI
import UIKit
import RebuzzleCore

@MainActor struct PracticeGameView: View {
    let puzzle: Puzzle
    private let api: APIClient
    private let storage: LocalStore
    private let accountID: String
    private let isFreeSample: Bool

    @State private var session: PracticeSession
    @State private var practiceEve: EveReplyStore
    @State private var plusOfferExposure = PlusOfferExposure()
    @State private var answerDraft = ""
    @State private var busy = false
    @State private var error: String?
    /// Set when the server no longer recognizes this round's token, e.g. after an accepted guess
    /// whose response was lost. Practice is unscored, so a fresh round is always safe.
    @State private var roundOutOfSync = false
    @FocusState private var answerFocused: Bool

    init(puzzle: Puzzle, api: APIClient, storage: LocalStore, accountID: String, isFreeSample: Bool = false) {
        self.puzzle = puzzle
        self.api = api
        self.storage = storage
        self.accountID = accountID
        self.isFreeSample = isFreeSample
        _session = State(initialValue: PracticeSession(puzzleId: puzzle.id, hints: puzzle.hints))
        _practiceEve = State(initialValue: EveReplyStore(storage: storage) { puzzleID, guess, scope, update in
            try await api.streamQuip(puzzleID: puzzleID, guess: guess, scope: scope, onUpdate: update)
        })
    }

    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: isFreeSample ? "FREE ARCHIVE SAMPLE" : (puzzle.date ?? "PAST DAILY"))
                Text(session.state == .solved ? "Aha, again." : "A fresh look.")
                    .font(Theme.display(36)).tracking(-1)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 10) {
                    Text(puzzle.typeName).font(Theme.font(13, weight: .semibold))
                    DifficultyBadge(difficulty: puzzle.difficulty)
                }
            }

            VStack(spacing: 0) {
                PuzzleBoard(puzzle: puzzle).padding(16)
            }
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.ink.opacity(0.20), lineWidth: 1))

            VStack(alignment: .leading, spacing: 8) {
                Label(isFreeSample ? "Sample · unscored" : "Practice · unscored", systemImage: "sparkles")
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
                    ForEach(session.guesses) { practiceGuessCard($0) }
                    VStack(alignment: .leading, spacing: 12) {
                        TextField("Your answer", text: $answerDraft, prompt: Text("Your answer…").foregroundStyle(Theme.secondary), axis: .horizontal)
                            .lineLimit(1...3).textInputAutocapitalization(.never).autocorrectionDisabled()
                            .submitLabel(.go).focused($answerFocused).modifier(FieldStyle())
                            // The padded box reads as the field, so a tap anywhere in it should focus.
                            .contentShape(RoundedRectangle(cornerRadius: 10))
                            .simultaneousGesture(TapGesture().onEnded { answerFocused = true })
                            .accessibilityLabel("Your answer")
                            .accessibilityIdentifier("practiceAnswerField")
                            .onSubmit { dismissAnswerKeyboard(); Task { await submit() } }
                        if let error { Notice(message: error) }
                        if roundOutOfSync {
                            Button {
                                restartRound()
                            } label: {
                                Label("Start this round again", systemImage: "arrow.counterclockwise")
                            }
                            .buttonStyle(CommitStyle()).disabled(busy)
                            .accessibilityIdentifier("restartOutOfSyncPracticeRound")
                        } else {
                            Button { Task { await submit() } } label: {
                                HStack {
                                    Text("Check answer")
                                    if busy { ProgressView().tint(Theme.canvas) } else { Image(systemName: "arrow.right") }
                                }
                            }
                            .buttonStyle(CommitStyle()).disabled(busy)
                            .accessibilityIdentifier("checkPracticeAnswer")
                        }
                    }
                    .padding(14).background(Theme.field.opacity(0.55), in: RoundedRectangle(cornerRadius: 14))
                }
            } else {
                solutionCard
                if !session.guesses.isEmpty {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Your guesses").font(Theme.font(17, weight: .medium))
                        ForEach(session.guesses) { practiceGuessCard($0) }
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
            if isFreeSample && session.state != .playing {
                VStack(alignment: .leading, spacing: 12) {
                    Label("More daily aha moments", systemImage: "sparkles")
                        .font(Theme.font(16, weight: .medium)).foregroundStyle(Theme.reward)
                    Text("Rebuzzle Plus opens every past daily, your puzzle journal, and deeper solving insights.")
                        .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                    NavigationLink(value: RebuzzleRoute.plus(source: .freeSample)) {
                        Label("Explore Rebuzzle Plus", systemImage: "arrow.right")
                            .padding(.horizontal, 16).padding(.vertical, 8)
                    }
                    .buttonStyle(CommitStyle())
                    .accessibilityIdentifier("freeSamplePlusCTA")
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(18)
                .background(Theme.reward.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                .onScrollVisibilityChange(threshold: 0.5) { isVisible in
                    recordVisibleFreeSampleOffer(isVisible: isVisible)
                }
            }
            if let error, session.state != .playing { Notice(message: error) }
        }
        .navigationTitle("Practice")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Button("Hide keyboard", systemImage: "keyboard.chevron.compact.down") { dismissAnswerKeyboard(forceResign: true) }
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
            if let reply = practiceEve.replies[guess.attemptNumber] {
                Text("Eve · \(reply)").font(Theme.font(14)).foregroundStyle(Theme.accent)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("practiceEveReply.\(guess.attemptNumber)")
            }
            if practiceEve.pendingAttempts.contains(guess.attemptNumber) {
                HStack(spacing: 8) {
                    ProgressView().controlSize(.mini)
                    Text("Eve is thinking…").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
                .accessibilityLabel("Eve is thinking")
                .accessibilityIdentifier("practiceEvePending.\(guess.attemptNumber)")
            } else if practiceEve.failedAttempts.contains(guess.attemptNumber) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Eve couldn't reply just now. Your guess is saved.")
                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("practiceEveReplyFailure.\(guess.attemptNumber)")
                    Button {
                        _ = practiceEve.retry(guess: Guess(
                            guess: guess.text,
                            correct: guess.correct,
                            attemptNumber: guess.attemptNumber,
                            reaction: guess.reaction,
                            similarity: guess.similarity,
                            wordResults: guess.wordResults
                        ))
                    } label: {
                        Label("Ask Eve again", systemImage: "arrow.clockwise")
                            .font(Theme.font(13, weight: .semibold))
                            .frame(minHeight: 44, alignment: .leading)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain).foregroundStyle(Theme.accent)
                    .accessibilityLabel("Ask Eve to retry the reply for guess \(guess.attemptNumber)")
                    .accessibilityIdentifier("retryPracticeEveReply.\(guess.attemptNumber)")
                }
            }
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 12))
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
    }

    private var hintsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("A gentle nudge").font(Theme.font(17, weight: .medium))
            if puzzle.hints.isEmpty {
                Text("No hints were saved for this puzzle. You can still play or reveal the solution.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
            } else {
                if session.revealedHints.isEmpty {
                    Text("Give the clue a fresh read before revealing your first hint.")
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
                if session.canRevealHint {
                    Button {
                        var updated = session
                        _ = updated.revealNextHint()
                        session = updated
                    } label: {
                        Label("Reveal hint \(session.revealedHintCount + 1)", systemImage: "lightbulb")
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .foregroundStyle(Theme.ink)
                            .background(Theme.field, in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.secondary.opacity(0.24), lineWidth: 1))
                    }.buttonStyle(.plain).accessibilityIdentifier("revealPracticeHint")
                }
            }
        }
    }

    private var practiceEveKey: String { "eve:\(accountID):\(puzzle.id):practice" }

    private func recordVisibleFreeSampleOffer(isVisible: Bool) {
        guard plusOfferExposure.markVisible(
            isFreeSample: isFreeSample,
            roundComplete: session.state != .playing,
            isVisible: isVisible
        ) else { return }
        Task { _ = await api.report(.plusOfferViewed(.freeSample)) }
    }

    private func dismissAnswerKeyboard(forceResign: Bool = false) {
        let shouldResign = answerFocused || forceResign
        answerFocused = false
        guard shouldResign else { return }
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    private func submit() async {
        guard !busy, !roundOutOfSync else { return }
        var updated = session
        guard let attemptNumber = updated.submit(guess: answerDraft) else {
            error = answerDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? "Write your answer first, then check it."
                : "Keep your answer to 200 characters or fewer."
            return
        }
        session = updated
        dismissAnswerKeyboard()
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
            answerDraft = ""
            practiceEve.request(guess: Guess(
                guess: updated.guesses.last?.text ?? "",
                correct: result.correct,
                attemptNumber: result.attemptNumber,
                reaction: result.reaction,
                similarity: result.similarity,
                wordResults: result.wordResults
            ))
        } catch let apiError as APIError where apiError.status == 409 {
            // The server already advanced or retired this round's token, so retrying the
            // same token can never succeed. Offer a fresh round instead of a dead end.
            updated.cancelPendingSubmission()
            session = updated
            roundOutOfSync = true
            self.error = "This practice round fell out of sync, so your last guess may not have counted. Start it again to keep playing."
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
        dismissAnswerKeyboard()
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
        answerDraft = ""
        error = nil
        roundOutOfSync = false
        practiceEve.reset()
        try? storage.remove(key: practiceEveKey)
        practiceEve.activate(accountID: accountID, puzzleID: puzzle.id, scope: .practice)
    }
}
