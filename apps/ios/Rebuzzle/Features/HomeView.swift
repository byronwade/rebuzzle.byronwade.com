import SwiftUI
import RebuzzleCore

/// Play tab root: today's puzzle up top, other ways to play below.
struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var typeSize
    var body: some View {
        Page(spacing: 22, bottomSafeAreaClearance: 72) {
            header
            TodayPuzzleCard()
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow(text: "MORE WAYS TO PLAY")
                LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
                    Button {} label: {
                        ModeCard(symbol: "bolt.fill", title: "Rush", line: "3 minutes. Solve as many as you can.", footer: "Coming soon", available: false)
                    }
                    .buttonStyle(.plain)
                    .disabled(true)
                    .accessibilityLabel("Rush. 3 minutes. Solve as many as you can. Coming soon")
                    .accessibilityIdentifier("homeModeRush")
                    Button {} label: {
                        ModeCard(symbol: "infinity", title: "Endless", line: "One miss ends the run.", footer: "Coming soon", available: false)
                    }
                    .buttonStyle(.plain)
                    .disabled(true)
                    .accessibilityLabel("Endless. One miss ends the run. Coming soon")
                    .accessibilityIdentifier("homeModeEndless")
                    NavigationLink(value: RebuzzleRoute.archive) {
                        ModeCard(symbol: "calendar", title: "Archive", line: "Replay any past puzzle.")
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Archive. Replay any past puzzle.")
                    .accessibilityIdentifier("homeModeArchive")
                }
            }
        }
        // The header row replaces the bar; the title still names the back button on pushed screens.
        .navigationTitle("Play")
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await model.load() }
    }

    private var columns: [GridItem] {
        typeSize.isAccessibilitySize
            ? [GridItem(.flexible())]
            : [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            Text(Self.dateLabel(model.daily?.puzzleDate))
                .font(Theme.display(24)).tracking(-0.5)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("homeDate")
            Spacer(minLength: 8)
            if let streak = DailyStreakPresentation.journey(stats: model.stats).current, streak > 0 {
                Label("\(streak)", systemImage: "flame.fill")
                    .font(Theme.font(14, weight: .semibold)).monospacedDigit()
                    .foregroundStyle(Theme.reward)
                    .padding(.horizontal, 10).frame(minHeight: 32)
                    .background(Theme.reward.opacity(0.12), in: Capsule())
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(streak) day streak")
                    .accessibilityIdentifier("homeStreakChip")
            }
            EveAvatar(celebrating: model.game?.wasSuccessful == true)
                .accessibilityLabel("Eve, your AI puzzle author")
        }
    }

    /// "Friday, Oct 31", from the daily's own date so it matches the puzzle, not the device clock.
    static func dateLabel(_ puzzleDate: String?) -> String {
        let format = Date.FormatStyle.dateTime.weekday(.wide).month(.abbreviated).day()
        guard let puzzleDate else { return Date().formatted(format) }
        // Local-calendar components, so the label never shifts a day across time zones.
        let parts = puzzleDate.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3,
              let parsed = Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
        else { return puzzleDate }
        return parsed.formatted(format)
    }
}

