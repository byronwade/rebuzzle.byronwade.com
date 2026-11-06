import SwiftUI
import RebuzzleCore

struct DailyReturnCard: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 12) {
                IconTile(systemImage: "sunrise.fill", face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold, size: 40)
                Text("Your next daily aha")
                    .font(Theme.display(20, relativeTo: .title3))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .accessibilityElement(children: .combine)
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
                            .font(Theme.display(22, relativeTo: .title2)).accessibilityIdentifier("countdownReady")
                        Button("Check for today’s puzzle") { Task { await model.load() } }
                            .buttonStyle(CommitStyle()).disabled(model.busy || model.submitting)
                    }
                }
                Text("A fresh puzzle \(end.formatted(date: .abbreviated, time: .shortened)). Your progress is safe.")
                    .font(Theme.font(13, weight: .medium)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text("Connect to check when the next puzzle arrives.").font(Theme.font(14)).foregroundStyle(Theme.secondary)
            }
            NavigationLink { ReminderView() } label: {
                HStack(spacing: 12) {
                    IconTile(systemImage: model.reminders.nextReminder == nil ? "bell.badge.fill" : "bell.fill", face: Theme.eveFill, ledge: Theme.eveLedge, size: 36)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(model.reminders.nextReminder == nil ? "Save a little time for wonder" : "Your daily moment is set")
                            .font(Theme.font(15, weight: .heavy))
                        if let next = model.reminders.nextReminder {
                            Text(next.formatted(date: .abbreviated, time: .shortened)).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                        } else { Text("Choose a gentle daily reminder").font(Theme.font(12)).foregroundStyle(Theme.secondary) }
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right").font(.system(size: 13, weight: .heavy)).foregroundStyle(Theme.secondary)
                }.frame(minHeight: 44).contentShape(Rectangle())
            }.foregroundStyle(Theme.ink).accessibilityIdentifier("configureReminder")
        }.gameCard(padding: 18)
    }
    private func digit(_ value: Int, label: String, identifier: String) -> some View {
        VStack(spacing: 6) {
            Text(String(format: "%02d", value)).font(Theme.display(30, relativeTo: .title)).monospacedDigit()
                .minimumScaleFactor(0.5).lineLimit(1).accessibilityIdentifier(identifier)
            Text(label.uppercased()).font(Theme.font(11, weight: .heavy, relativeTo: .caption)).tracking(0.6).foregroundStyle(Theme.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 12)
        .background(Theme.field, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.panelLedge, lineWidth: 2))
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Theme.panelLedge).offset(y: 3))
        .padding(.bottom, 3)
    }
}
