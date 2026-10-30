import RebuzzleCore
import XCTest

final class PlusOfferExposureTests: XCTestCase {
    func testRecordsCompletedFreeSampleOfferOnlyOncePerVisit() {
        var exposure = PlusOfferExposure()

        XCTAssertFalse(exposure.markVisible(isFreeSample: true, roundComplete: true, isVisible: false))
        XCTAssertTrue(exposure.markVisible(isFreeSample: true, roundComplete: true, isVisible: true))
        XCTAssertFalse(exposure.markVisible(isFreeSample: true, roundComplete: true, isVisible: true))
    }

    func testDoesNotRecordPaidPracticeOrStandardArchiveOffers() {
        var exposure = PlusOfferExposure()

        XCTAssertFalse(exposure.markVisible(isFreeSample: false, roundComplete: true, isVisible: true))
        XCTAssertFalse(exposure.markVisible(isFreeSample: true, roundComplete: false, isVisible: true))
        XCTAssertTrue(exposure.markVisible(isFreeSample: true, roundComplete: true, isVisible: true))
    }
}
