import SwiftUI

enum EveSignal: String {
    case cold
    case warm
    case close
    case correct
    case out

    var steps: Int {
        switch self {
        case .cold: 1
        case .warm: 2
        case .close, .correct: 3
        case .out: 0
        }
    }

    var title: String {
        switch self {
        case .cold: "COLD"
        case .warm: "WARM"
        case .close: "CLOSE"
        case .correct: "SOLVED"
        case .out: "ROUND OVER"
        }
    }

    var color: Color {
        switch self {
        case .cold: Theme.accent
        case .warm: Theme.reward
        case .close, .correct: Theme.success
        case .out: Theme.secondary
        }
    }

    var symbolName: String {
        switch self {
        case .cold: "snowflake"
        case .warm: "thermometer.medium"
        case .close: "sparkles"
        case .correct: "checkmark.seal.fill"
        case .out: "flag.checkered"
        }
    }

    var accessibilityDescription: String {
        switch self {
        case .cold: "Cold signal, one of three steps, snowflake icon."
        case .warm: "Warm signal, two of three steps, thermometer icon."
        case .close: "Close signal, three of three steps, sparkles icon."
        case .correct: "Solved, checkmark seal icon."
        case .out: "Round over, checkered flag icon."
        }
    }
}

/// A compact, answer-free reading of Eve's server-authored reaction.
struct EveSignalMeter: View {
    let tier: String
    let attemptNumber: Int

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hasAppeared = false

    var body: some View {
        if let signal = EveSignal(rawValue: tier) {
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    signalIcon(signal)
                        .frame(width: 18, height: 18)
                        .background(signal.color.opacity(0.12), in: Circle())

                    HStack(spacing: 4) {
                        ForEach(0..<3, id: \.self) { index in
                            let isActive = index < signal.steps
                            Capsule()
                                .fill(isActive ? signal.color : Theme.field)
                                .frame(width: 16, height: 5)
                                .overlay {
                                    Capsule().strokeBorder(
                                        isActive ? signal.color.opacity(0.18) : Theme.secondary.opacity(0.16),
                                        lineWidth: 0.75
                                    )
                                }
                                .opacity(isActive && !reduceMotion && !hasAppeared ? 0.45 : 1)
                                .animation(
                                    reduceMotion ? nil : .easeOut(duration: 0.22).delay(Double(index) * 0.06),
                                    value: hasAppeared
                                )
                        }
                    }
                }
                .accessibilityHidden(true)

                Text(signal.title)
                    .font(Theme.font(10, weight: .bold, relativeTo: .caption))
                    .tracking(0.8)
                    .foregroundStyle(signal.color)
                    .fixedSize()
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(signal.color.opacity(0.09), in: Capsule())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Eve’s signal")
            .accessibilityValue(signal.accessibilityDescription)
            .accessibilityHint("A visual summary of Eve’s response to this guess.")
            .accessibilityIdentifier("guessSignal-\(attemptNumber)")
            .onAppear { hasAppeared = true }
        }
    }

    @ViewBuilder
    private func signalIcon(_ signal: EveSignal) -> some View {
        let icon = Image(systemName: signal.symbolName)
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(signal.color)

        if reduceMotion {
            icon
        } else {
            icon.symbolEffect(.bounce, value: hasAppeared)
        }
    }
}
