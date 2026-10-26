import SwiftUI
import RebuzzleCore

struct DailyReturnCard: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Label("Your next daily aha", systemImage: "sunrise")
                .font(Theme.font(18, weight: .medium))
            if let raw = model.daily?.nextPuzzleTime, let end = DailyReturnTiming.deadline(raw) {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    let seconds = DailyReturnTiming.remaining(until: end, now: context.date)
                    if seconds > 0 {
                        HStack(spacing: 8) {
                            digit(seconds / 3600, label: "hours", identifier: "countdownHours")
                            digit(seconds / 60 % 60, label: "minutes", identifier: "countdownMinutes")
                            digit(seconds % 60, label: "seconds", identifier: "countdownSeconds")
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityIdentifier("puzzleCountdown")
                        .accessibilityLabel("Next puzzle at \(end.formatted(date: .abbreviated, time: .shortened))")
                    } else {
                        Text(model.busy ? "Finding your next connection…" : "Time for a fresh puzzle")
                            .font(Theme.font(22, weight: .medium)).accessibilityIdentifier("countdownReady")
                        Button("Check for today’s puzzle") { Task { await model.load() } }
                            .buttonStyle(CommitStyle()).disabled(model.busy || model.submitting)
                    }
                }
                Text("A fresh puzzle \(end.formatted(date: .abbreviated, time: .shortened)). Your progress is safe.")
                    .font(Theme.font(13)).foregroundStyle(Theme.secondary)
            } else {
                Text("Connect to check when the next puzzle arrives.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
            }
            NavigationLink { ReminderView() } label: {
                HStack(spacing: 12) {
                    Image(systemName: model.reminders.nextReminder == nil ? "bell.badge" : "bell.fill").foregroundStyle(Theme.accent)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(model.reminders.nextReminder == nil ? "Save a little time for wonder" : "Your daily moment is set")
                            .font(Theme.font(14, weight: .medium))
                        if let next = model.reminders.nextReminder {
                            Text(next.formatted(date: .abbreviated, time: .shortened)).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                        } else { Text("Choose a gentle daily reminder").font(Theme.font(12)).foregroundStyle(Theme.secondary) }
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").font(.caption)
                }.frame(minHeight: 44).contentShape(Rectangle())
            }.foregroundStyle(Theme.ink).accessibilityIdentifier("configureReminder")
        }.padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
    }
    private func digit(_ value: Int, label: String, identifier: String) -> some View {
        VStack(spacing: 6) {
            Text(String(format: "%02d", value)).font(Theme.font(30, weight: .semibold, relativeTo: .title)).monospacedDigit()
                .minimumScaleFactor(0.5).lineLimit(1).accessibilityIdentifier(identifier)
            Text(label).font(Theme.font(11, relativeTo: .caption)).foregroundStyle(Theme.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }.frame(maxWidth: .infinity).padding(.vertical, 12).background(Theme.field, in: RoundedRectangle(cornerRadius: 10))
    }
}
