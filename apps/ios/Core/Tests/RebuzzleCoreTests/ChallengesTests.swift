import Foundation
import Testing
@testable import RebuzzleCore

private let categoriesJSON = #"[{"id":"devotion","title":"Devotion","mastered":false},{"id":"precision","title":"Precision","mastered":false},{"id":"grit","title":"Grit","mastered":false},{"id":"rhythm","title":"Rhythm","mastered":false},{"id":"secrets","title":"Secrets","mastered":false}]"#

private func lineJSON(
    id: String = "dailies",
    category: String = "devotion",
    value: String = "41",
    thresholds: String = "[1,7,30,100,365]",
    tier: Int = 3,
    unlockedAt: String = #"["2026-08-02","2026-08-08","2026-09-01",null,null]"#,
    secret: Bool = false,
    title: String = #""Daily devotion""#
) -> String {
    #"{"id":"\#(id)","category":"\#(category)","title":\#(title),"description":\#(title == "null" ? "null" : #""Finish daily puzzles""#),"secret":\#(secret),"value":\#(value),"thresholds":\#(thresholds),"tier":\#(tier),"unlockedAt":\#(unlockedAt)}"#
}

private func progressJSON(lines: [String], tiersUnlocked: Int = 3, xp: Int = 175) -> Data {
    Data(#"{"tiersUnlocked":\#(tiersUnlocked),"tiersTotal":58,"challengeXP":\#(xp),"categories":\#(categoriesJSON),"lines":[\#(lines.joined(separator: ","))]}"#.utf8)
}

private func decode(_ data: Data) throws -> ChallengeProgress {
    try JSONDecoder().decode(ChallengeProgress.self, from: data)
}

@Test func decodesServerChallengeProgress() throws {
    let progress = try decode(progressJSON(lines: [lineJSON()]))
    let line = try #require(progress.lines.first)

    #expect(progress.tiersTotal == 58)
    #expect(progress.categories.count == 5)
    #expect(line.displayTitle == "Daily devotion")
    #expect(line.tier == 3)
    #expect(line.maxTier == 5)
    #expect(line.nextThreshold == 100)
    #expect(line.previousThreshold == 30)
    #expect(abs(line.fractionToNext - (11.0 / 70.0)) < 0.0001)
    #expect(line.isRevealed)
}

@Test func rejectsInconsistentChallengeLines() {
    #expect(throws: DecodingError.self) { try decode(progressJSON(lines: [lineJSON(thresholds: "[1,7,30,365,100]")])) }
    #expect(throws: DecodingError.self) { try decode(progressJSON(lines: [lineJSON(thresholds: "[1,7,30,100]", unlockedAt: "[null,null,null,null]")])) }
    #expect(throws: DecodingError.self) { try decode(progressJSON(lines: [lineJSON(tier: 2)])) }
    #expect(throws: DecodingError.self) { try decode(progressJSON(lines: [lineJSON(value: "-1", tier: 0)])) }
    #expect(throws: DecodingError.self) { try decode(progressJSON(lines: [lineJSON(unlockedAt: "[null]")])) }
    #expect(throws: DecodingError.self) { try decode(progressJSON(lines: [lineJSON(category: "speed")])) }
}

@Test func lockedSecretStaysClassified() throws {
    let secret = lineJSON(id: "new-year", category: "secrets", value: "null", thresholds: "[1]", tier: 0,
                          unlockedAt: "[null]", secret: true, title: "null")
    let line = try #require(try decode(progressJSON(lines: [secret], tiersUnlocked: 0, xp: 0)).lines.first)

    #expect(!line.isRevealed)
    #expect(line.displayTitle == "Classified")
    #expect(line.nextThreshold == 1)
}

@Test func maxedLineHasNoNextThreshold() throws {
    let line = try #require(try decode(progressJSON(lines: [lineJSON(value: "400", tier: 5,
        unlockedAt: #"["a","b","c","d","e"]"#)])).lines.first)

    #expect(line.nextThreshold == nil)
    #expect(line.fractionToNext == 1)
}

@Test func romanNumeralsCoverEveryTier() {
    #expect((1...5).map(ChallengeLine.roman) == ["I", "II", "III", "IV", "V"])
}

@Test func prestigeRanksStepEveryFiveLevels() {
    #expect(PrestigeRank(level: 1).title == "Recruit I")
    #expect(PrestigeRank(level: 7).title == "Solver II")
    #expect(PrestigeRank(level: 25).title == "Oracle V")
    #expect(PrestigeRank(level: 30).title == "Grandmaster V")
    #expect(PrestigeRank(level: 7).next?.title == "Solver III")
}

@Test func newlyUnlockedReportsOnlyTierIncreases() throws {
    let before = try decode(progressJSON(lines: [lineJSON(value: "29", tier: 2, unlockedAt: #"["a","b",null,null,null]"#)]))
    let after = try decode(progressJSON(lines: [lineJSON()]))

    let unlocks = ChallengeProgress.newlyUnlocked(previous: before, current: after)
    #expect(unlocks == [ChallengeUnlock(lineID: "dailies", title: "Daily devotion", tier: 3, xp: 100, symbol: "calendar")])
    #expect(ChallengeProgress.newlyUnlocked(previous: nil, current: after).isEmpty)
    #expect(ChallengeProgress.newlyUnlocked(previous: after, current: after).isEmpty)
}

@Test func snapshotDecodesWithAndWithoutChallenges() throws {
    let base = #"{"asOfPuzzleDate":"2026-10-26","currentWeekStart":"2026-10-26","currentWeekEnd":"2026-11-01","summary":{"totalXP":0,"level":1,"xpIntoLevel":0,"finishes":0,"solves":0,"firstGuessSolves":0,"unassistedSolves":0,"completedThisWeek":0,"badges":[]},"recentEntries":[],"backfill":{"status":"complete"}"#
    let without = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: Data((base + "}").utf8))
    #expect(without.challenges == nil)

    let challenges = String(decoding: progressJSON(lines: [lineJSON()]), as: UTF8.self)
    let with = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: Data((base + #","challenges":\#(challenges)}"#).utf8))
    #expect(with.challenges?.lines.count == 1)

    let roundTrip = try JSONDecoder().decode(JourneyProgressSnapshot.self, from: JSONEncoder().encode(with))
    #expect(roundTrip == with)
}
