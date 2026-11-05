import XCTest
@testable import RebuzzleCore

final class CanonicalBoardPinGeometryTests: XCTestCase {
    func testMapsTouchesThroughAspectFitLetterboxing() throws {
        let center = try XCTUnwrap(CanonicalBoardPinGeometry.normalizedPoint(
            tapX: 170,
            tapY: 150,
            containerWidth: 340,
            containerHeight: 300,
            imageWidth: 768,
            imageHeight: 248
        ))

        XCTAssertEqual(center.x, 0.5, accuracy: 0.0001)
        XCTAssertEqual(center.y, 0.5, accuracy: 0.0001)
    }

    func testIgnoresTouchesOutsideTheRenderedImage() {
        let inLetterbox = CanonicalBoardPinGeometry.normalizedPoint(
            tapX: 170,
            tapY: 80,
            containerWidth: 340,
            containerHeight: 300,
            imageWidth: 768,
            imageHeight: 248
        )

        XCTAssertNil(inLetterbox)
    }

    func testUsesTheSelectedPhoneRasterAspectRatio() throws {
        let leftEdge = try XCTUnwrap(CanonicalBoardPinGeometry.normalizedPoint(
            tapX: 0,
            tapY: 50,
            containerWidth: 300,
            containerHeight: 100,
            imageWidth: 300,
            imageHeight: 100
        ))

        XCTAssertEqual(leftEdge.x, 0, accuracy: 0.0001)
        XCTAssertEqual(leftEdge.y, 0.5, accuracy: 0.0001)
    }

    func testRejectsInvalidImageAndContainerSizes() {
        XCTAssertNil(CanonicalBoardPinGeometry.normalizedPoint(
            tapX: 0,
            tapY: 0,
            containerWidth: 0,
            containerHeight: 100,
            imageWidth: 300,
            imageHeight: 100
        ))
        XCTAssertNil(CanonicalBoardPinGeometry.normalizedPoint(
            tapX: 0,
            tapY: 0,
            containerWidth: 300,
            containerHeight: 100,
            imageWidth: Double.nan,
            imageHeight: 100
        ))
    }

    func testRejectsPersistedPointsOutsideTheImage() {
        let encoded = Data(#"{"x":1.25,"y":0.5}"#.utf8)

        XCTAssertThrowsError(try JSONDecoder().decode(CanonicalBoardPinPoint.self, from: encoded))
    }
}
