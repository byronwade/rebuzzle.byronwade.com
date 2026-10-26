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
                    Text("\(model.journal.entries.count) connections kept on this device")
                        .font(Theme.font(14)).foregroundStyle(Theme.secondary)
                }
            }
            if !model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 16) {
                    Image(systemName: "book.closed").font(.system(size: 32, weight: .light)).foregroundStyle(Theme.secondary)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your discoveries belong here.").font(Theme.font(20, weight: .medium))
                        Text("Revisit completed puzzles and keep a note about the connection. Unlock your journal with Plus.")
                            .font(Theme.font(15)).foregroundStyle(Theme.secondary)
                    }
                    NavigationLink { PlusView() } label: {
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
                        NavigationLink(value: entry) {
                            HStack(alignment: .top, spacing: 12) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(entry.puzzleDate).font(Theme.font(12)).foregroundStyle(Theme.secondary)
                                    Text(entry.answer).font(Theme.font(18, weight: .medium))
                                    Text("\(entry.won ? "Solved" : "Revealed") · \(entry.attempts) \(entry.attempts == 1 ? "guess" : "guesses")")
                                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                                    if !entry.note.isEmpty {
                                        Text(entry.note).font(Theme.font(14)).foregroundStyle(Theme.secondary).lineLimit(2)
                                    }
                                }.frame(maxWidth: .infinity, alignment: .leading)
                                Image(systemName: "chevron.right").font(.caption).foregroundStyle(Theme.secondary).padding(.top, 4)
                            }.foregroundStyle(Theme.ink).padding(.vertical, 16).contentShape(Rectangle())
                        }.buttonStyle(.plain)
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
