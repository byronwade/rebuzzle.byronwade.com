import SwiftUI
import RebuzzleCore

struct TodayView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("haptics") private var haptics = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var help = false
    @FocusState private var answerFocused: Bool
    var body: some View {
        @Bindable var model = model
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: dateLabel)
                Text(model.game?.gameOver == true ? "A little wiser." : "A fresh perspective.")
                    .font(Theme.font(32, weight: .medium, relativeTo: .largeTitle)).tracking(-1)
                Text(model.game?.gameOver == true ? "One puzzle. A moment well spent." : "Find the phrase hiding in plain sight.")
                    .font(Theme.font(15)).foregroundStyle(Theme.secondary)
            }
            if let daily = model.daily {
                VStack(spacing: 20) {
                    HStack {
                        Label(daily.puzzle.typeName, systemImage: "square.on.square")
                        Spacer()
                        Text("\(daily.puzzle.difficulty)/10 difficulty")
                    }.font(Theme.font(12, weight: .medium)).foregroundStyle(Theme.secondary)
                    PuzzleBoard(puzzle: daily.puzzle)
                    Text("What does this represent?").font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
                .padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
                if model.game?.gameOver == true {
                    ResultView()
                } else {
                    VStack(alignment: .leading, spacing: 16) {
                        attemptHeader
                        ForEach(model.game?.attempts ?? []) { guess in
                            HStack(alignment: .firstTextBaseline, spacing: 12) {
                                Text("\(guess.attemptNumber)").monospacedDigit().foregroundStyle(Theme.secondary)
                                Text(guess.guess).textSelection(.enabled)
                                Spacer()
                                Image(systemName: guess.correct ? "checkmark.circle.fill" : "arrow.turn.down.right").foregroundStyle(guess.correct ? Theme.success : Theme.secondary)
                            }.font(Theme.font(15)).accessibilityElement(children: .combine)
                        }
                        if let latest = model.game?.attempts.last { GuessFeedbackView(guess: latest) }
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Your answer").font(Theme.font(14, weight: .medium))
                            TextField("A word or phrase…", text: $model.draft, axis: .vertical)
                                .lineLimit(1...3).textInputAutocapitalization(.never).autocorrectionDisabled()
                                .submitLabel(.go).focused($answerFocused).modifier(FieldStyle())
                                .accessibilityIdentifier("answerField")
                                .onSubmit { answerFocused = false; Task { await model.submit() } }
                                .onChange(of: model.draft) { _, _ in model.saveDraft() }
                            if let error = model.error { Notice(message: error) }
                            if model.needsReconciliation || !model.sessionReady {
                                Button { Task { await model.load() } } label: {
                                    HStack { if model.busy { ProgressView().tint(Theme.canvas) }; Text("Refresh progress"); Image(systemName: "arrow.clockwise") }
                                }.buttonStyle(CommitStyle()).disabled(model.busy)
                            } else {
                                Button { answerFocused = false; Task { await model.submit() } } label: {
                                    HStack { Text("Check answer"); if model.submitting { ProgressView().tint(Theme.canvas) } else { Image(systemName: "arrow.right") } }
                                }.buttonStyle(CommitStyle()).disabled(model.submitting || model.busy).accessibilityIdentifier("checkAnswer")
                            }
                        }
                        if model.hintsShown > 0 {
                            VStack(alignment: .leading, spacing: 12) {
                                ForEach(Array(daily.puzzle.hints.prefix(model.hintsShown).enumerated()), id: \.offset) { index, hint in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Eyebrow(text: "Hint \(index + 1)")
                                        Text(hint).font(Theme.font(15))
                                    }
                                }
                            }.padding(.vertical, 8)
                        }
                        Button { model.revealHint() } label: {
                            HStack { Image(systemName: "lightbulb"); Text(model.hintsShown < daily.puzzle.hints.count ? "A little nudge" : "All hints revealed"); Spacer(); Text("\(max(0, daily.puzzle.hints.count - model.hintsShown)) left").foregroundStyle(Theme.secondary) }
                                .font(Theme.font(14)).frame(minHeight: 44).contentShape(Rectangle())
                        }.foregroundStyle(Theme.ink).disabled(!model.sessionReady || model.hintsShown >= daily.puzzle.hints.count)
                    }
                }
            } else if model.busy {
                VStack(spacing: 16) { ProgressView(); Text("Finding today’s puzzle…").font(Theme.font(15)) }.frame(maxWidth: .infinity, minHeight: 280)
            } else {
                ContentUnavailableView("A puzzle worth waiting for", systemImage: "wifi.slash", description: Text(model.error ?? "Connect to load today’s puzzle."))
                Button("Try again") { Task { await model.load() } }.buttonStyle(CommitStyle())
            }
            if let error = model.storageError { Notice(message: error) }
            HStack { Text("One a day."); Spacer(); Text("Make room for a little wonder.") }
                .font(Theme.font(11, relativeTo: .caption2)).foregroundStyle(Theme.secondary)
        }
        .navigationTitle("Rebuzzle").navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("How to play", systemImage: "questionmark.circle") { help = true } } }
        .sheet(isPresented: $help) { HelpView() }
        .refreshable { await model.load() }
        .sensoryFeedback(.success, trigger: model.game?.wasSuccessful == true) { _, new in new && haptics }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: model.game?.gameOver)
    }
    private var dateLabel: String {
        guard let date = model.daily?.puzzleDate else { return Date().formatted(.dateTime.weekday(.wide).month(.wide).day()) }
        return "Daily puzzle · \(date)"
    }
    private var attemptHeader: some View {
        HStack {
            Text("\(model.game?.attemptsLeft ?? 3) guesses remaining").font(Theme.font(13, weight: .medium))
            Spacer()
            HStack(spacing: 6) { ForEach(0..<3) { index in
                RoundedRectangle(cornerRadius: 3).fill(index < (model.game?.attemptsLeft ?? 3) ? Theme.ink : Theme.secondary.opacity(0.2)).frame(width: 16, height: 6)
            } }.accessibilityHidden(true)
        }
    }
}
struct PuzzleBoard: View {
    let puzzle: Puzzle
    var body: some View {
        Group {
            if let visual = puzzle.visual, visual.mode != "unicode", let layers = visual.layers, !layers.isEmpty {
                VisualBoard(visual: visual, layers: layers)
            } else {
                Text(puzzle.clue).font(Theme.font(puzzle.clue.count > 40 ? 26 : 44, weight: .medium, relativeTo: .largeTitle))
                    .multilineTextAlignment(.center).lineSpacing(12).textSelection(.enabled)
                    .frame(maxWidth: .infinity, minHeight: 190).padding(.vertical, 12)
            }
        }.accessibilityLabel("Puzzle: \(puzzle.clue)")
    }
}
struct ResultView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        if let game = model.game {
            VStack(alignment: .leading, spacing: 20) {
                Label(game.wasSuccessful == true ? "You found it." : "Here’s the connection.", systemImage: game.wasSuccessful == true ? "checkmark.circle.fill" : "sparkle")
                    .font(Theme.font(22, weight: .medium, relativeTo: .title2)).foregroundStyle(game.wasSuccessful == true ? Theme.success : Theme.ink)
                Text(game.revealedAnswer ?? "Puzzle complete").font(Theme.font(28, weight: .medium, relativeTo: .title)).textSelection(.enabled)
                if let explanation = game.explanation, !explanation.isEmpty { Text(explanation).font(Theme.font(16)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true) }
                let metrics = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 20)) : AnyLayout(HStackLayout(spacing: 32))
                metrics {
                    resultMetric("\(game.attempts.count)/\(game.maxAttempts)", "Guesses")
                    resultMetric("\(model.hintsShown)", "Hints")
                    resultMetric("\(model.journal.entries.count)", "Days played here")
                }
                ShareLink(item: game.shareText) { Label("Share your result", systemImage: "square.and.arrow.up") }.buttonStyle(CommitStyle())
                Text("Your answer stays a secret.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                VStack(alignment: .leading, spacing: 8) {
                    Text("See you tomorrow.").font(Theme.font(20, weight: .medium))
                    if let raw = model.daily?.nextPuzzleTime, let date = Self.date(raw) {
                        HStack { Text("Next puzzle in"); Text(date, style: .timer).monospacedDigit() }.font(Theme.font(14)).foregroundStyle(Theme.secondary)
                    }
                    NavigationLink { ReminderView() } label: { Label("Make it a daily moment", systemImage: "bell") }.font(Theme.font(14)).frame(minHeight: 44)
                }.padding(.top, 12)
            }
        }
    }
    private func resultMetric(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 4) { Text(value).font(Theme.font(22, weight: .medium)).monospacedDigit(); Text(label).font(Theme.font(11)).foregroundStyle(Theme.secondary) }
    }
    static func date(_ raw: String) -> Date? {
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
    }
}
struct HelpView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Page {
                Text("Look a little closer.").font(Theme.font(30, weight: .medium))
                Text("Each day, pictures, words, or patterns hide an answer. Read the clue, find the connection, and enter a word or phrase.").font(Theme.font(17))
                VStack(alignment: .leading, spacing: 24) {
                    Label("Three guesses. Take your time.", systemImage: "circle.grid.3x1")
                    Label("Hints help you see another angle.", systemImage: "lightbulb")
                    Label("A new puzzle at your local midnight.", systemImage: "sunrise")
                    Label("Share your progress without spoiling the answer.", systemImage: "square.and.arrow.up")
                }.font(Theme.font(16))
                Text("Daily play is free. Plus adds a personal journal and deeper insights, never an advantage.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
                Button("Let’s play") { dismiss() }.buttonStyle(CommitStyle())
            }.navigationTitle("How to play").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close", systemImage: "xmark") { dismiss() } } }
        }
    }
}

