import SwiftUI

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
        DailyPuzzleCountdown(style: .expanded)
    }

    private var reminderLink: some View {
        NavigationLink { ReminderView() } label: {
            Label {
                Text(model.reminders.nextReminder == nil ? "Remind me" : "Edit time")
                    .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
            } icon: {
                Image(systemName: model.reminders.nextReminder == nil ? "bell.badge" : "bell.fill")
                    .accessibilityHidden(true)
            }
            .font(Theme.font(13, weight: .semibold, relativeTo: .subheadline))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 12)
            .frame(
                maxWidth: dynamicTypeSize.isAccessibilitySize ? .infinity : nil,
                minHeight: 44,
                alignment: .leading
            )
            .background(Theme.field, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(model.reminders.nextReminder == nil ? "Remind me" : "Edit time")
        .accessibilityHint("Choose a local time for an optional daily reminder.")
        .accessibilityIdentifier("configureReminder")
    }
}
