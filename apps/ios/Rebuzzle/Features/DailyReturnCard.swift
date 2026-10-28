import SwiftUI
import RebuzzleCore

struct DailyReturnCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 12) {
                    countdownSummary
                    reminderLink
                }
            } else {
                HStack(spacing: 12) {
                    Image(systemName: "sunrise.fill")
                        .font(.system(size: 19, weight: .medium))
                        .foregroundStyle(Theme.reward)
                        .accessibilityHidden(true)
                    countdownSummary
                    Spacer(minLength: 8)
                    reminderLink
                }
            }
        }
        .padding(14)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
    }

    @ViewBuilder
    private var countdownSummary: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("NEXT DAILY")
                .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                .tracking(1.1)
                .foregroundStyle(Theme.secondary)
            if let raw = model.daily?.nextPuzzleTime, let end = DailyReturnTiming.deadline(raw) {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    let seconds = DailyReturnTiming.remaining(until: end, now: context.date)
                    if seconds > 0 {
                        HStack(alignment: .firstTextBaseline, spacing: 5) {
                            countdownUnit(seconds / 3600, suffix: "h", identifier: "countdownHours")
                            countdownUnit(seconds / 60 % 60, suffix: "m", identifier: "countdownMinutes")
                            countdownUnit(seconds % 60, suffix: "s", identifier: "countdownSeconds")
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityIdentifier("puzzleCountdown")
                        .accessibilityLabel("Next puzzle countdown")
                        .accessibilityValue("\(seconds / 3600) hours, \(seconds / 60 % 60) minutes, \(seconds % 60) seconds remaining")
                    } else {
                        if model.busy {
                            Text("Finding your next aha…")
                                .font(Theme.font(16, weight: .semibold, relativeTo: .headline))
                                .accessibilityIdentifier("countdownReady")
                        } else {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("A fresh puzzle is ready")
                                    .font(Theme.font(16, weight: .semibold, relativeTo: .headline))
                                    .accessibilityIdentifier("countdownReady")
                                Button("Check for today’s puzzle") {
                                    Task { await model.load() }
                                }
                                .font(Theme.font(13, weight: .medium))
                                .accessibilityIdentifier("checkForTodayPuzzle")
                            }
                        }
                    }
                }
            } else {
                Text("Your next aha is on its way")
                    .font(Theme.font(15, weight: .medium, relativeTo: .headline))
                    .foregroundStyle(Theme.ink)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var reminderLink: some View {
        NavigationLink { ReminderView() } label: {
            Label {
                Text(model.reminders.nextReminder == nil ? "Remind me" : "Edit time")
                    .lineLimit(1)
            } icon: {
                Image(systemName: model.reminders.nextReminder == nil ? "bell.badge" : "bell.fill")
                    .accessibilityHidden(true)
            }
            .font(Theme.font(13, weight: .semibold, relativeTo: .subheadline))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .background(Theme.field, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(model.reminders.nextReminder == nil ? "Remind me" : "Edit time")
        .accessibilityHint("Choose a local time for an optional daily reminder.")
        .accessibilityIdentifier("configureReminder")
    }

    private func countdownUnit(_ value: Int, suffix: String, identifier: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 1) {
            Text(String(format: "%02d", value))
                .font(Theme.font(21, weight: .semibold, relativeTo: .title3))
                .monospacedDigit()
                .minimumScaleFactor(0.8)
                .lineLimit(1)
                .accessibilityIdentifier(identifier)
            Text(suffix)
                .font(Theme.font(11, weight: .medium, relativeTo: .caption))
                .foregroundStyle(Theme.secondary)
        }
        .fixedSize(horizontal: true, vertical: false)
    }
}