/// Displays only server feedback about submitted words; never reconstructs the hidden answer.
struct GuessFeedbackView: View {
    let guess: Guess
    private var title: String {
        switch guess.reaction?.tier {
        case "close": "You’re close."
        case "warm": "A promising direction."
        case "cold": "Try another angle."
        default: "Keep looking."
        }
    }
    var body: some View {
        if let reaction = guess.reaction {
            VStack(alignment: .leading, spacing: 12) {
                Text(title).font(Theme.font(18, weight: .medium)).accessibilityIdentifier("guessFeedback")
                Text(reaction.line).font(Theme.font(15)).foregroundStyle(Theme.secondary)
                if let words = guess.wordResults, !words.isEmpty {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), alignment: .leading)], alignment: .leading, spacing: 8) {
                        ForEach(Array(words.enumerated()), id: \.offset) { _, word in
                            Label(word.word, systemImage: word.correct ? "checkmark.circle.fill" : "circle")
                                .font(Theme.font(13, weight: .medium))
                                .foregroundStyle(word.correct ? Theme.success : Theme.secondary)
                                .padding(.vertical, 8).padding(.horizontal, 10)
                                .background(Theme.panel, in: RoundedRectangle(cornerRadius: 8))
                                .accessibilityLabel("\(word.word), \(word.correct ? "matched in this position" : "not matched in this position")")
                        }
                    }
                    Text("Checks mark words in the right position.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                }
            }.accessibilityElement(children: .contain)
        }
    }
}
