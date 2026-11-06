import ActivityKit
import SwiftUI
import UIKit
import WidgetKit
import RebuzzleCore

private enum DailyActivityStyle {
    static let accent = Color(red: 0.22, green: 0.38, blue: 0.88)
}

@available(iOS 16.1, *)
struct DailyRoundLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DailyRoundActivityAttributes.self) { context in
            DailyRoundLockScreen(context: context)
                .activityBackgroundTint(Color(uiColor: .systemBackground))
                .activitySystemActionForegroundColor(DailyActivityStyle.accent)
                .widgetURL(URL(string: "rebuzzle://play?source=widget"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "puzzlepiece.fill")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(DailyActivityStyle.accent)
                        .accessibilityLabel("Rebuzzle")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.isStale {
                        Image(systemName: "sparkles")
                            .foregroundStyle(DailyActivityStyle.accent)
                            .accessibilityLabel("A fresh puzzle is ready")
                    } else if context.state.isComplete {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(DailyActivityStyle.accent)
                            .accessibilityLabel("Puzzle complete")
                    } else {
                        Text("\(context.state.guessesRemaining)")
                            .font(.title2.weight(.semibold)).monospacedDigit()
                            .accessibilityLabel("\(context.state.guessesRemaining) guesses remaining")
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.isStale ? "A fresh puzzle is ready" : context.state.isComplete ? "Round complete" : "Next puzzle")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                        Spacer(minLength: 8)
                        if !context.isStale {
                            Text(timerInterval: Date()...context.attributes.nextPuzzleTime, countsDown: true)
                                .font(.caption.weight(.semibold)).monospacedDigit()
                                .accessibilityLabel("Time until the next puzzle")
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "puzzlepiece.fill")
                    .foregroundStyle(DailyActivityStyle.accent)
                    .accessibilityLabel("Rebuzzle")
            } compactTrailing: {
                if context.isStale {
                    Image(systemName: "sparkles").foregroundStyle(DailyActivityStyle.accent)
                } else {
                    Text(timerInterval: Date()...context.attributes.nextPuzzleTime, countsDown: true)
                        .font(.caption2.weight(.semibold)).monospacedDigit()
                        .minimumScaleFactor(0.65)
                        .accessibilityLabel("Time until the next puzzle")
                }
            } minimal: {
                Image(systemName: context.isStale ? "sparkles" : "puzzlepiece.fill")
                    .foregroundStyle(DailyActivityStyle.accent)
                    .accessibilityLabel(context.isStale ? "A fresh puzzle is ready" : "Rebuzzle daily puzzle")
            }
            .keylineTint(DailyActivityStyle.accent)
            .widgetURL(URL(string: "rebuzzle://play?source=widget"))
        }
    }
}

@available(iOS 16.1, *)
private struct DailyRoundLockScreen: View {
    let context: ActivityViewContext<DailyRoundActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "puzzlepiece.fill").foregroundStyle(DailyActivityStyle.accent)
                Text("REBUZZLE").font(.caption2.weight(.bold)).tracking(1.1)
                Spacer()
                if context.state.isComplete && !context.isStale {
                    Label("Solved", systemImage: "checkmark.circle.fill")
                        .font(.caption.weight(.medium)).foregroundStyle(DailyActivityStyle.accent)
                }
            }

            HStack(alignment: .bottom, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.isStale ? "A fresh puzzle is ready" : context.state.isComplete ? "Your next aha" : "NEXT PUZZLE")
                        .font(.subheadline.weight(.medium))
                    if !context.isStale {
                        Text(timerInterval: Date()...context.attributes.nextPuzzleTime, countsDown: true)
                            .font(.system(.title2, design: .rounded, weight: .semibold))
                            .monospacedDigit()
                            .accessibilityLabel("Time until the next puzzle")
                    }
                }
                Spacer(minLength: 8)
                if !context.state.isComplete && !context.isStale {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text("\(context.state.guessesRemaining)")
                            .font(.system(.title2, design: .rounded, weight: .semibold)).monospacedDigit()
                        Text(context.state.guessesRemaining == 1 ? "guess left" : "guesses left")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.horizontal, 18).padding(.vertical, 16)
        .accessibilityElement(children: .combine)
    }
}
