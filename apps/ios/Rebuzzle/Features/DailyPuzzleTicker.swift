import SwiftUI

struct DailyPuzzleTicker: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let resetAt: Date?
    var roundComplete = false

    var body: some View {
        if let resetAt {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let ready = context.date >= resetAt
                Group {
                    if typeSize.isAccessibilitySize {
                        HStack(alignment: .center, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(ready ? "Fresh puzzle ready" : "Next puzzle")
                                    .font(Theme.font(15, weight: .heavy))
                                Text(roundComplete ? "Your next puzzle arrives at reset" : "Your round stays safe until then")
                                    .font(Theme.font(13, weight: .medium)).foregroundStyle(Theme.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer(minLength: 4)
                            if ready {
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Theme.accent)
                            } else {
                                countdown(from: context.date, to: resetAt, size: 15)
                            }
                        }
                    } else {
                        HStack(spacing: 9) {
                            IconTile(systemImage: ready ? "sparkles" : "hourglass", size: 28)
                            Text(ready ? "Fresh puzzle ready" : "Next puzzle")
                                .font(Theme.font(13, weight: .heavy))
                                .foregroundStyle(Theme.secondary)
                            Spacer(minLength: 4)
                            if ready {
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Theme.accent)
                            } else {
                                countdown(from: context.date, to: resetAt, size: 13)
                            }
                        }
                    }
                }
                .padding(.horizontal, 4).padding(.vertical, 4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityElement(children: .combine)
                .accessibilityHint(Text(roundComplete ? "Your next puzzle arrives at reset." : "Your round stays safe until the next puzzle."))
            }
        }
    }

    private func countdown(from now: Date, to resetAt: Date, size: CGFloat) -> some View {
        Text(timerInterval: now...resetAt, countsDown: true)
            .font(Theme.display(size + 2, relativeTo: .headline))
            .foregroundStyle(Theme.accent)
            .monospacedDigit().minimumScaleFactor(0.65).lineLimit(1)
            .accessibilityLabel("Time until the next daily puzzle")
    }
}
