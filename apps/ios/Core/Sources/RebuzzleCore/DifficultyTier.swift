/// A named difficulty band so a hard day feels like an event rather than a number.
public enum DifficultyTier: String, Sendable, CaseIterable {
    case warmUp = "Warm-up"
    case tricky = "Tricky"
    case devious = "Devious"
    case fiendish = "Fiendish"
    case diabolical = "Diabolical"

    public init(difficulty: Int) {
        switch difficulty {
        case ..<4: self = .warmUp
        case 4...5: self = .tricky
        case 6...7: self = .devious
        case 8...9: self = .fiendish
        default: self = .diabolical
        }
    }

    public var name: String { rawValue }

    /// Compact board header, e.g. "DEVIOUS · 7/10".
    public static func badge(difficulty: Int) -> String {
        "\(DifficultyTier(difficulty: difficulty).name.uppercased()) · \(difficulty)/10"
    }

    public static func accessibilityLabel(difficulty: Int) -> String {
        "Difficulty: \(DifficultyTier(difficulty: difficulty).name), \(difficulty) out of 10"
    }
}
