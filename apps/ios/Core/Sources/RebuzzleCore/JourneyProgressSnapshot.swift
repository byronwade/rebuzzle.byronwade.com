import Foundation

public enum JourneyProgressOutcome: String, Codable, Equatable, Sendable {
    case solved
    case failed
}

public enum JourneyProgressPlayMode: String, Codable, Equatable, Sendable {
    case extended
}

public enum JourneyProgressBackfillStatus: String, Codable, Equatable, Sendable {
    case notStarted = "not_started"
    case inProgress = "in_progress"
    case complete
    case failed
}

public struct JourneyProgressBackfill: Codable, Equatable, Sendable {
    public let status: JourneyProgressBackfillStatus
}

public struct JourneyWeeklyTrailReward: Codable, Equatable, Sendable {
    public let weekStart: String
    public let bonusXP: Int
    public let earned: Bool

    private enum CodingKeys: String, CodingKey {
        case weekStart
        case bonusXP
        case earned
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        weekStart = try container.decode(String.self, forKey: .weekStart)
        bonusXP = try container.decode(Int.self, forKey: .bonusXP)
        earned = try container.decode(Bool.self, forKey: .earned)
        guard validPuzzleDate(weekStart), bonusXP == 50 else {
            throw invalidPayload(decoder, "Invalid weekly trail reward")
        }
    }
}

public struct JourneyProgressEntry: Codable, Equatable, Sendable {
    public let puzzleDate: String
    public let puzzleId: String
    public let outcome: JourneyProgressOutcome
    public let attempts: Int
    public let hintCount: Int?
    public let completedAt: String
    public let timeZone: String?
    public let playMode: JourneyProgressPlayMode?

    private enum CodingKeys: String, CodingKey {
        case puzzleDate
        case puzzleId
        case outcome
        case attempts
        case hintCount
        case completedAt
        case timeZone
        case playMode
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        puzzleDate = try container.decode(String.self, forKey: .puzzleDate)
        puzzleId = try container.decode(String.self, forKey: .puzzleId)
        outcome = try container.decode(JourneyProgressOutcome.self, forKey: .outcome)
        attempts = try container.decode(Int.self, forKey: .attempts)

        guard container.contains(.hintCount) else {
            throw DecodingError.keyNotFound(
                CodingKeys.hintCount,
                .init(codingPath: container.codingPath, debugDescription: "Missing required nullable hintCount")
            )
        }
        hintCount = try container.decodeIfPresent(Int.self, forKey: .hintCount)
        completedAt = try container.decode(String.self, forKey: .completedAt)
        guard container.contains(.timeZone) else {
            throw DecodingError.keyNotFound(
                CodingKeys.timeZone,
                .init(codingPath: container.codingPath, debugDescription: "Missing required nullable timeZone")
            )
        }
        timeZone = try container.decodeIfPresent(String.self, forKey: .timeZone)
        playMode = try container.decodeIfPresent(JourneyProgressPlayMode.self, forKey: .playMode)

        let validAttemptCount: Bool
        if playMode == .extended {
            validAttemptCount = attempts >= 1
        } else {
            switch outcome {
            case .solved:
                validAttemptCount = (1...3).contains(attempts)
            case .failed:
                validAttemptCount = attempts == 3
            }
        }
        guard validPuzzleDate(puzzleDate), !puzzleId.isEmpty, validAttemptCount,
              hintCount.map({ $0 >= 0 }) ?? true,
              isISO8601Timestamp(completedAt),
              timeZone.map({ TimeZone(identifier: $0) != nil }) ?? true else {
            throw invalidPayload(decoder, "Invalid Journey progress entry")
        }
    }
}

public struct JourneyProgressSummary: Codable, Equatable, Sendable {
    public let totalXP: Int
    public let level: Int
    public let xpIntoLevel: Int
    public let finishes: Int
    public let solves: Int
    public let firstGuessSolves: Int
    public let unassistedSolves: Int
    public let completedThisWeek: Int
    public let badges: [String]

    private enum CodingKeys: String, CodingKey {
        case totalXP
        case level
        case xpIntoLevel
        case finishes
        case solves
        case firstGuessSolves
        case unassistedSolves
        case completedThisWeek
        case badges
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        totalXP = try container.decode(Int.self, forKey: .totalXP)
        level = try container.decode(Int.self, forKey: .level)
        xpIntoLevel = try container.decode(Int.self, forKey: .xpIntoLevel)
        finishes = try container.decode(Int.self, forKey: .finishes)
        solves = try container.decode(Int.self, forKey: .solves)
        firstGuessSolves = try container.decode(Int.self, forKey: .firstGuessSolves)
        unassistedSolves = try container.decode(Int.self, forKey: .unassistedSolves)
        completedThisWeek = try container.decode(Int.self, forKey: .completedThisWeek)
        badges = try container.decode([String].self, forKey: .badges)

