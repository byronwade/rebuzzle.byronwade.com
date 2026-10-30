import Foundation
import Testing
@testable import RebuzzleCore

struct JournalTests {
    private let legacyEntry = #"{"puzzleID":"daily-1","puzzleDate":"2026-10-27","puzzleType":"rebus","clue":"💡 + 🏠","answer":"lighthouse","explanation":"Light plus house.","won":true,"attempts":1,"hintsUsed":0,"note":"A good one.","visual":null}"#

    @Test func legacyEntryDecodesWithoutHintsAndReencodesAnEmptyList() throws {
        let entry = try JSONDecoder().decode(JournalEntry.self, from: Data(legacyEntry.utf8))
        let encoded = try JSONEncoder().encode(entry)
        let object = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

        #expect(entry.puzzleID == "daily-1")
        #expect(entry.answer == "lighthouse")
        #expect(entry.note == "A good one.")
        #expect(object["hints"] as? [String] == [])
    }

    @Test func entryRoundTripPreservesHintOrderAndContent() throws {
        let object: [String: Any] = [
            "puzzleID": "daily-1",
            "puzzleDate": "2026-10-27",
            "puzzleType": "rebus",
            "clue": "💡 + 🏠",
            "answer": "lighthouse",
            "explanation": "Light plus house.",
            "won": true,
            "attempts": 1,
            "hintsUsed": 0,
            "note": "",
            "hints": ["Read left to right.", "Name each picture.", "Join the parts."]
        ]
        let data = try JSONSerialization.data(withJSONObject: object)
        let entry = try JSONDecoder().decode(JournalEntry.self, from: data)
        let encoded = try JSONEncoder().encode(entry)
        let roundTrip = try #require(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

        #expect(roundTrip["hints"] as? [String] == ["Read left to right.", "Name each picture.", "Join the parts."])
    }
}
