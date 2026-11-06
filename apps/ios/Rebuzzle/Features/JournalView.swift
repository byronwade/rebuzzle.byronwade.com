import SwiftUI
import RebuzzleCore

struct JournalView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        Page {
            VStack(alignment: .leading, spacing: 8) {
                Text("Keep the moments when it clicked.")
                    .font(Theme.display(28, relativeTo: .title)).tracking(-0.4)
                    .fixedSize(horizontal: false, vertical: true)
                if model.purchases.hasPlus && !model.journal.entries.isEmpty {
                    Pill(text: "\(model.journal.entries.count) connections kept on this device", systemImage: "book.closed.fill", tint: Theme.reward)
                }
            }
            if !model.purchases.hasPlus {
                VStack(alignment: .leading, spacing: 16) {
                    IconTile(systemImage: "book.closed.fill", face: Theme.gold, ledge: Theme.goldLedge, symbol: Theme.onGold, size: 50)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your discoveries belong here.").font(Theme.display(22, relativeTo: .title2))
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Study completed puzzles again, reveal the answer when you’re ready, and keep a note. Unlock your journal with Plus.")
                            .font(Theme.font(15)).foregroundStyle(Theme.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    NavigationLink { PlusView() } label: {
                        Text("Explore Rebuzzle Plus")
                    }.buttonStyle(ChunkyButtonStyle(variant: .reward))
                    Text("Completed results are already saved locally, ready when you unlock Plus.")
                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .gameCard(padding: 20)
            } else if model.journal.entries.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    IconTile(systemImage: "book.fill", face: Theme.accentFill, ledge: Theme.accentLedge, size: 50)
                    Text("Your first page is waiting").font(Theme.display(22, relativeTo: .title2))
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Complete today’s puzzle to start your journal. Every connection has a place here, solved or revealed.")
                        .font(Theme.font(15)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .gameCard(padding: 20)
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(model.journal.entries) { entry in
                        NavigationLink { JournalDetail(entry: entry, accountID: model.player?.id) } label: {
                            HStack(alignment: .center, spacing: 13) {
                                if entry.won {
                                    IconTile(systemImage: "checkmark", face: Theme.successFill, ledge: Theme.successLedge, size: 44)
                                } else {
                                    IconTile(systemImage: "eye.fill", face: Theme.eveFill, ledge: Theme.eveLedge, size: 44)
                                }
                                VStack(alignment: .leading, spacing: 6) {
                                    let puzzleType = entry.puzzleType
                                        .replacingOccurrences(of: "-", with: " ")
                                        .replacingOccurrences(of: "_", with: " ")
                                        .capitalized
                                    Text("\(entry.puzzleDate) · \(puzzleType)")
                                        .font(Theme.font(12, weight: .semibold)).foregroundStyle(Theme.secondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                    Text(entry.won ? "Solved" : "Solution revealed").font(Theme.font(17, weight: .heavy))
                                    Text("\(entry.attempts) \(entry.attempts == 1 ? "guess" : "guesses") · Study again")
                                        .font(Theme.font(13)).foregroundStyle(Theme.secondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }.frame(maxWidth: .infinity, alignment: .leading)
                                Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold)).foregroundStyle(Theme.secondary)
                                    .accessibilityHidden(true)
                            }
                            .foregroundStyle(Theme.ink)
                            .gameCard(padding: 14)
                            .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
                        }.buttonStyle(.plain).accessibilityIdentifier("journalEntry")
                    }
                }
            }
            if !model.journal.entries.isEmpty {
                ShareLink(item: model.journal.exportText) { Label("Export your journal", systemImage: "square.and.arrow.up") }
                    .buttonStyle(ChunkyButtonStyle(variant: .secondary))
            }
            Notice(message: "Saved on this device for this Rebuzzle account. Export a copy before changing devices. Restoring Plus restores the purchase, not journal data.")
            if let error = model.storageError { Notice(message: error) }
        }
        .navigationTitle("Journal")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
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
            PuzzleBoard(clue: entry.clue, visual: entry.visual).gameCard(padding: 20)
            VStack(alignment: .leading, spacing: 8) {
                Pill(text: "Unscored study", systemImage: "book.closed.fill", tint: Theme.reward)
                Text("Take another look at the clue. This replay won’t change today’s result, streak, or rewards.")
                    .font(Theme.font(14)).foregroundStyle(Theme.secondary).fixedSize(horizontal: false, vertical: true)
            }
            VStack(alignment: .leading, spacing: 12) {
                Text("Your hints").font(Theme.display(20, relativeTo: .title3))
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
                            Text("\(index + 1)").font(Theme.font(14, weight: .heavy)).foregroundStyle(.white)
                                .frame(width: 30, height: 30).background(Circle().fill(Theme.eveFill))
                                .background(Circle().fill(Theme.eveLedge).offset(y: 2))
                            Text(hint).font(Theme.font(15, weight: .medium)).fixedSize(horizontal: false, vertical: true)
                                .accessibilityIdentifier("journalStudyHint.\(index + 1)")
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }.gameCard(padding: 14)
                    }
                    if revealedHintCount < studyHints.count {
                        Button {
                            revealNextHint()
                        } label: {
                            Label("Reveal hint \(revealedHintCount + 1)", systemImage: "lightbulb.fill")
                        }.buttonStyle(ChunkyButtonStyle(variant: .eve)).accessibilityIdentifier("revealJournalHint")
                    }
                }
            }
            if answerRevealed {
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: "THE ANSWER")
                    Text(entry.answer).font(Theme.display(30, relativeTo: .title))
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("journalStudyAnswer")
                    Text(entry.explanation).font(Theme.font(16)).foregroundStyle(Theme.secondary)
                        .fixedSize(horizontal: false, vertical: true).accessibilityIdentifier("journalStudyExplanation")
                }.gameCard(padding: 20)
                VStack(alignment: .leading, spacing: 12) {
                    Text("What made it click?").font(Theme.display(20, relativeTo: .title3))
                    TextField("A thought to keep…", text: $note, axis: .vertical).lineLimit(4...12).modifier(FieldStyle())
                        .disabled(!model.purchases.hasPlus)
                    Text("Your note stays on this device and saves as you write.")
                        .font(Theme.font(12)).foregroundStyle(Theme.secondary)
                }
            } else {
                Button { revealAnswer() } label: {
                    Label("Reveal answer and explanation", systemImage: "eye.fill")
                }.buttonStyle(ChunkyButtonStyle(variant: .primary)).accessibilityIdentifier("revealJournalAnswer")
            }
            if let error = model.storageError { Notice(message: error) }
        }
        .navigationTitle("Study puzzle")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.visible, for: .navigationBar)
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