        let counts = [totalXP, xpIntoLevel, finishes, solves, firstGuessSolves, unassistedSolves, completedThisWeek]
        let validBadgeIDs: Set<String> = [
            "first-finish",
            "first-guess-solve",
            "three-unassisted-solves",
            "seven-finishes"
        ]
        guard level > 0, xpIntoLevel < 300, counts.allSatisfy({ $0 >= 0 }), badges.allSatisfy(validBadgeIDs.contains),
              Set(badges).count == badges.count else {
            throw invalidPayload(decoder, "Invalid Journey progress summary")
        }
    }
}

public struct JourneyProgressSnapshot: Codable, Equatable, Sendable {
    public let asOfPuzzleDate: String
    public let currentWeekStart: String
    public let currentWeekEnd: String
    public let weeklyTrailReward: JourneyWeeklyTrailReward?
    public let summary: JourneyProgressSummary?
    public let recentEntries: [JourneyProgressEntry]
    public let backfill: JourneyProgressBackfill
    /// Absent from servers that predate the challenge ladder.
    public let challenges: ChallengeProgress?

    private enum CodingKeys: String, CodingKey {
        case asOfPuzzleDate
        case currentWeekStart
        case currentWeekEnd
        case weeklyTrailReward
        case summary
        case recentEntries
        case backfill
        case challenges
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        asOfPuzzleDate = try container.decode(String.self, forKey: .asOfPuzzleDate)
        currentWeekStart = try container.decode(String.self, forKey: .currentWeekStart)
        currentWeekEnd = try container.decode(String.self, forKey: .currentWeekEnd)
        weeklyTrailReward = try container.decodeIfPresent(JourneyWeeklyTrailReward.self, forKey: .weeklyTrailReward)
        guard container.contains(.summary) else {
            throw DecodingError.keyNotFound(
                CodingKeys.summary,
                .init(codingPath: container.codingPath, debugDescription: "Missing required summary field")
            )
        }
        summary = try container.decodeIfPresent(JourneyProgressSummary.self, forKey: .summary)
        recentEntries = try container.decode([JourneyProgressEntry].self, forKey: .recentEntries)
        backfill = try container.decode(JourneyProgressBackfill.self, forKey: .backfill)
        challenges = try container.decodeIfPresent(ChallengeProgress.self, forKey: .challenges)

        var weekCalendar = Calendar(identifier: .gregorian)
        weekCalendar.timeZone = TimeZone(secondsFromGMT: 0)!
        weekCalendar.firstWeekday = 2
        guard let start = puzzleDate(currentWeekStart), let end = puzzleDate(currentWeekEnd),
              let asOf = puzzleDate(asOfPuzzleDate),
              weekCalendar.component(.weekday, from: start) == 2,
              weekCalendar.component(.weekday, from: end) == 1,
              weekCalendar.dateComponents([.day], from: start, to: end).day == 6,
              asOf >= start, asOf <= end else {
            throw invalidPayload(decoder, "Invalid server-provided Journey week bounds")
        }
        if let weeklyTrailReward {
            guard weeklyTrailReward.weekStart == currentWeekStart,
                  backfill.status == .complete,
                  weeklyTrailReward.earned == ((summary?.completedThisWeek ?? 0) >= 3) else {
                throw invalidPayload(decoder, "Weekly trail reward must match the current week and summary")
            }
        }

        if backfill.status == .complete {
            guard summary != nil else { throw invalidPayload(decoder, "A complete backfill requires a summary") }
        } else {
            guard summary == nil, recentEntries.isEmpty else {
                throw invalidPayload(decoder, "An incomplete backfill cannot include progress entries")
            }
        }
    }
}

private func invalidPayload(_ decoder: Decoder, _ message: String) -> DecodingError {
    .dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: message))
}

private func validPuzzleDate(_ value: String) -> Bool {
    puzzleDate(value) != nil
}

private func puzzleDate(_ value: String) -> Date? {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.isLenient = false
    guard let date = formatter.date(from: value), formatter.string(from: date) == value else { return nil }
    return date
}

private func isISO8601Timestamp(_ value: String) -> Bool {
    let formatter = ISO8601DateFormatter()
    if formatter.date(from: value) != nil { return true }
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: value) != nil
}
