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
            if family == .accessoryRectangular {
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
@main struct DailyPuzzleWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "RebuzzleDaily", provider: DailyProvider()) { DailyWidgetView(entry: $0) }
            .configurationDisplayName("Your daily aha")
            .description("Count down to the local midnight reset. Tap to open today’s puzzle.")
            .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}
