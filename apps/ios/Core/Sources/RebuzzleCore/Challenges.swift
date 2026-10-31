import Foundation

/// Server-derived challenge ladder from `/api/user/progress`. Tiers and XP are
/// owned by the server; the app only displays and celebrates them.
public struct ChallengeProgress: Codable, Equatable, Sendable {
    public let tiersUnlocked: Int
    public let tiersTotal: Int
    public let challengeXP: Int
    public let categories: [ChallengeCategory]
    public let lines: [ChallengeLine]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        tiersUnlocked = try container.decode(Int.self, forKey: .tiersUnlocked)
        tiersTotal = try container.decode(Int.self, forKey: .tiersTotal)
        challengeXP = try container.decode(Int.self, forKey: .challengeXP)
        categories = try container.decode([ChallengeCategory].self, forKey: .categories)
        lines = try container.decode([ChallengeLine].self, forKey: .lines)
        guard tiersUnlocked >= 0, tiersTotal >= tiersUnlocked, challengeXP >= 0,
              Set(lines.map(\.id)).count == lines.count else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Invalid challenge progress"))
        }
    }

    public var masteredCount: Int { categories.filter(\.mastered).count }

    /// Tiers gained between two server snapshots. A missing previous snapshot
    /// yields nothing so the first sync never replays a player's history.
    public static func newlyUnlocked(previous: ChallengeProgress?, current: ChallengeProgress) -> [ChallengeUnlock] {
        guard let previous else { return [] }
        let before = Dictionary(uniqueKeysWithValues: previous.lines.map { ($0.id, $0.tier) })
        return current.lines.flatMap { line -> [ChallengeUnlock] in
            let start = (before[line.id] ?? 0) + 1
            guard line.tier >= start else { return [] }
            return (start...line.tier).map { tier in
                ChallengeUnlock(lineID: line.id, title: line.displayTitle, tier: tier, maxTier: line.maxTier,
                                xp: line.xp(forTier: tier), symbol: line.symbol)
            }
        }
    }
}

public enum ChallengeCategoryID: String, Codable, Sendable, CaseIterable {
    case devotion, precision, grit, rhythm, secrets
}

public struct ChallengeCategory: Codable, Equatable, Sendable, Identifiable {
    public let id: ChallengeCategoryID
    public let title: String
    public let mastered: Bool
}

public struct ChallengeLine: Codable, Equatable, Sendable, Identifiable {
    public static let tierXP = [25, 50, 100, 200, 400]
    public static let secretXP = 100

    public let id: String
    public let category: ChallengeCategoryID
    public let title: String?
    public let description: String?
    public let secret: Bool
    public let value: Int?
    public let thresholds: [Int]
    public let tier: Int
    public let unlockedAt: [String?]

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        category = try container.decode(ChallengeCategoryID.self, forKey: .category)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        secret = try container.decode(Bool.self, forKey: .secret)
        value = try container.decodeIfPresent(Int.self, forKey: .value)
        thresholds = try container.decode([Int].self, forKey: .thresholds)
        tier = try container.decode(Int.self, forKey: .tier)
        unlockedAt = try container.decode([String?].self, forKey: .unlockedAt)

        let expectedCount = secret ? 1 : 5
        let ascending = zip(thresholds, thresholds.dropFirst()).allSatisfy { $0 < $1 }
        let reached = value.map { current in thresholds.filter { current >= $0 }.count } ?? 0
        guard !id.isEmpty, thresholds.count == expectedCount, ascending, thresholds.allSatisfy({ $0 > 0 }),
              value.map({ $0 >= 0 }) ?? true, tier == reached,
              unlockedAt.count == thresholds.count, unlockedAt.compactMap({ $0 }).count == tier,
              secret || (title != nil && value != nil) else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Invalid challenge line \(id)"))
        }
    }

    public var isRevealed: Bool { title != nil }
    public var maxTier: Int { thresholds.count }
    public var isMaxed: Bool { tier >= maxTier }
    public var displayTitle: String { title ?? "Classified" }
    public var displayDescription: String { description ?? "Keep playing to reveal it." }
    public var nextThreshold: Int? { isMaxed ? nil : thresholds[tier] }
    public var previousThreshold: Int { tier == 0 ? 0 : thresholds[tier - 1] }

    /// Progress from the last unlocked threshold to the next one, 0...1.
    public var fractionToNext: Double {
        guard let next = nextThreshold else { return 1 }
        let span = Double(next - previousThreshold)
        return span > 0 ? min(1, max(0, Double((value ?? 0) - previousThreshold) / span)) : 0
    }

    public func xp(forTier tier: Int) -> Int {
        secret ? Self.secretXP : Self.tierXP[max(0, min(tier, Self.tierXP.count) - 1)]
    }

    public var symbol: String {
        switch id {
        case "dailies": "calendar"
        case "streak": "flame"
        case "trails": "figure.walk"
        case "perfect-weeks": "calendar.badge.checkmark"
        case "first-guess": "scope"
        case "unassisted": "hand.raised.slash"
        case "solves": "puzzlepiece"
        case "clutch": "bolt"
        case "extended": "infinity"
        case "early-bird": "sunrise"
        case "night-owl": "moon.stars"
        case "new-year": isRevealed ? "sparkles" : "questionmark.diamond"
        case "halloween": isRevealed ? "theatermasks" : "questionmark.diamond"
        case "leap-day": isRevealed ? "hare" : "questionmark.diamond"
        default: "star"
        }
    }

    public static func roman(_ number: Int) -> String {
        ["", "I", "II", "III", "IV", "V"][max(0, min(number, 5))]
    }
}

public struct ChallengeUnlock: Equatable, Sendable, Identifiable {
    public let lineID: String
    public let title: String
    public let tier: Int
    public let maxTier: Int
    public let xp: Int
    public let symbol: String
    public var id: String { "\(lineID)-\(tier)" }

    public init(lineID: String, title: String, tier: Int, maxTier: Int, xp: Int, symbol: String) {
        self.lineID = lineID
        self.title = title
        self.tier = tier
        self.maxTier = maxTier
        self.xp = xp
        self.symbol = symbol
    }
}

/// Original rank ladder: each rank spans five levels with a roman sub-tier.
public struct PrestigeRank: Equatable, Sendable {
    private static let ranks: [(name: String, symbol: String)] = [
        ("Recruit", "circle.hexagongrid"),
        ("Solver", "puzzlepiece.extension"),
        ("Cipher", "key"),
        ("Codebreaker", "lock.open"),
        ("Oracle", "eye"),
        ("Grandmaster", "crown"),
    ]
    public static let maxLevel = ranks.count * 5

    public let level: Int
    public let name: String
    public let subTier: String
    public let subTierNumber: Int
    public let symbol: String

    public init(level: Int) {
        let capped = max(1, min(level, Self.maxLevel))
        let rank = Self.ranks[(capped - 1) / 5]
        self.level = level
        name = rank.name
        subTierNumber = (capped - 1) % 5 + 1
        subTier = ChallengeLine.roman(subTierNumber)
        symbol = rank.symbol
    }

    public var title: String { "\(name) \(subTier)" }
    public var next: PrestigeRank? { level >= Self.maxLevel ? nil : PrestigeRank(level: level + 1) }
}
