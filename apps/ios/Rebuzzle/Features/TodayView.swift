import SwiftUI
import RebuzzleCore

struct TodayView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("haptics") private var haptics = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var help = false
    @State private var study: PuzzleStudy?
    @State private var hintFeedback = 0
    @State private var celebrate = false
    @FocusState private var answerFocused: Bool
    var body: some View {
        @Bindable var model = model
        ScrollViewReader { scroll in
        Page {
            if let daily = model.daily {
                DailyBanner(dateLabel: dateLabel, typeName: daily.puzzle.typeName,
                            done: model.game?.gameOver == true, won: model.game?.wasSuccessful == true)
                    .id("dailyHeader")
                if model.game?.gameOver == true {
                    ResultView()
                    conversation
                } else {
                    VStack(spacing: 0) {
                        let stageHeader = typeSize.isAccessibilitySize
                            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8))
                            : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: 12))
                        stageHeader {
                            Text("Today’s puzzle")
                                .font(Theme.font(13, weight: .bold))
                            if !typeSize.isAccessibilitySize { Spacer(minLength: 4) }
                            DifficultyBolts(difficulty: daily.puzzle.difficulty)
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
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 20))
                    .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Theme.secondary.opacity(0.22), lineWidth: 2))
                    .background(RoundedRectangle(cornerRadius: 20).fill(Theme.secondary.opacity(0.22)).offset(y: 4))
                    VStack(alignment: .leading, spacing: 14) {
                        attemptHeader
                        if model.game?.attempts.isEmpty == false { conversation }
                        VStack(alignment: .leading, spacing: 12) {
                            TextField("Your answer", text: $model.draft, prompt: Text("Your answer…").foregroundStyle(Theme.secondary), axis: .horizontal)
                                .lineLimit(1...3).textInputAutocapitalization(.never).autocorrectionDisabled()
                                .submitLabel(.go).focused($answerFocused).modifier(FieldStyle())
                                .accessibilityLabel("Your answer")
                                .accessibilityIdentifier("answerField")
                                .onSubmit { submitAnswer() }
                                .onChange(of: model.draft) { _, _ in model.saveDraft() }
                            if let error = model.error { Notice(message: error) }
                            // Large text keeps the action inline so it never covers the answer field.
                            if typeSize.isAccessibilitySize && !answerFocused { actionButton }
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
                        Button {
                            let previous = model.hintsShown
                            model.revealHint()
                            if model.hintsShown > previous { hintFeedback += 1 }
                        } label: {
                            HStack {
                                Image(systemName: "lightbulb.fill").foregroundStyle(Theme.bolt)
                                Text(model.hintsShown < daily.puzzle.hints.count ? "A little nudge" : "All hints revealed")
                                Spacer()
                                Text("\(max(0, daily.puzzle.hints.count - model.hintsShown)) left")
                                    .font(Theme.font(13, weight: .bold)).monospacedDigit()
                                    .padding(.horizontal, 8).padding(.vertical, 3)
                                    .background(Theme.bolt.opacity(0.18), in: Capsule())
                            }.font(Theme.font(15, weight: .semibold))
                        }.buttonStyle(ChunkyButtonStyle(fill: Theme.panel, ink: Theme.ink, outline: Theme.secondary.opacity(0.25), height: 48))
                        .disabled(!model.sessionReady || model.hintsShown >= daily.puzzle.hints.count)
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
            if model.game?.wasSuccessful == true { celebrate = true }
            let destination = model.game?.gameOver == true ? "dailyHeader" : "turn-\(new)"
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.12)) {
                scroll.scrollTo(destination, anchor: .top)
            }
        }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if model.daily != nil, model.game?.gameOver != true, !answerFocused, !typeSize.isAccessibilitySize { actionBar }
        }
        .overlay {
            if celebrate { ConfettiBurst().ignoresSafeArea() }
        }
        .navigationTitle("Rebuzzle").navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) { GameHUDLevelChip() }
            ToolbarItem(placement: .topBarTrailing) { GameHUDStreakChip() }
            ToolbarItem(placement: .topBarTrailing) {
                Button("How to play", systemImage: "questionmark.circle") { help = true }
            }
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
        .sheet(isPresented: $help) { HelpView() }
        .sheet(item: $study) { selection in
            PuzzleStudyView(puzzle: selection.puzzle)
        }
        .refreshable { await model.load() }
        .sensoryFeedback(.success, trigger: model.game?.wasSuccessful == true) { _, new in new && haptics }
        .sensoryFeedback(.selection, trigger: hintFeedback) { _, _ in haptics }
        .sensoryFeedback(.impact(weight: .light), trigger: model.game?.attempts.count) { old, new in
            guard let old, let new else { return false }
            return haptics && new > old && model.game?.attempts.last?.correct == false
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: model.game?.gameOver)
    }
    private var actionBar: some View {
        actionButton
            .padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 8)
            .frame(maxWidth: 600).frame(maxWidth: .infinity)
            .background(Theme.canvas.opacity(0.96))
            .overlay(alignment: .top) { Rectangle().fill(Theme.secondary.opacity(0.14)).frame(height: 1) }
    }
    @ViewBuilder private var actionButton: some View {
            if model.needsReconciliation || !model.sessionReady {
                Button { Task { await model.load() } } label: {
                    HStack { if model.busy { ProgressView().tint(.white) }; Text("Refresh progress"); Image(systemName: "arrow.clockwise") }
                }.buttonStyle(CommitStyle()).disabled(model.busy)
            } else {
                Button { submitAnswer() } label: {
                    HStack { Text("Check answer"); if model.submitting { ProgressView().tint(.white) } else { Image(systemName: "arrow.right") } }
                }.buttonStyle(ChunkyButtonStyle(fill: Theme.go))
                .disabled(model.submitting || model.busy).accessibilityIdentifier("checkAnswer")
            }
    }
    private func submitAnswer() {
        answerFocused = false
        Task { await model.submit() }
    }
    private var conversation: some View {
        VStack(alignment: .leading, spacing: 24) {
            ForEach(model.game?.attempts ?? []) { guess in
                GuessTurnView(guess: guess, reply: model.eve.replies[guess.attemptNumber],
                              pending: model.eve.pendingAttempt == guess.attemptNumber,
                              latest: guess.id == model.game?.attempts.last?.id)
                    .id("turn-\(guess.attemptNumber)")
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
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            LivesRow(attempts: attempts, maximum: maximum)
            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 3) {
                Text("Your move").font(Theme.display(17))
                Text("\(remaining) \(remaining == 1 ? "guess" : "guesses") remaining")
                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
            }
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
    var body: some View {
        if let game = model.game {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 16) {
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
                    .accessibilityLabel("\(game.attempts.count) of \(game.maxAttempts) guesses, \(game.wasSuccessful == true ? "solved" : "answer revealed")")
                    if let explanation = game.explanation, !explanation.isEmpty {
                        Text(explanation).font(Theme.font(16)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: 24))
                .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(game.wasSuccessful == true ? Theme.reward.opacity(0.40) : Theme.secondary.opacity(0.20), lineWidth: 1))
                DailyStreakCard(presentation: model.streakPresentation(for: game), context: .result)
                JourneyRewards(game: game)
                let metrics = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 20)) : AnyLayout(HStackLayout(spacing: 32))
                metrics {
                    resultMetric("\(game.attempts.count)/\(game.maxAttempts)", "Guesses")
                    resultMetric("\(model.hintsShown)", "Hints")
                    resultMetric("\(model.journal.entries.count)", "Days played here")
                }
                DailyQualityPulse { rating in
                    model.recordGrowthEvent(.dailyQualityFeedback(rating))
                }
                ShareLink(item: game.shareText) { Label("Challenge a friend", systemImage: "square.and.arrow.up") }.buttonStyle(CommitStyle())
                Text("Same puzzle. Your answer stays a secret.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                if let puzzle = model.daily?.puzzle {
                    DisclosureGroup("See the puzzle") {
                        PuzzleBoard(puzzle: puzzle).padding(.top, 12)
                    }.font(Theme.font(14)).tint(Theme.ink)
                }
                if model.journal.entries.contains(where: { $0.id == game.puzzleId }) {
                    NavigationLink { JournalView() } label: {
                        Label(model.purchases.hasPlus ? "Add a thought to your journal" : "Keep this connection", systemImage: "book.closed")
                    }.font(Theme.font(14)).frame(minHeight: 44).accessibilityIdentifier("keepConnection")
                }
                DailyReturnCard()
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
                Button("Let’s play") { dismiss() }.buttonStyle(CommitStyle())
            }.navigationTitle("How to play").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close", systemImage: "xmark") { dismiss() } } }
        }
    }
}

