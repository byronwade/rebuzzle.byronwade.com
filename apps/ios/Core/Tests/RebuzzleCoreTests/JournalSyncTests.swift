import Foundation
import Testing
@testable import RebuzzleCore

private func journalEntry(note: String = "") -> JournalEntry {
    JournalEntry(
        puzzleID: "puzzle-1",
        puzzleDate: "2026-10-25",
        puzzleType: "rebus",
        clue: "MIND over MATTER",
        answer: "mind over matter",
        explanation: "MIND sits above MATTER.",
        won: true,
        attempts: 2,
        hintsUsed: 1,
        note: note
    )
}

private func remoteEntry(note: String, revision: Int) -> JournalSyncRemoteEntry {
    JournalSyncRemoteEntry(entry: journalEntry(note: note), noteRevision: revision)
}

@Test func firstSyncMigratesAnExistingLocalNoteWhenTheAccountHasNoNote() {
    var local = Journal()
    local.record(journalEntry(note: "The word above was the clue."))

    let result = JournalSyncReconciler.reconcile(
        local: local,
        checkpoint: JournalSyncCheckpoint(),
        remote: [remoteEntry(note: "", revision: 0)]
    )

    #expect(result.journal.entries.first?.note == "The word above was the clue.")
    #expect(result.pendingWrites == [
        JournalSyncNoteWrite(
            puzzleID: "puzzle-1",
            note: "The word above was the clue.",
            expectedRevision: 0
        )
    ])
    #expect(result.conflicts.isEmpty)
}

@Test func firstSyncAdoptsTheAccountNoteOnADeviceWithoutALocalEntry() {
    let result = JournalSyncReconciler.reconcile(
        local: Journal(),
        checkpoint: JournalSyncCheckpoint(),
        remote: [remoteEntry(note: "A memory from my phone.", revision: 3)]
    )

    #expect(result.journal.entries.first?.note == "A memory from my phone.")
    #expect(result.checkpoint.entries["puzzle-1"]?.revision == 3)
    #expect(result.pendingWrites.isEmpty)
}

@Test func remoteOnlyEditsAreAdoptedWithoutOverwritingLocalChanges() {
    var local = Journal()
    local.record(journalEntry(note: "Before."))
    let checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(revision: 1, lastSyncedNote: "Before."),
    ])

    let result = JournalSyncReconciler.reconcile(
        local: local,
        checkpoint: checkpoint,
        remote: [remoteEntry(note: "The account edit.", revision: 2)]
    )

    #expect(result.journal.entries.first?.note == "The account edit.")
    #expect(result.checkpoint.entries["puzzle-1"]?.lastSyncedNote == "The account edit.")
    #expect(result.pendingWrites.isEmpty)
    #expect(result.conflicts.isEmpty)
}

@Test func localOnlyEditsCreateAWriteAgainstTheLatestAccountRevision() {
    var local = Journal()
    local.record(journalEntry(note: "Updated on this phone."))
    let checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(revision: 2, lastSyncedNote: "Original."),
    ])

    let result = JournalSyncReconciler.reconcile(
        local: local,
        checkpoint: checkpoint,
        remote: [remoteEntry(note: "Original.", revision: 2)]
    )

    #expect(result.pendingWrites == [
        JournalSyncNoteWrite(
            puzzleID: "puzzle-1",
            note: "Updated on this phone.",
            expectedRevision: 2
        )
    ])
    #expect(result.conflicts.isEmpty)
    #expect(result.journal.entries.first?.note == "Updated on this phone.")
}

@Test func simultaneousEditsPreserveBothVersionsUntilAChoice() {
    var local = Journal()
    local.record(journalEntry(note: "This phone's version."))
    let checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(revision: 1, lastSyncedNote: "Original."),
    ])

    let result = JournalSyncReconciler.reconcile(
        local: local,
        checkpoint: checkpoint,
        remote: [remoteEntry(note: "The account version.", revision: 2)]
    )

    #expect(result.journal.entries.first?.note == "This phone's version.")
    #expect(result.conflicts == [
        JournalSyncConflict(
            puzzleID: "puzzle-1",
            localNote: "This phone's version.",
            accountNote: "The account version.",
            accountRevision: 2
        )
    ])
    #expect(result.checkpoint.entries["puzzle-1"]?.remoteConflict?.note == "The account version.")
    #expect(result.pendingWrites.isEmpty)
}