/// Today's daily at a glance. The card body and its button both push the daily screen.
struct TodayPuzzleCard: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let daily = model.daily {
                // Hold the card until the session restores, so the daily never opens without the player's progress.
                let canOpen = model.game != nil || !model.busy
                // The daily can load while the session behind it fails; that is not a fresh, unstarted puzzle.
                let sessionError = model.game == nil && !model.busy ? model.error : nil
                TimelineView(.periodic(from: .now, by: 60)) { context in
                    let status = TodayCardStatus(game: model.game, hintCount: daily.puzzle.hints.count, hintsShown: model.hintsShown)
                    let line = canOpen
                        ? status.statusLine(nextPuzzle: DailyReturnTiming.deadline(daily.nextPuzzleTime), now: context.date)
                        : "Loading your progress…"
                    let summary = "Today’s puzzle, \(daily.puzzle.typeName). \(DifficultyTier.accessibilityLabel(difficulty: daily.puzzle.difficulty))."
                    VStack(alignment: .leading, spacing: 14) {
                        NavigationLink(value: RebuzzleRoute.daily) {
                            VStack(alignment: .leading, spacing: 12) {
                                HStack(alignment: .firstTextBaseline, spacing: 8) {
                                    Eyebrow(text: "TODAY · " + daily.puzzle.typeName.uppercased())
                                    Spacer(minLength: 4)
                                    DifficultyBadge(difficulty: daily.puzzle.difficulty)
                                }
                                // A glance, not the playable board: same clue drawing, shrunk and inert.
                                BoardPreview(puzzle: daily.puzzle)
                                if sessionError == nil {
                                    Text(line)
                                        .font(Theme.font(14, weight: .medium))
                                        .foregroundStyle(status.isFinished ? Theme.reward : Theme.secondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(sessionError != nil ? summary : canOpen ? "\(summary) \(line). \(status.buttonTitle)" : "\(summary) \(line)")
                        .accessibilityIdentifier("homeTodayCard")
                        if let sessionError {
                            Notice(message: sessionError)
                            Button("Try again") { Task { await model.load() } }
                                .buttonStyle(CommitStyle())
                                .accessibilityIdentifier("homeTodayRetry")
                        } else {
                            NavigationLink(value: RebuzzleRoute.daily) {
                                HStack {
                                    if canOpen { Text(status.buttonTitle); Image(systemName: "arrow.right") } else { ProgressView().tint(Theme.canvas) }
                                }
                            }
                            .buttonStyle(CommitStyle())
                            // The card above is the single VoiceOver stop; this is its visual button.
                            .accessibilityHidden(true)
                            .accessibilityIdentifier("homeTodayPlay")
                        }
                    }
                    .disabled(!canOpen)
                }
            } else if model.busy {
                VStack(spacing: 16) { ProgressView(); Text("Finding today’s puzzle…").font(Theme.font(15)) }
                    .frame(maxWidth: .infinity, minHeight: 200)
            } else {
                ContentUnavailableView("A puzzle worth waiting for", systemImage: "wifi.slash", description: Text(model.error ?? "Connect to load today’s puzzle."))
                Button("Try again") { Task { await model.load() } }.buttonStyle(CommitStyle())
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink.opacity(0.14), lineWidth: 1))
    }
}

/// A way to play beyond the daily. The caller wraps it in the tap target and sets the combined label.
struct ModeCard: View {
    let symbol: String
    let title: String
    let line: String
    var footer: String?
    var available = true
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: symbol)
                .font(.title2.weight(.semibold))
                .foregroundStyle(available ? Theme.accent : Theme.secondary)
                .frame(width: 36, height: 36)
                .background((available ? Theme.accent : Theme.secondary).opacity(0.10), in: RoundedRectangle(cornerRadius: 10))
            Text(title)
                .font(Theme.font(16, weight: .semibold))
                .foregroundStyle(available ? Theme.ink : Theme.secondary)
            Text(line)
                .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            if let footer {
                Text(footer)
                    .font(Theme.font(11, weight: .semibold, relativeTo: .caption))
                    .foregroundStyle(Theme.reward)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 120, maxHeight: .infinity, alignment: .topLeading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Theme.ink.opacity(0.12), lineWidth: 1))
        .contentShape(RoundedRectangle(cornerRadius: 14))
    }
}

/// A reliable 120pt glance at the board: laid out at a fixed natural height, then scaled to fit and clipped.
private struct BoardPreview: View {
    let puzzle: Puzzle
    private let naturalHeight: CGFloat = 220
    private let previewHeight: CGFloat = 120
    var body: some View {
        GeometryReader { proxy in
            let scale = previewHeight / naturalHeight
            PuzzleBoard(puzzle: puzzle)
                .dynamicTypeSize(...DynamicTypeSize.xxLarge)
                .frame(width: proxy.size.width / scale, height: naturalHeight, alignment: .top)
                .scaleEffect(scale, anchor: .topLeading)
                .frame(width: proxy.size.width, height: previewHeight, alignment: .topLeading)
                .clipped()
        }
        .frame(height: previewHeight)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}
