public struct PlusOfferExposure: Sendable {
    private var hasRecordedVisibleOffer = false

    public init() {}

    /// Marks a contextual Plus offer once after the free sample round has finished and the offer is on screen.
    public mutating func markVisible(isFreeSample: Bool, roundComplete: Bool, isVisible: Bool) -> Bool {
        guard isFreeSample, roundComplete, isVisible, !hasRecordedVisibleOffer else { return false }
        hasRecordedVisibleOffer = true
        return true
    }
}