@Test func equalNotesConvergeEvenWhenTheAccountRevisionAdvanced() {
    var local = Journal()
    local.record(journalEntry(note: "Same words."))
    let checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(revision: 1, lastSyncedNote: "Same words."),
    ])

    let result = JournalSyncReconciler.reconcile(
        local: local,
        checkpoint: checkpoint,
        remote: [remoteEntry(note: "Same words.", revision: 4)]
    )

    #expect(result.checkpoint.entries["puzzle-1"]?.revision == 4)
    #expect(result.pendingWrites.isEmpty)
    #expect(result.conflicts.isEmpty)
}

@Test func accountVersionResolutionReplacesTheLocalNote() {
    var journal = Journal()
    journal.record(journalEntry(note: "This phone."))
    var checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(
            revision: 2,
            lastSyncedNote: "Original.",
            remoteConflict: JournalSyncRemoteNote(note: "Account.", revision: 2)
        ),
    ])

    let write = JournalSyncReconciler.resolve(
        puzzleID: "puzzle-1",
        choice: .account,
        journal: &journal,
        checkpoint: &checkpoint
    )

    #expect(write == nil)
    #expect(journal.entries.first?.note == "Account.")
    #expect(checkpoint.entries["puzzle-1"]?.lastSyncedNote == "Account.")
    #expect(checkpoint.entries["puzzle-1"]?.remoteConflict == nil)
}

@Test func deviceVersionResolutionCreatesACompareAndSetWrite() {
    var journal = Journal()
    journal.record(journalEntry(note: "This phone."))
    var checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(
            revision: 5,
            lastSyncedNote: "Original.",
            remoteConflict: JournalSyncRemoteNote(note: "Account.", revision: 5)
        ),
    ])

    let write = JournalSyncReconciler.resolve(
        puzzleID: "puzzle-1",
        choice: .device,
        journal: &journal,
        checkpoint: &checkpoint
    )

    #expect(write == JournalSyncNoteWrite(puzzleID: "puzzle-1", note: "This phone.", expectedRevision: 5))
    #expect(checkpoint.entries["puzzle-1"]?.lastSyncedNote == "Account.")
    #expect(checkpoint.entries["puzzle-1"]?.remoteConflict == nil)
}

@Test func combineResolutionKeepsBothNotesAndCreatesACompareAndSetWrite() {
    var journal = Journal()
    journal.record(journalEntry(note: "This phone."))
    var checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(
            revision: 4,
            lastSyncedNote: "Original.",
            remoteConflict: JournalSyncRemoteNote(note: "Account.", revision: 4)
        ),
    ])

    let write = JournalSyncReconciler.resolve(
        puzzleID: "puzzle-1",
        choice: .combine,
        journal: &journal,
        checkpoint: &checkpoint
    )

    #expect(journal.entries.first?.note == "This phone.\n\nAccount.")
    #expect(write == JournalSyncNoteWrite(
        puzzleID: "puzzle-1",
        note: "This phone.\n\nAccount.",
        expectedRevision: 4
    ))
}

@Test func oversizedCombineKeepsBothConflictVersionsAvailable() {
    let localNote = String(repeating: "L", count: JournalNoteLimits.maximumGraphemes)
    let accountNote = String(repeating: "A", count: JournalNoteLimits.maximumGraphemes)
    var journal = Journal()
    journal.record(journalEntry(note: localNote))
    var checkpoint = JournalSyncCheckpoint(entries: [
        "puzzle-1": JournalSyncCheckpointEntry(
            revision: 4,
            lastSyncedNote: "Original.",
            remoteConflict: JournalSyncRemoteNote(note: accountNote, revision: 4)
        ),
    ])

    let write = JournalSyncReconciler.resolve(
        puzzleID: "puzzle-1",
        choice: .combine,
        journal: &journal,
        checkpoint: &checkpoint
    )

    #expect(write == nil)
    #expect(journal.entries.first?.note == localNote)
    #expect(checkpoint.entries["puzzle-1"]?.remoteConflict?.note == accountNote)
}

