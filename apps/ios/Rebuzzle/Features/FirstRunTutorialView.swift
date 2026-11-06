import SwiftUI

struct FirstRunTutorialView: View {
    private enum Speaker {
        case player
        case eve
    }

    private struct Message: Identifiable {
        let id = UUID()
        let speaker: Speaker
        let text: String
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @AppStorage("haptics") private var haptics = true
    @State private var draft = ""
    @State private var messages: [Message] = []
    @State private var attempts = 0
    @State private var hintUsed = false
    @State private var solved = false
    @State private var revealed = false
    @FocusState private var answerFocused: Bool

    let onFinish: () -> Void

    private var isFinished: Bool { solved || revealed }
    private var remainingGuesses: Int { max(0, 3 - attempts) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Text("A quick warm-up")
                        .font(Theme.display(32))
                        .fixedSize(horizontal: false, vertical: true)

                    Text("Read the board from top to bottom. What single word do you get?")
                        .font(Theme.font(16))
                        .foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)

                    Label("No daily guess is used in this warm-up.", systemImage: "sparkles")
                        .font(Theme.font(13, weight: .heavy, relativeTo: .caption))
                        .foregroundStyle(Theme.accent)
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(Theme.accent.opacity(0.12), in: Capsule())
                        .fixedSize(horizontal: false, vertical: true)

                    sampleBoard
                    attemptRail

                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(messages) { message in
                            messageBubble(message)
                                .transition(reduceMotion ? .identity : .move(edge: .bottom).combined(with: .opacity))
                        }
                    }
                    .animation(reduceMotion ? nil : .spring(response: 0.34, dampingFraction: 0.84), value: messages.count)

