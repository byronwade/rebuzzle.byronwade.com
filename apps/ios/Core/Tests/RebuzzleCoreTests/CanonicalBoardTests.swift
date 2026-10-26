import XCTest
import CryptoKit
@testable import RebuzzleCore

final class CanonicalBoardTests: XCTestCase {
    private let png = Data(base64Encoded: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=")!
    private func visual(_ canonical: Any?) throws -> PuzzleVisual {
        var object: [String: Any] = ["mode": "unicode", "layers": [], "unicodeFallback": "Legacy"]
        if let canonical { object["canonicalBoard"] = canonical }
        return try JSONDecoder().decode(PuzzleVisual.self, from: JSONSerialization.data(withJSONObject: object))
    }
    private func artifact(_ overrides: [String: Any] = [:]) -> [String: Any] {
        var value: [String: Any] = ["version": 1, "pngDataUrl": "data:image/png;base64," + png.base64EncodedString(), "sha256": SHA256.hash(data: png).map { String(format: "%02x", $0) }.joined(), "width": 1, "height": 1, "sourceFingerprint": String(repeating: "a", count: 64)]
        value.merge(overrides) { _, new in new }
        return value
    }
    func testCanonicalFieldSurvivesCachingInsteadOfBecomingLegacy() throws {
        let source = try visual(artifact())
        let object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(source)) as! [String: Any]
        XCTAssertNotNil(object["canonicalBoard"], "The reviewed image must survive local cache encoding")
    }

    func testValidArtifactVerifiesExactBytes() throws {
        let board = try XCTUnwrap(visual(artifact()).canonicalBoard)
        XCTAssertEqual(board.pngData, png)
        XCTAssertEqual(board.width, 1)
        XCTAssertEqual(board.height, 1)
    }
    func testAbsentFieldKeepsLegacyRendering() throws {
        XCTAssertNil(try visual(nil).canonicalBoard)
    }
    func testMalformedFieldRemainsUnavailableAcrossCacheRoundTrip() throws {
        for malformed: Any in [NSNull(), "bad", 1, [:]] {
            let source = try visual(malformed)
            XCTAssertNotNil(source.canonicalBoard)
            XCTAssertNil(source.canonicalBoard?.pngData)
            let restored = try JSONDecoder().decode(PuzzleVisual.self, from: JSONEncoder().encode(source))
            XCTAssertNotNil(restored.canonicalBoard)
            XCTAssertNil(restored.canonicalBoard?.pngData)
        }
    }
    func testRejectsWrongHashDimensionsVersionAndFingerprint() throws {
        for invalid in [
            ["sha256": String(repeating: "0", count: 64)],
            ["width": 2], ["height": 0], ["width": 2049], ["version": 2],
            ["sourceFingerprint": String(repeating: "A", count: 64)],
            ["pngDataUrl": "data:image/jpeg;base64," + png.base64EncodedString()],
            ["pngDataUrl": "data:image/png;base64,not-base64"]
        ] as [[String: Any]] {
            let board = try XCTUnwrap(visual(artifact(invalid)).canonicalBoard)
            XCTAssertNil(board.pngData, "Invalid artifact: \(invalid.keys)")
        }
    }
    func testRejectsNonPNGAndOversizedBytesEvenWithMatchingHash() throws {
        for bytes in [Data("not a png".utf8), Data(repeating: 0, count: 1_048_577)] {
            let board = try XCTUnwrap(visual(artifact([
                "pngDataUrl": "data:image/png;base64," + bytes.base64EncodedString(),
                "sha256": SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined()
            ])).canonicalBoard)
            XCTAssertNil(board.pngData)
        }
    }
}
