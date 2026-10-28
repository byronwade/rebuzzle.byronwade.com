import Foundation
import XCTest
@testable import RebuzzleCore

final class DailySolveDistributionTests: XCTestCase {
    func testDecodesAvailableDistributionAndSelectsPlayerBucket() throws {
        let json = #"{"available":true,"minimumSolves":20,"oneGuessPercent":30,"twoGuessesPercent":30,"threeGuessesPercent":20,"fourPlusPercent":20}"#.data(using: .utf8)!

        let distribution = try JSONDecoder().decode(DailySolveDistribution.self, from: json)

        XCTAssertTrue(distribution.available)
        XCTAssertEqual(distribution.minimumSolves, 20)
        XCTAssertEqual(distribution.percentage(for: .oneGuess), 30)
        XCTAssertEqual(distribution.bucket(forAttemptNumber: 1), .oneGuess)
        XCTAssertEqual(distribution.bucket(forAttemptNumber: 2), .twoGuesses)
        XCTAssertEqual(distribution.bucket(forAttemptNumber: 3), .threeGuesses)
        XCTAssertEqual(distribution.bucket(forAttemptNumber: 4), .fourPlus)
        XCTAssertEqual(distribution.bucket(forAttemptNumber: 12), .fourPlus)
        XCTAssertNil(distribution.bucket(forAttemptNumber: 0))
    }

    func testDecodesUnavailableDistributionWithoutRevealingSampleCount() throws {
        let json = #"{"available":false,"minimumSolves":20,"oneGuessPercent":0,"twoGuessesPercent":0,"threeGuessesPercent":0,"fourPlusPercent":0}"#.data(using: .utf8)!

        let distribution = try JSONDecoder().decode(DailySolveDistribution.self, from: json)

        XCTAssertFalse(distribution.available)
        XCTAssertEqual(distribution.minimumSolves, 20)
        XCTAssertEqual(distribution.percentage(for: .fourPlus), 0)
    }
}