                    if isFinished {
                        finishCard
                            .transition(reduceMotion ? .identity : .move(edge: .bottom).combined(with: .opacity))
                    } else if !hintUsed {
                        Button {
                            answerFocused = false
                            hintUsed = true
                            GameSoundPlayer.shared.play(.hint)
                            messages.append(Message(speaker: .eve, text: "Picture a beacon that helps ships find their way to shore."))
                        } label: {
                            Label("Ask Eve for a hint", systemImage: "lightbulb.fill")
                        }
                        .buttonStyle(ChunkyButtonStyle(variant: .eve, compact: true, fullWidth: false))
                        .accessibilityIdentifier("tutorialHint")
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 24)
                .frame(maxWidth: 600)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if !isFinished {
                    GuessComposer(
                        text: $draft,
                        isFocused: $answerFocused,
                        fieldAccessibilityIdentifier: "tutorialAnswerField",
                        submitAccessibilityIdentifier: "tutorialCheckAnswer",
                        error: nil,
                        isFieldDisabled: false,
                        isSubmitting: false,
                        isSubmitDisabled: draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                        recoveryAction: nil,
                        onDraftChange: {},
                        onSubmit: submit
                    )
                }
            }
            .background(Theme.canvas)
            .foregroundStyle(Theme.ink)
            .navigationTitle("Practice round")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Skip") { finish() }
                        .accessibilityIdentifier("tutorialSkip")
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Button("Hide keyboard", systemImage: "keyboard.chevron.compact.down") {
                        answerFocused = false
                    }
                    .accessibilityIdentifier("tutorialDismissKeyboard")
                    Spacer()
                    Button("Check answer", systemImage: "arrow.right", action: submit)
                        .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isFinished)
                        .accessibilityIdentifier("tutorialCheckAnswerFromKeyboard")
                }
            }
        }
        .accessibilityIdentifier("tutorialDemo")
        .sensoryFeedback(.success, trigger: solved) { _, newValue in newValue && haptics }
    }

    private var sampleBoard: some View {
        VStack(spacing: 8) {
            Eyebrow(text: "SAMPLE REBUS")
            VStack(spacing: 0) {
                Text("LIGHT")
                    .font(Theme.display(38, relativeTo: .largeTitle))
                Image(systemName: "arrow.down")
                    .font(.system(size: 15, weight: .black))
                    .foregroundStyle(Theme.accent)
                    .padding(.vertical, 3)
                    .accessibilityHidden(true)
                Text("HOUSE")
                    .font(Theme.display(38, relativeTo: .largeTitle))
            }
            .frame(maxWidth: .infinity, minHeight: 160)
            .background(Theme.field, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
            .gameCard(padding: 12)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("The word LIGHT sits above the word HOUSE")
        }
        .accessibilityIdentifier("tutorialBoard")
    }

    private var attemptRail: some View {
        HStack(spacing: 9) {
            GuessSlots(total: 3, used: attempts, solved: solved, size: typeSize.isAccessibilitySize ? 44 : 34)
                .accessibilityHidden(true)
            Spacer(minLength: 8)
            Text("\(remainingGuesses) practice guesses left")
                .font(Theme.font(13, weight: .heavy, relativeTo: .caption))
                .foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.trailing)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(remainingGuesses) practice guesses remaining")
        .accessibilityIdentifier("tutorialAttemptRail")
    }

    private func messageBubble(_ message: Message) -> some View {
        let isPlayer = message.speaker == .player
        let shape = RoundedRectangle(cornerRadius: 16, style: .continuous)
        return HStack(alignment: .top, spacing: 10) {
            if isPlayer { Spacer(minLength: 36) } else { EveAvatar().accessibilityHidden(true) }
            VStack(alignment: .leading, spacing: 5) {
                Text(isPlayer ? "YOU" : "EVE · WARM-UP")
                    .font(Theme.font(11, weight: .heavy, relativeTo: .caption))
                    .tracking(0.6)
                    .foregroundStyle(isPlayer ? Color.white.opacity(0.88) : Theme.eve)
                Text(message.text)
                    .font(Theme.font(16, weight: isPlayer ? .heavy : .medium))
                    .foregroundStyle(isPlayer ? Color.white : Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(13)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                ZStack {
                    shape.fill(isPlayer ? Theme.accentFill : Theme.panel)
                    if !isPlayer {
                        shape.fill(Theme.eve.opacity(0.12))
                        shape.strokeBorder(Theme.eve.opacity(0.32), lineWidth: 2)
                    }
                }
            }
            .background(shape.fill(isPlayer ? Theme.accentLedge : Theme.eveLedge.opacity(0.35)).offset(y: 4))
            .padding(.bottom, 4)
            if !isPlayer { Spacer(minLength: 24) }
        }
        .accessibilityElement(children: .combine)
    }

    private var finishCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label(solved ? "That’s the click!" : "Here’s the connection", systemImage: solved ? "sparkles" : "lightbulb")
                .font(Theme.display(22, relativeTo: .title3))
                .foregroundStyle(solved ? Theme.success : Theme.ink)
            Text("LIGHT above HOUSE makes lighthouse. This warm-up did not use a daily guess or change your stats.")
                .font(Theme.font(15, weight: .medium))
                .foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Button("Play today’s puzzle", action: finish)
                .buttonStyle(CommitStyle())
                .accessibilityIdentifier("tutorialContinue")
        }
        .gameCard(padding: 16)
    }

    private func submit() {
        let guess = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !guess.isEmpty, !isFinished else { return }

        answerFocused = false
        draft = ""
        attempts += 1
        messages.append(Message(speaker: .player, text: guess))

        if Self.normalize(guess) == "lighthouse" {
            solved = true
            GameSoundPlayer.shared.play(.solve)
            messages.append(Message(speaker: .eve, text: "Exactly! Read LIGHT above HOUSE as one word: lighthouse."))
        } else if attempts == 3 {
            revealed = true
            messages.append(Message(speaker: .eve, text: "That was your third practice guess. The answer is lighthouse; your daily puzzle still has all three guesses."))
        } else if attempts == 1 {
            messages.append(Message(speaker: .eve, text: "Good start. Read the two words together, from top to bottom."))
        } else {
            messages.append(Message(speaker: .eve, text: "Join the two ideas into one familiar place."))
        }
    }

    private func finish() {
        answerFocused = false
        onFinish()
    }

    private static func normalize(_ value: String) -> String {
        String(value.lowercased().filter { $0.isLetter || $0.isNumber })
    }
}
