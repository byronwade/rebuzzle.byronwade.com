import ActivityKit
import WidgetKit
import SwiftUI
import RebuzzleCore

struct DailyEntry: TimelineEntry {
    let date: Date
    let reset: Date
}
struct DailyProvider: TimelineProvider {
    func placeholder(in context: Context) -> DailyEntry { entry(at: Date()) }
    func getSnapshot(in context: Context, completion: @escaping (DailyEntry) -> Void) { completion(entry(at: Date())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyEntry>) -> Void) {
        let now = Date()
        // Precompute a week of local midnight boundaries so the timer never counts up.
        let entries = (0..<8).compactMap { day -> DailyEntry? in
            guard let date = Calendar.current.date(byAdding: .day, value: day, to: Calendar.current.startOfDay(for: now)) else { return nil }
            return entry(at: day == 0 ? now : date)
        }
        completion(Timeline(entries: entries, policy: .after(DailyReturnTiming.nextMidnight(after: now))))
    }
    private func entry(at date: Date) -> DailyEntry { DailyEntry(date: date, reset: DailyReturnTiming.nextMidnight(after: date)) }
}
struct DailyWidgetView: View {
    let entry: DailyEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme
    private var accent: Color { Color(red: 0.22, green: 0.38, blue: 0.88) }
    var body: some View {
        Group {
            if family == .accessoryInline {
                HStack(spacing: 5) {
                    Label("Daily", systemImage: "puzzlepiece.fill")
                    Text(timerInterval: entry.date...entry.reset, countsDown: true)
                        .monospacedDigit()
                }
                .font(.caption2.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            } else if family == .accessoryCircular {
                VStack(spacing: 2) {
                    Image(systemName: "puzzlepiece.fill")
                        .font(.caption2)
                        .widgetAccentable()
                    Text(timerInterval: entry.date...entry.reset, countsDown: true)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                }
            } else if family == .accessoryRectangular {
                VStack(alignment: .leading, spacing: 3) {
                    Label("Rebuzzle · daily reset", systemImage: "puzzlepiece.fill").font(.caption.weight(.semibold))
                    Text(timerInterval: entry.date...entry.reset, countsDown: true).font(.title2.weight(.semibold)).monospacedDigit()
                    Text("Tap for your daily aha").font(.caption2)
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    HStack { Image(systemName: "puzzlepiece.fill").foregroundStyle(accent); Text("REBUZZLE").font(.caption2.weight(.bold)).tracking(1); Spacer() }
                    if family == .systemMedium { Text("Small puzzle. Big aha.").font(.title3.weight(.semibold)) }
                    Text("Next daily reset").font(.caption).foregroundStyle(.secondary)
                    Text(timerInterval: entry.date...entry.reset, countsDown: true)
                        .font(.system(size: family == .systemSmall ? 27 : 32, weight: .semibold, design: .rounded))
                        .monospacedDigit().minimumScaleFactor(0.6).lineLimit(1)
                    HStack { Text("Let’s play"); Image(systemName: "arrow.right") }.font(.caption.weight(.semibold)).foregroundStyle(accent)
                }
            }
        }
        .widgetURL(URL(string: "rebuzzle://play?source=widget"))
        .containerBackground(for: .widget) {
            colorScheme == .dark ? Color(red: 0.08, green: 0.09, blue: 0.08) : Color(red: 0.97, green: 0.96, blue: 0.94)
        }
    }
}
struct DailyPuzzleWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RebuzzleDaily", provider: DailyProvider()) { DailyWidgetView(entry: $0) }
            .configurationDisplayName("Your daily aha")
            .description("Count down to the local midnight reset. Tap to open today’s puzzle.")
            .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
}

private enum DailyPuzzleActivityStyle {
    static let accent = Color(red: 0.22, green: 0.38, blue: 0.88)
    static let lightBackground = Color(red: 0.97, green: 0.96, blue: 0.94)
    static let darkBackground = Color(red: 0.08, green: 0.09, blue: 0.08)
    static let destination = URL(string: "rebuzzle://play?source=liveActivity")
}

private struct DailyPuzzleProgressDots: View {
    let scoredGuessesUsed: Int

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(index < scoredGuessesUsed ? DailyPuzzleActivityStyle.accent : Color.secondary.opacity(0.28))
                    .frame(width: 8, height: 8)
            }
        }
        .accessibilityHidden(true)
    }
}

private struct DailyPuzzleLiveActivityLockScreen: View {
    let context: ActivityViewContext<DailyPuzzleLiveActivityAttributes>

    @Environment(\.colorScheme) private var colorScheme

