import Foundation

public enum JournalNoteLimits {
    public static let maximumGraphemes = 10_000
    public static let maximumUTF8Bytes = 40_000

    public static func truncated(_ value: String) -> String {
        var result = ""
        var graphemeCount = 0
        var byteCount = 0
        for character in value {
            let characterBytes = String(character).utf8.count
            guard graphemeCount < maximumGraphemes,
                  byteCount + characterBytes <= maximumUTF8Bytes else { break }
            result.append(character)
            graphemeCount += 1
            byteCount += characterBytes
        }
        return result
    }
}

public struct JournalSyncRemoteNote: Codable, Sendable, Equatable {
    public let note: String
    public let revision: Int

    public init(note: String, revision: Int) {
        self.note = note
        self.revision = revision
    }
}

public struct JournalSyncCheckpointEntry: Codable, Sendable, Equatable {
    public var revision: Int
    public var lastSyncedNote: String
    public var remoteConflict: JournalSyncRemoteNote?

    public init(
        revision: Int,
        lastSyncedNote: String,
        remoteConflict: JournalSyncRemoteNote? = nil
    ) {
        self.revision = revision
        self.lastSyncedNote = lastSyncedNote
        self.remoteConflict = remoteConflict
    }
}

public struct JournalSyncCheckpoint: Codable, Sendable {
    public var entries: [String: JournalSyncCheckpointEntry]

    public init(entries: [String: JournalSyncCheckpointEntry] = [:]) {
        self.entries = entries
    }
}

public struct JournalSyncRemoteEntry: Codable, Sendable {
    public let entry: JournalEntry
    public let noteRevision: Int

    public init(entry: JournalEntry, noteRevision: Int) {
        self.entry = entry
        self.noteRevision = noteRevision
    }
}

public struct JournalSyncNoteWrite: Sendable, Equatable {
    public let puzzleID: String
    public let note: String
    public let expectedRevision: Int

    public init(puzzleID: String, note: String, expectedRevision: Int) {
        self.puzzleID = puzzleID
        self.note = note
        self.expectedRevision = expectedRevision
    }
}

public struct JournalSyncConflict: Sendable, Equatable, Identifiable {
    public let puzzleID: String
    public let localNote: String
    public let accountNote: String
    public let accountRevision: Int

    public var id: String { puzzleID }

    public init(puzzleID: String, localNote: String, accountNote: String, accountRevision: Int) {
        self.puzzleID = puzzleID
        self.localNote = localNote
        self.accountNote = accountNote
        self.accountRevision = accountRevision
    }
}

public struct JournalSyncReconciliation: Sendable {
    public let journal: Journal
    public let checkpoint: JournalSyncCheckpoint
    public let pendingWrites: [JournalSyncNoteWrite]
    public let conflicts: [JournalSyncConflict]

    public init(
        journal: Journal,
        checkpoint: JournalSyncCheckpoint,
        pendingWrites: [JournalSyncNoteWrite],
        conflicts: [JournalSyncConflict]
    ) {
        self.journal = journal
        self.checkpoint = checkpoint
        self.pendingWrites = pendingWrites
        self.conflicts = conflicts
    }
}

public enum JournalSyncConflictChoice: Sendable {
    case account
    case device
    case combine
}