@Test func successfulWriteAdvancesTheSyncBaseline() {
    var checkpoint = JournalSyncCheckpoint()
    let write = JournalSyncNoteWrite(puzzleID: "puzzle-1", note: "Saved.", expectedRevision: 0)

    JournalSyncReconciler.markSaved(write, revision: 1, checkpoint: &checkpoint)

    #expect(checkpoint.entries["puzzle-1"]?.revision == 1)
    #expect(checkpoint.entries["puzzle-1"]?.lastSyncedNote == "Saved.")
    #expect(checkpoint.entries["puzzle-1"]?.remoteConflict == nil)
}

@Test func unknownHistoricalHintCountsStayUnknownAndExportClearly() throws {
    let raw = #"{"puzzleID":"puzzle-1","puzzleDate":"2026-10-25","puzzleType":"rebus","clue":"MIND over MATTER","answer":"mind over matter","explanation":"MIND sits above MATTER.","won":true,"attempts":2,"note":"A note."}"#
    let entry = try? JSONDecoder().decode(JournalEntry.self, from: Data(raw.utf8))
    #expect(entry != nil)
    #expect(entry?.hintsUsed == nil)

    if let entry {
        var journal = Journal()
        journal.record(entry)
        #expect(journal.exportText.contains("hints not recorded"))
    }
}

@Test func journalNoteLimitsMatchTheServerGraphemeAndByteCaps() {
    let composed = String(repeating: "e\u{301}", count: 10_001)
    let boundedComposed = JournalNoteLimits.truncated(composed)
    #expect(boundedComposed.count == JournalNoteLimits.maximumGraphemes)

    let emoji = String(repeating: "😀", count: 10_001)
    let boundedEmoji = JournalNoteLimits.truncated(emoji)
    #expect(boundedEmoji.count == JournalNoteLimits.maximumGraphemes)
    #expect(boundedEmoji.utf8.count == JournalNoteLimits.maximumUTF8Bytes)

    let familyEmoji = String(repeating: "👨‍👩‍👧‍👦", count: 2_000)
    let boundedFamilies = JournalNoteLimits.truncated(familyEmoji)
    #expect(boundedFamilies.utf8.count <= JournalNoteLimits.maximumUTF8Bytes)
    #expect(familyEmoji.hasPrefix(boundedFamilies))
}

@Test func syncBackfillsHintsMissingFromALegacyLocalEntryWithoutTouchingTheNote() {
    var local = Journal()
    local.record(journalEntry(note: "Saw it on the second look."))
    let remote = JournalSyncRemoteEntry(
        entry: JournalEntry(
            puzzleID: "puzzle-1", puzzleDate: "2026-10-25", puzzleType: "rebus",
            clue: "MIND over MATTER", answer: "mind over matter",
            explanation: "MIND sits above MATTER.", won: true, attempts: 2, hintsUsed: 1,
            note: "Saw it on the second look.",
            hints: ["Look at the positions.", "One word is higher."]
        ),
        noteRevision: 3
    )

    let result = JournalSyncReconciler.reconcile(
        local: local,
        checkpoint: JournalSyncCheckpoint(),
        remote: [remote]
    )

    let entry = result.journal.entries.first
    #expect(entry?.hints == ["Look at the positions.", "One word is higher."])
    #expect(entry?.note == "Saw it on the second look.")
    #expect(result.pendingWrites.isEmpty)
    #expect(result.conflicts.isEmpty)
}

@Test func syncKeepsHintsAlreadyStoredOnThisDevice() {
    let stored = JournalEntry(
        puzzleID: "puzzle-1", puzzleDate: "2026-10-25", puzzleType: "rebus",
        clue: "MIND over MATTER", answer: "mind over matter",
        explanation: "MIND sits above MATTER.", won: true, attempts: 2, hintsUsed: 1,
        hints: ["Local hint."]
    )
    let remote = JournalEntry(
        puzzleID: "puzzle-1", puzzleDate: "2026-10-25", puzzleType: "rebus",
        clue: "MIND over MATTER", answer: "mind over matter",
        explanation: "MIND sits above MATTER.", won: true, attempts: 2, hintsUsed: 1,
        hints: ["Account hint."]
    )
    #expect(stored.backfillingMissingPuzzleDetails(from: remote).hints == ["Local hint."])
}
