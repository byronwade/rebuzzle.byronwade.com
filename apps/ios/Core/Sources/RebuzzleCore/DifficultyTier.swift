/// Named difficulty band, mirroring the web's canonical DIFFICULTY_LEVELS
/// (apps/web/src/ai/puzzle-agent/difficulty-levels.ts) so players and the
/// puzzle generator share one vocabulary on every platform.
public enum DifficultyTier: String, Sendable, CaseIterable {
    case hard = "Hard"
    case difficult = "Difficult"
    case evil = "Evil"
    case impossible = "Impossible"

    public init(difficulty: Int) {
        switch difficulty {
        case ..<6: self = .hard
        case 6: self = .difficult
        case 7: self = .evil
        default: self = .impossible
        }
    }

    public var name: String { rawValue }

    /// Compact board header, e.g. "EVIL · 7/10".
    public static func badge(difficulty: Int) -> String {
        "\(DifficultyTier(difficulty: difficulty).name.uppercased()) · \(difficulty)/10"
    }

    public static func accessibilityLabel(difficulty: Int) -> String {
        "Difficulty: \(DifficultyTier(difficulty: difficulty).name), \(difficulty) out of 10"
    }
}
