import Testing
@testable import RebuzzleCore

@Test func difficultyTiersCoverTheWholeScaleInOrder() {
    #expect(DifficultyTier(difficulty: 1) == .warmUp)
    #expect(DifficultyTier(difficulty: 3) == .warmUp)
    #expect(DifficultyTier(difficulty: 5) == .tricky)
    #expect(DifficultyTier(difficulty: 7) == .devious)
    #expect(DifficultyTier(difficulty: 8) == .fiendish)
    #expect(DifficultyTier(difficulty: 10) == .diabolical)
    #expect(DifficultyTier(difficulty: 42) == .diabolical)
}

@Test func difficultyBadgeAndSpokenLabelNameTheTier() {
    #expect(DifficultyTier.badge(difficulty: 7) == "DEVIOUS · 7/10")
    #expect(DifficultyTier.accessibilityLabel(difficulty: 9) == "Difficulty: Fiendish, 9 out of 10")
}