/// Conversation uses confirmed guesses and server feedback, never the hidden answer.
struct GuessTurnView: View {
    let guess: Guess
    let reply: String?
    let pending: Bool
    let latest: Bool
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
                        } else if pending {
                            HStack(spacing: 8) {
                                ProgressView().controlSize(.mini)
                                Text("Eve is thinking…").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                            }.accessibilityLabel("Eve is thinking")
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

struct EveAvatar: View {
    var celebrating = false
    var onColor = false
    var body: some View {
        Image(systemName: "face.smiling.inverse")
            .font(.system(size: onColor ? 40 : 30, weight: .regular))
            .foregroundStyle(onColor ? .white : celebrating ? Theme.reward : Theme.accent)
            .frame(width: onColor ? 56 : 38, height: onColor ? 56 : 38)
            .background(onColor ? Color.white.opacity(0.18) : celebrating ? Theme.reward.opacity(0.12) : Theme.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: onColor ? 18 : 13))
            .rotationEffect(.degrees(celebrating ? -8 : 0))
            .accessibilityLabel("Eve")
    }
}

/// The day’s “unit” banner: a bold colored card that frames the daily puzzle like a level.
private struct DailyBanner: View {
    let dateLabel: String
    let typeName: String
    let done: Bool
    let won: Bool
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        let fill = done ? (won ? Theme.go : Theme.secondary) : Theme.accent
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
        layout {
            VStack(alignment: .leading, spacing: 4) {
                Text("DAILY PUZZLE · \(dateLabel.uppercased())")
                    .font(Theme.font(12, weight: .bold, relativeTo: .caption)).tracking(0.8)
                    .foregroundStyle(.white.opacity(0.8))
                Text(done ? (won ? "Solved. Nice!" : "Puzzle complete") : "Make it click.")
                    .font(Theme.display(28)).tracking(-0.6)
                    .foregroundStyle(.white)
                    .fixedSize(horizontal: false, vertical: true)
                Text(typeName)
                    .font(Theme.font(13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.9))
            }
            if !typeSize.isAccessibilitySize { Spacer(minLength: 0) }
            EveAvatar(celebrating: won, onColor: true)
                .accessibilityLabel("Eve, your AI puzzle author")
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(fill, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(fill.mix(with: .black, by: 0.28)).offset(y: 5))
        .padding(.bottom, 5)
        .accessibilityElement(children: .combine)
    }
}
