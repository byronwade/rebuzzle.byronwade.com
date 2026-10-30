import Testing
@testable import RebuzzleCore

@Test func difficultyTiersMatchTheWebBands() {
    #expect(DifficultyTier(difficulty: 1) == .hard)
    #expect(DifficultyTier(difficulty: 5) == .hard)
    #expect(DifficultyTier(difficulty: 6) == .difficult)
    #expect(DifficultyTier(difficulty: 7) == .evil)
    #expect(DifficultyTier(difficulty: 8) == .impossible)
    #expect(DifficultyTier(difficulty: 10) == .impossible)
}

@Test func difficultyBadgeAndSpokenLabelNameTheTier() {
    #expect(DifficultyTier.badge(difficulty: 7) == "EVIL · 7/10")
    #expect(DifficultyTier.accessibilityLabel(difficulty: 9) == "Difficulty: Impossible, 9 out of 10")
}
