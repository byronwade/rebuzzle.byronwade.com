import SwiftUI
import RebuzzleCore

struct JournalView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Eyebrow(text: "A collection of connections")
                Text("Your curious mind,\none day at a time.").font(Theme.font(30, weight: .medium, relativeTo: .largeTitle)).tracking(-0.7)
                Text("Keep the moments when it clicked.").font(Theme.font(15)).foregroundStyle(Theme.secondary)
            }
            if !model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 20) {
                    Image(systemName: "book.closed").font(.system(size: 42, weight: .light)).foregroundStyle(Theme.secondary)
                    Text("A home for your discoveries.").font(Theme.font(22, weight: .medium))
                    Text("Plus keeps your completed puzzles together, with personal notes and insights into how you solve.").font(Theme.font(16)).foregroundStyle(Theme.secondary)
                    NavigationLink { PlusView() } label: { Text("Explore Rebuzzle Plus") }.buttonStyle(CommitStyle())
                    Text("Your completed results are saved locally now, ready when you unlock Plus.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                }.padding(24).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
            } else if model.journal.entries.isEmpty {
                ContentUnavailableView("Your first page is waiting", systemImage: "book", description: Text("Complete today’s puzzle to start your journal."))
            } else {
                ForEach(model.journal.entries) { entry in
                    NavigationLink(value: entry) {
                        HStack(alignment: .top, spacing: 16) {
                            Text(String(entry.puzzleDate.suffix(2))).font(Theme.font(26, weight: .medium)).foregroundStyle(Theme.secondary).frame(width: 40)
                            VStack(alignment: .leading, spacing: 6) {
                                Text(entry.answer).font(Theme.font(18, weight: .medium))
                                Text("\(entry.puzzleDate) · \(entry.won ? "Solved" : "Revealed") · \(entry.attempts) guesses").font(Theme.font(12)).foregroundStyle(Theme.secondary)
                                if !entry.note.isEmpty { Text(entry.note).font(Theme.font(14)).foregroundStyle(Theme.secondary).lineLimit(2) }
                            }
                            Spacer(); Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.secondary)
                        }.foregroundStyle(Theme.ink).padding(.vertical, 12)
                    }
                }
            }
            if !model.journal.entries.isEmpty {
                ShareLink(item: model.journal.exportText) { Label("Export your journal", systemImage: "square.and.arrow.up") }.font(Theme.font(14)).frame(minHeight: 44)
            }
            Notice(message: "Saved on this device for this Rebuzzle account. Export a copy before changing devices. Restoring Plus restores the purchase, not journal data.")
            if let error = model.storageError { Notice(message: error) }
        }.navigationTitle("Journal").navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: JournalEntry.self) { entry in JournalDetail(entry: entry, accountID: model.player?.id) }
    }
}
struct JournalDetail: View {
    @Environment(AppModel.self) private var model
    let entry: JournalEntry
    let accountID: String?
    @State private var note = ""
    var body: some View {
        Page {
            Eyebrow(text: entry.puzzleDate)
            PuzzleBoard(clue: entry.clue, visual: entry.visual).padding(20).background(Theme.panel, in: RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 12) { Text(entry.answer).font(Theme.font(28, weight: .medium)); Text(entry.explanation).font(Theme.font(16)).foregroundStyle(Theme.secondary) }
            VStack(alignment: .leading, spacing: 12) {
                Text("What made it click?").font(Theme.font(17, weight: .medium))
                TextField("A thought to keep…", text: $note, axis: .vertical).lineLimit(4...12).modifier(FieldStyle()).disabled(!model.purchases.hasPlus)
                Text(model.purchases.hasPlus ? "Notes save as you write." : "Your notes remain available. Plus is required to edit.").font(Theme.font(12)).foregroundStyle(Theme.secondary)
            }
            if let error = model.storageError { Notice(message: error) }
        }.navigationTitle("A connection kept").navigationBarTitleDisplayMode(.inline)
            .onAppear { note = model.journal.entries.first(where: { $0.id == entry.id })?.note ?? entry.note }
            .onChange(of: note) { _, value in
                guard model.player?.id == accountID, model.purchases.hasPlus, let index = model.journal.entries.firstIndex(where: { $0.id == entry.id }) else { return }
                model.journal.entries[index].note = String(value.prefix(10_000)); model.saveJournal()
            }
    }
}