    private var state: DailyPuzzleLiveActivityAttributes.ContentState { context.state }
    private var puzzleDateLabel: String {
        let parser = DateFormatter()
        parser.calendar = Calendar(identifier: .gregorian)
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0) ?? .gmt
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: context.attributes.puzzleDate) else {
            return context.attributes.puzzleDate
        }
        let formatter = DateFormatter()
        formatter.calendar = parser.calendar
        formatter.locale = .current
        formatter.timeZone = parser.timeZone
        formatter.setLocalizedDateFormatFromTemplate("MMM d")
        return formatter.string(from: date)
    }
    private var phaseTitle: String {
        switch state.phase {
        case .solving: "Puzzle in progress"
        case .scoreLocked: "Keep solving"
        case .solved: "Solved!"
        case .revealed: "Round complete"
        }
    }
    private var phaseDetail: String {
        switch state.phase {
        case .solving: "Take your time. Tap to jump back in."
        case .scoreLocked: "Three scored guesses used. The solve stays open."
        case .solved: "Tap to see how the puzzle works."
        case .revealed: "Open Rebuzzle to review the explanation."
        }
    }
    private var accessibilitySummary: String {
        let hints = state.hintsUsed == 1 ? "1 Eve hint" : "\(state.hintsUsed) Eve hints"
        return "Rebuzzle daily puzzle, \(puzzleDateLabel). \(state.scoredGuessesUsed) of 3 scored guesses. \(hints). \(phaseTitle). Tap to return to the puzzle."
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Rebuzzle", systemImage: "puzzlepiece.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(DailyPuzzleActivityStyle.accent)
                Spacer()
                Text("Daily · \(puzzleDateLabel)")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
            }

            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(phaseTitle)
                        .font(.headline)
                    Text(phaseDetail)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 4)
                VStack(spacing: 2) {
                    Text("\(state.scoredGuessesUsed)/3")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    Text("scored")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                }
                .accessibilityHidden(true)
            }

            HStack {
                DailyPuzzleProgressDots(scoredGuessesUsed: state.scoredGuessesUsed)
                Spacer()
                Label(
                    "\(state.hintsUsed) \(state.hintsUsed == 1 ? "Eve hint" : "Eve hints")",
                    systemImage: "lightbulb.fill"
                )
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .activityBackgroundTint(colorScheme == .dark ? DailyPuzzleActivityStyle.darkBackground : DailyPuzzleActivityStyle.lightBackground)
        .activitySystemActionForegroundColor(DailyPuzzleActivityStyle.accent)
        .widgetURL(DailyPuzzleActivityStyle.destination)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
    }
}

private extension DailyPuzzleLiveActivityAttributes.ContentState.Phase {
    var islandLabel: String {
        switch self {
        case .solving: "Daily puzzle"
        case .scoreLocked: "Still solving"
        case .solved: "Solved"
        case .revealed: "Round complete"
        }
    }
}

struct DailyPuzzleLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DailyPuzzleLiveActivityAttributes.self) { context in
            DailyPuzzleLiveActivityLockScreen(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "puzzlepiece.fill")
                        .foregroundStyle(DailyPuzzleActivityStyle.accent)
                        .accessibilityLabel("Rebuzzle daily puzzle")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.scoredGuessesUsed)/3")
                        .font(.headline.weight(.semibold))
                        .monospacedDigit()
                        .accessibilityLabel("\(context.state.scoredGuessesUsed) of 3 scored guesses")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 8) {
                        DailyPuzzleProgressDots(scoredGuessesUsed: context.state.scoredGuessesUsed)
                        Text(context.state.phase.islandLabel)
                            .font(.caption.weight(.medium))
                        Spacer(minLength: 4)
                        Label("\(context.state.hintsUsed)", systemImage: "lightbulb.fill")
                            .font(.caption.weight(.medium))
                            .accessibilityLabel("\(context.state.hintsUsed) Eve hints")
                    }
                }
            } compactLeading: {
                Image(systemName: "puzzlepiece.fill")
                    .foregroundStyle(DailyPuzzleActivityStyle.accent)
                    .accessibilityLabel("Rebuzzle daily puzzle")
            } compactTrailing: {
                Text("\(context.state.scoredGuessesUsed)/3")
                    .monospacedDigit()
                    .accessibilityLabel("\(context.state.scoredGuessesUsed) of 3 scored guesses")
            } minimal: {
                Image(systemName: "puzzlepiece.fill")
                    .foregroundStyle(DailyPuzzleActivityStyle.accent)
                    .accessibilityLabel("Rebuzzle daily puzzle")
            }
            .widgetURL(DailyPuzzleActivityStyle.destination)
            .keylineTint(DailyPuzzleActivityStyle.accent)
        }
    }
}

@main struct RebuzzleWidgetsBundle: WidgetBundle {
    var body: some Widget {
        DailyPuzzleWidget()
        DailyPuzzleLiveActivityWidget()
    }
}
