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
                        Text("Study completed puzzles again, reveal the answer when you’re ready, and keep a note. Unlock your journal with Plus.")
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
                        NavigationLink { JournalDetail(entry: entry, accountID: model.player?.id) } label: {
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
            Notice(message: "Saved on this device for this Rebuzzle account. Export a copy before changing devices. Restoring Plus restores the purchase, not journal data.")
            if let error = model.storageError { Notice(message: error) }
        }.navigationTitle("Journal").navigationBarTitleDisplayMode(.inline)
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
                    TextField("A thought to keep…", text: $note, axis: .vertical).lineLimit(4...12).modifier(FieldStyle())
                        .disabled(!model.purchases.hasPlus)
                    Text("Your note stays on this device and saves as you write.")
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
            .onAppear { note = model.journal.entries.first(where: { $0.id == entry.id })?.note ?? entry.note }
            .onChange(of: note) { _, value in
                guard answerRevealed, model.player?.id == accountID, model.purchases.hasPlus,
                      let index = model.journal.entries.firstIndex(where: { $0.id == entry.id }) else { return }
                model.journal.entries[index].note = String(value.prefix(10_000)); model.saveJournal()
            }
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
