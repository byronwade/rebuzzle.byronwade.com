import SwiftUI

struct EveTypingIndicator: View {
    let label: String
    let identifier: String

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: 0.34, paused: reduceMotion)) { context in
            let activeDot = reduceMotion
                ? -1
                : Int(context.date.timeIntervalSinceReferenceDate / 0.34) % 3

            HStack(spacing: 8) {
                HStack(spacing: 4) {
                    ForEach(0..<3, id: \.self) { index in
                        Circle()
                            .fill(Theme.accent)
                            .frame(width: 6, height: 6)
                            .opacity(activeDot == index ? 1 : 0.38)
                            .scaleEffect(activeDot == index ? 1.12 : 0.84)
                            .animation(.easeInOut(duration: 0.18), value: activeDot)
                    }
                }
                .accessibilityHidden(true)

                Text(label)
                    .font(Theme.font(15))
                    .foregroundStyle(Theme.secondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityAddTraits(.updatesFrequently)
        .accessibilityIdentifier(identifier)
    }
}
