import SwiftUI
import RebuzzleCore

struct JournalView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Text("Keep the moments when it clicked.")
                    .font(Theme.font(24, weight: .medium, relativeTo: .title2)).tracking(-0.5)
                if model.purchases.hasPlus && !model.journal.entries.isEmpty {
                    Text("\(model.journal.entries.count) connections in your journal")
                        .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                }
            }
            if model.purchases.hasPlus {
                journalSyncNotice
            }
            if !model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 16) {
                    Image(systemName: "book.closed").font(.system(size: 32, weight: .light)).foregroundStyle(Theme.secondary)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your discoveries belong here.").font(Theme.font(20, weight: .medium))
                        Text("Study completed puzzles again, reveal the answer when you’re ready, and keep a note. Unlock your journal with Plus.")
                            .font(Theme.font(15)).foregroundStyle(Theme.secondary)
                    }
                    NavigationLink(value: RebuzzleRoute.plus(source: .journal)) {
                        Text("Explore Rebuzzle Plus").padding(.horizontal, 16).padding(.vertical, 8)
                    }.buttonStyle(CommitStyle())
                    Text("Completed results are already saved locally, ready when you unlock Plus.")
                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                }
            } else if model.journal.entries.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Image(systemName: "book").font(.system(size: 32, weight: .light)).foregroundStyle(Theme.secondary)
                    Text("Your first page is waiting").font(Theme.font(20, weight: .medium))
                    Text("Complete today’s puzzle to start your journal. Every connection has a place here, solved or revealed.")
                        .font(Theme.font(15)).foregroundStyle(Theme.secondary)
                }.padding(.vertical, 16)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(model.journal.entries) { entry in
                        NavigationLink(value: RebuzzleRoute.journalEntry(entryID: entry.id, accountID: model.player?.id)) {
                            HStack(alignment: .top, spacing: 12) {
                                VStack(alignment: .leading, spacing: 8) {
                                    let puzzleType = entry.puzzleType
                                        .replacingOccurrences(of: "-", with: " ")
                                        .replacingOccurrences(of: "_", with: " ")
                                        .capitalized
                                    Text("\(entry.puzzleDate) · \(puzzleType)")
                                        .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                                    Text(entry.won ? "Solved" : "Solution revealed").font(Theme.font(18, weight: .medium))
                                    Text("\(entry.attempts) \(entry.attempts == 1 ? "guess" : "guesses") · Study again")
                                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                                }.frame(maxWidth: .infinity, alignment: .leading)
                                Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.secondary).padding(.top, 4)
                            }.foregroundStyle(Theme.ink).padding(.vertical, 16).contentShape(Rectangle())
                        }.buttonStyle(.plain).accessibilityIdentifier("journalEntry")
                    }
                }
            }
            if !model.journal.entries.isEmpty {
                ShareLink(item: model.journal.exportText) { Label("Export your journal", systemImage: "square.and.arrow.up") }.font(Theme.font(14)).frame(minHeight: 44)
            }
            ForEach(model.journalSyncConflicts) { conflict in
                conflictCard(conflict)
            }
            if let error = model.storageError { Notice(message: error) }
        }
        .navigationTitle("Journal")
        .navigationBarTitleDisplayMode(.inline)
        #if DEBUG
        .toolbar {
            if ProcessInfo.processInfo.arguments.contains("--ui-fixture") {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button("Simulate share return", systemImage: "link") {
                        if let url = URL(string: DailyShareSummary.shareURL) {
                            ReturnRouter.shared.open(url)
                        }
                    }
                    .accessibilityIdentifier("uiSimulateShareLink")
                    Button("Simulate identity change", systemImage: "person.crop.circle.badge.xmark") {
                        Task { await model.signOut() }
                    }
                    .accessibilityIdentifier("uiSimulateIdentityChange")
                }
            }
        }
        #endif
    }

    private var journalSyncNotice: some View {
        let message: String
        let symbol: String
        switch model.journalSyncStatus {
        case .onDevice:
            message = model.player?.guest == false
                ? "Your notes are on this device. They sync when Plus access is available."
                : "Your notes are saved on this device. Sign in with Plus to sync them across devices."
            symbol = "iphone"
        case .syncing:
            message = "Syncing your journal with your Rebuzzle account…"
            symbol = "arrow.triangle.2.circlepath"
        case .synced:
            message = "Your journal is synced with this Rebuzzle account. Offline edits will sync when you reconnect."
            symbol = "checkmark.icloud"
        case .offline:
            message = "Your notes are safe on this device. Tap Retry sync when you’re connected."
            symbol = "icloud.slash"
        case .historyArriving:
            message = "Your notes are safe. Older puzzle history is still arriving."
            symbol = "clock.arrow.circlepath"
        case .conflict:
            message = "A note changed on another device. Choose which version to keep or combine them."
            symbol = "arrow.left.arrow.right"
        }
        return VStack(alignment: .leading, spacing: 8) {
            Label(message, systemImage: symbol)
                .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
            if model.journalSyncStatus == .offline {
                Button("Retry sync", systemImage: "arrow.clockwise") {
                    Task { await model.syncJournal() }
                }
                .frame(minHeight: 44)
                .buttonStyle(.bordered)
                .accessibilityIdentifier("retryJournalSync")
            }
        }
        .padding(14).background(Theme.panel, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityIdentifier("journalSyncStatus")
    }

    private func conflictCard(_ conflict: JournalSyncConflict) -> some View {
        let combinedNote = [conflict.localNote, conflict.accountNote]
            .filter { !$0.isEmpty }
            .joined(separator: "\n\n")
        let canCombine = JournalNoteLimits.truncated(combinedNote) == combinedNote
        return VStack(alignment: .leading, spacing: 12) {
            Text("This note changed on another device")
                .font(Theme.font(16, weight: .medium))
            VStack(alignment: .leading, spacing: 10) {
                conflictVersion(title: "THIS DEVICE", note: conflict.localNote)
                conflictVersion(title: "YOUR ACCOUNT", note: conflict.accountNote)
            }
            Button("Keep this device") {
                model.resolveJournalConflict(puzzleID: conflict.puzzleID, choice: .device)
            }.frame(maxWidth: .infinity, minHeight: 44).buttonStyle(.bordered).tint(Theme.ink)
            Button("Use account version") {
                model.resolveJournalConflict(puzzleID: conflict.puzzleID, choice: .account)
            }.frame(maxWidth: .infinity, minHeight: 44).buttonStyle(.bordered).tint(Theme.ink)
            Button("Combine both notes") {
                model.resolveJournalConflict(puzzleID: conflict.puzzleID, choice: .combine)
            }.frame(maxWidth: .infinity, minHeight: 44).buttonStyle(CommitStyle()).disabled(!canCombine)
            if !canCombine {
                Text("Together these notes are too long to combine. Edit this device’s note in Study puzzle, then keep this device.")
                    .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16).frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
        .accessibilityIdentifier("journalConflict.\(conflict.puzzleID)")
    }

    private func conflictVersion(title: String, note: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Eyebrow(text: title)
            Text(note.isEmpty ? "No note" : note)
                .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                .lineLimit(4).frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
struct JournalDetail: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let entry: JournalEntry
    let accountID: String?
    @State private var note = ""
    @State private var revealedHintCount = 0
    @State private var answerRevealed = false
    private var studyHints: [String] {
        entry.hints.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }
    var body: some View {
        Page {
            Eyebrow(text: entry.puzzleDate)
            PuzzleBoard(clue: entry.clue, visual: entry.visual).padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 8) {
                Label("Unscored study", systemImage: "book.closed")
                    .font(Theme.font(14, weight: .medium)).foregroundStyle(Theme.reward)
                Text("Take another look at the clue. This replay won’t change today’s result, streak, or rewards.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
            }
            VStack(alignment: .leading, spacing: 12) {
                Text("Your hints").font(Theme.font(17, weight: .medium))
                if studyHints.isEmpty {
                    Text("Original hints weren’t saved for this puzzle. You can still reveal the answer and explanation.")
                        .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("journalStudyNoHints")
                } else {
                    if revealedHintCount == 0 {
                        Text("Give the clue a fresh read before revealing a hint.")
                            .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
                    }
                    ForEach(Array(studyHints.prefix(revealedHintCount).enumerated()), id: \.offset) { index, hint in
                        HStack(alignment: .top, spacing: 12) {
                            Text("\(index + 1)").font(Theme.font(14, weight: .semibold)).foregroundStyle(Theme.reward)
                                .frame(width: 28, height: 28).background(Theme.reward.opacity(0.12), in: Circle())
                            Text(hint).font(Theme.font(15)).fixedSize(horizontal: false, vertical: true)
                                .accessibilityIdentifier("journalStudyHint.\(index + 1)")
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }.padding(14).background(Theme.panel, in: RoundedRectangle(cornerRadius: 12))
                    }
                    if revealedHintCount < studyHints.count {
                        Button {
                            revealNextHint()
                        } label: {
                            Label("Reveal hint \(revealedHintCount + 1)", systemImage: "lightbulb")
                                .frame(maxWidth: .infinity, minHeight: 52)
                                .foregroundStyle(Theme.ink)
                                .background(Theme.field, in: RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Theme.secondary.opacity(0.24), lineWidth: 1))
                        }.buttonStyle(.plain).accessibilityIdentifier("revealJournalHint")
                    }
                }
            }
            if answerRevealed {
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: "THE ANSWER")
                    Text(entry.answer).font(Theme.font(28, weight: .medium, relativeTo: .title2))
                        .accessibilityIdentifier("journalStudyAnswer")
                    Text(entry.explanation).font(Theme.font(16)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("journalStudyExplanation")
                }.frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 12) {
                    Text("What made it click?").font(Theme.font(17, weight: .medium))
                    TextField(
                        "A thought to keep…",
                        text: Binding(get: { note }, set: { note = JournalNoteLimits.truncated($0) }),
                        axis: .vertical
                    ).lineLimit(4...12).modifier(FieldStyle())
                        .disabled(!model.purchases.hasPlus)
                    Text(model.player?.guest == false && model.purchases.hasPlus
                         ? "Saved on this device and synced to your Rebuzzle account when you’re online."
                         : "Saved on this device and ready to sync when you sign in with Plus.")
                        .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                }
            } else {
                Button { revealAnswer() } label: {
                    Label("Reveal answer and explanation", systemImage: "eye")
                        .padding(.horizontal, 16).padding(.vertical, 8)
                }.buttonStyle(CommitStyle()).accessibilityIdentifier("revealJournalAnswer")
            }
            if let error = model.storageError { Notice(message: error) }
        }.navigationTitle("Study puzzle").navigationBarTitleDisplayMode(.inline)
            .onAppear { note = storedNote ?? entry.note }
            // Every keystroke is written straight to the journal, so a stored note that
            // differs from the editor can only come from sync. Adopt it rather than
            // letting the next keystroke write stale text over the newer revision.
            .onChange(of: storedNote) { _, stored in
                guard let stored, stored != note else { return }
                note = stored
            }
            .onChange(of: note) { _, value in
                guard answerRevealed, model.player?.id == accountID, model.purchases.hasPlus,
                      let index = model.journal.entries.firstIndex(where: { $0.id == entry.id }) else { return }
                let truncated = JournalNoteLimits.truncated(value)
                guard model.journal.entries[index].note != truncated else { return }
                model.journal.entries[index].note = truncated; model.saveJournal()
            }
    }

    private var storedNote: String? {
        model.journal.entries.first(where: { $0.id == entry.id })?.note
    }

    private func revealNextHint() {
        guard revealedHintCount < studyHints.count else { return }
        if reduceMotion {
            revealedHintCount += 1
        } else {
            withAnimation(.easeInOut(duration: 0.2)) { revealedHintCount += 1 }
        }
    }

    private func revealAnswer() {
        if reduceMotion {
            answerRevealed = true
        } else {
            withAnimation(.easeInOut(duration: 0.2)) { answerRevealed = true }
        }
    }
}