public enum JournalSyncReconciler {
    public static func reconcile(
        local: Journal,
        checkpoint: JournalSyncCheckpoint,
        remote: [JournalSyncRemoteEntry]
    ) -> JournalSyncReconciliation {
        var journal = local
        var nextCheckpoint = checkpoint
        var pendingWrites: [JournalSyncNoteWrite] = []
        var conflicts: [JournalSyncConflict] = []
        var seenPuzzleIDs = Set<String>()

        for remoteEntry in remote where seenPuzzleIDs.insert(remoteEntry.entry.puzzleID).inserted {
            let puzzleID = remoteEntry.entry.puzzleID
            let remoteNote = remoteEntry.entry.note
            let remoteRevision = remoteEntry.noteRevision
            let localIndex = journal.entries.firstIndex { $0.puzzleID == puzzleID }
            if localIndex == nil {
                journal.record(remoteEntry.entry)
            }
            let resolvedIndex = journal.entries.firstIndex { $0.puzzleID == puzzleID }!
            let localNote = journal.entries[resolvedIndex].note
            let remoteSnapshot = JournalSyncRemoteNote(note: remoteNote, revision: remoteRevision)

            guard let previous = nextCheckpoint.entries[puzzleID] else {
                if localNote == remoteNote {
                    nextCheckpoint.entries[puzzleID] = syncedEntry(remoteSnapshot)
                } else if remoteRevision == 0 {
                    nextCheckpoint.entries[puzzleID] = syncedEntry(remoteSnapshot)
                    pendingWrites.append(
                        JournalSyncNoteWrite(
                            puzzleID: puzzleID,
                            note: localNote,
                            expectedRevision: remoteRevision
                        )
                    )
                } else if localNote.isEmpty {
                    journal.entries[resolvedIndex].note = remoteNote
                    nextCheckpoint.entries[puzzleID] = syncedEntry(remoteSnapshot)
                } else {
                    nextCheckpoint.entries[puzzleID] = JournalSyncCheckpointEntry(
                        revision: remoteRevision,
                        lastSyncedNote: localNote,
                        remoteConflict: remoteSnapshot
                    )
                    conflicts.append(
                        JournalSyncConflict(
                            puzzleID: puzzleID,
                            localNote: localNote,
                            accountNote: remoteNote,
                            accountRevision: remoteRevision
                        )
                    )
                }
                continue
            }

            if previous.remoteConflict != nil {
                if localNote == remoteNote {
                    nextCheckpoint.entries[puzzleID] = syncedEntry(remoteSnapshot)
                } else {
                    nextCheckpoint.entries[puzzleID] = JournalSyncCheckpointEntry(
                        revision: remoteRevision,
                        lastSyncedNote: previous.lastSyncedNote,
                        remoteConflict: remoteSnapshot
                    )
                    conflicts.append(
                        JournalSyncConflict(
                            puzzleID: puzzleID,
                            localNote: localNote,
                            accountNote: remoteNote,
                            accountRevision: remoteRevision
                        )
                    )
                }
            } else if localNote == remoteNote {
                nextCheckpoint.entries[puzzleID] = syncedEntry(remoteSnapshot)
            } else if localNote == previous.lastSyncedNote {
                journal.entries[resolvedIndex].note = remoteNote
                nextCheckpoint.entries[puzzleID] = syncedEntry(remoteSnapshot)
            } else if remoteNote == previous.lastSyncedNote {
                nextCheckpoint.entries[puzzleID] = syncedEntry(remoteSnapshot)
                pendingWrites.append(
                    JournalSyncNoteWrite(
                        puzzleID: puzzleID,
                        note: localNote,
                        expectedRevision: remoteRevision
                    )
                )
            } else {
                nextCheckpoint.entries[puzzleID] = JournalSyncCheckpointEntry(
                    revision: remoteRevision,
                    lastSyncedNote: previous.lastSyncedNote,
                    remoteConflict: remoteSnapshot
                )
                conflicts.append(
                    JournalSyncConflict(
                        puzzleID: puzzleID,
                        localNote: localNote,
                        accountNote: remoteNote,
                        accountRevision: remoteRevision
                    )
                )
            }
        }

        return JournalSyncReconciliation(
            journal: journal,
            checkpoint: nextCheckpoint,
            pendingWrites: pendingWrites,
            conflicts: conflicts
        )
    }

    @discardableResult
    public static func resolve(
        puzzleID: String,
        choice: JournalSyncConflictChoice,
        journal: inout Journal,
        checkpoint: inout JournalSyncCheckpoint
    ) -> JournalSyncNoteWrite? {
        guard let storedConflict = checkpoint.entries[puzzleID]?.remoteConflict,
              let localIndex = journal.entries.firstIndex(where: { $0.puzzleID == puzzleID }) else {
            return nil
        }

        let localNote = journal.entries[localIndex].note

        switch choice {
        case .account:
            checkpoint.entries[puzzleID] = syncedEntry(storedConflict)
            journal.entries[localIndex].note = storedConflict.note
            return nil
        case .device:
            checkpoint.entries[puzzleID] = syncedEntry(storedConflict)
            return JournalSyncNoteWrite(
                puzzleID: puzzleID,
                note: localNote,
                expectedRevision: storedConflict.revision
            )
        case .combine:
            let combinedNote = [localNote, storedConflict.note]
                .filter { !$0.isEmpty }
                .joined(separator: "\n\n")
            guard JournalNoteLimits.truncated(combinedNote) == combinedNote else { return nil }
            checkpoint.entries[puzzleID] = syncedEntry(storedConflict)
            journal.entries[localIndex].note = combinedNote
            return JournalSyncNoteWrite(
                puzzleID: puzzleID,
                note: combinedNote,
                expectedRevision: storedConflict.revision
            )
        }
    }

    public static func markSaved(
        _ write: JournalSyncNoteWrite,
        revision: Int,
        checkpoint: inout JournalSyncCheckpoint
    ) {
        checkpoint.entries[write.puzzleID] = JournalSyncCheckpointEntry(
            revision: revision,
            lastSyncedNote: write.note
        )
    }

    private static func syncedEntry(_ remote: JournalSyncRemoteNote) -> JournalSyncCheckpointEntry {
        JournalSyncCheckpointEntry(revision: remote.revision, lastSyncedNote: remote.note)
    }
}
