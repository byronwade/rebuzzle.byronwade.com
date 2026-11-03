import SwiftUI
import RebuzzleCore

struct DailyPuzzleCountdown: View {
    enum Style: Equatable {
        case compact
        case expanded
    }

    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let style: Style

    var body: some View {
        Group {
            if let raw = model.daily?.nextPuzzleTime,
               let deadline = DailyReturnTiming.deadline(raw) {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    let seconds = DailyReturnTiming.remaining(until: deadline, now: context.date)
                    if seconds > 0 {
                        activeCountdown(seconds: seconds)
                    } else {
                        readyState
                    }
                }
            } else {
                unavailableState
            }
        }
    }

    @ViewBuilder
    private func activeCountdown(seconds: Int) -> some View {
        switch style {
        case .compact:
            compactCountdown(seconds: seconds)
        case .expanded:
            VStack(alignment: .leading, spacing: 2) {
                Text("NEXT DAILY")
                    .font(Theme.font(10, weight: .semibold, relativeTo: .caption))
                    .tracking(1.1)
                    .foregroundStyle(Theme.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    countdownUnit(seconds / 3600, suffix: "h")
                    countdownUnit(seconds / 60 % 60, suffix: "m")
                    countdownUnit(seconds % 60, suffix: "s")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .ignore)
            .accessibilityIdentifier("puzzleCountdown")
            .accessibilityLabel("Next puzzle countdown")
            .accessibilityValue(accessibilityCountdown(seconds: seconds))
        }
    }

    @ViewBuilder
    private func compactCountdown(seconds: Int) -> some View {
        let icon = Image(systemName: "sparkles")
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(Theme.reward)
            .accessibilityHidden(true)
        let label = Text(dynamicTypeSize.isAccessibilitySize ? "NEXT DAILY" : "NEXT")
            .font(Theme.font(10, weight: .bold, relativeTo: .caption))
            .tracking(0.7)
            .foregroundStyle(Theme.secondary)
        let timer = Text(clockString(seconds))
            .font(Theme.font(12, weight: .semibold, relativeTo: .caption).monospacedDigit())
            .foregroundStyle(Theme.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.8)

        Group {
            if dynamicTypeSize.isAccessibilitySize {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 7) {
                        icon
                        label
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    timer
                        .minimumScaleFactor(0.65)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                HStack(spacing: 7) {
                    icon
                    label
                    timer
                }
            }
        }
        .padding(.horizontal, 11)
        .frame(minHeight: 44)
        .background(Theme.panel, in: Capsule())
        .overlay(Capsule().strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Next daily puzzle")
        .accessibilityValue(accessibilityCountdown(seconds: seconds))
        .accessibilityIdentifier("activePuzzleCountdown")
    }

    @ViewBuilder
    private var readyState: some View {
        if style == .compact {
            if model.busy {
                HStack(spacing: 7) {
                    ProgressView().controlSize(.mini)
                    Text("LOADING")
                        .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                        .tracking(0.7)
                }
                .padding(.horizontal, 11)
                .frame(minHeight: 44)
                .background(Theme.panel, in: Capsule())
                .overlay(Capsule().strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
                .accessibilityLabel("Loading the next daily puzzle")
                .accessibilityIdentifier("activeCountdownReady")
            } else {
                Button {
                    Task { await model.load() }
                } label: {
                    HStack(spacing: 7) {
                        Image(systemName: "sparkles")
                            .foregroundStyle(Theme.reward)
                            .accessibilityHidden(true)
                        Text("FRESH PUZZLE")
                            .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                            .tracking(0.7)
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 10, weight: .semibold))
                            .accessibilityHidden(true)
                    }
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 11)
                    .frame(minHeight: 44)
                    .background(Theme.panel, in: Capsule())
                    .overlay(Capsule().strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Check for today’s puzzle")
                .accessibilityIdentifier("checkForTodayPuzzle")
            }
        } else if model.busy {
            HStack(spacing: 8) {
                ProgressView().controlSize(.mini)
                Text("Finding your next aha…")
                    .font(Theme.font(16, weight: .semibold, relativeTo: .headline))
            }
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
                .frame(minHeight: 44, alignment: .leading)
                .accessibilityIdentifier("checkForTodayPuzzle")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .contain)
        }
    }

    @ViewBuilder
    private var unavailableState: some View {
        switch style {
        case .compact:
            HStack(spacing: 7) {
                Image(systemName: "sparkles")
                    .foregroundStyle(Theme.reward)
                    .accessibilityHidden(true)
                Text("NEXT DAILY")
                    .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                    .tracking(0.7)
                    .foregroundStyle(Theme.secondary)
            }
            .padding(.horizontal, 11)
            .frame(minHeight: 44)
            .background(Theme.panel, in: Capsule())
            .overlay(Capsule().strokeBorder(Theme.secondary.opacity(0.16), lineWidth: 1))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Next daily puzzle")
            .accessibilityValue("Timing will appear when available.")
        case .expanded:
            Text("Your next aha is on its way")
                .font(Theme.font(15, weight: .medium, relativeTo: .headline))
                .foregroundStyle(Theme.ink)
        }
    }

    private func countdownUnit(_ value: Int, suffix: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 1) {
            Text(String(format: "%02d", value))
                .font(Theme.font(21, weight: .semibold, relativeTo: .title3))
                .monospacedDigit()
                .minimumScaleFactor(0.8)
                .lineLimit(1)
            Text(suffix)
                .font(Theme.font(11, weight: .medium, relativeTo: .caption))
                .foregroundStyle(Theme.secondary)
        }
        .fixedSize(horizontal: true, vertical: false)
    }

    private func clockString(_ seconds: Int) -> String {
        String(format: "%02d:%02d:%02d", seconds / 3600, seconds / 60 % 60, seconds % 60)
    }

    private func accessibilityCountdown(seconds: Int) -> String {
        "\(seconds / 3600) hours, \(seconds / 60 % 60) minutes, \(seconds % 60) seconds remaining."
    }
}
