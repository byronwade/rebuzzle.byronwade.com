import SwiftUI
import UIKit
import RebuzzleCore

struct PuzzleBoard: View {
    let clue: String
    let visual: PuzzleVisual?
    init(puzzle: Puzzle) { self.clue = puzzle.clue; self.visual = puzzle.visual }
    init(clue: String, visual: PuzzleVisual?) { self.clue = clue; self.visual = visual }
    var body: some View {
        Group {
            if let canonical = visual?.canonicalBoard {
                CanonicalBoardView(board: canonical, clue: clue)
            } else {
                Group {
                    if let visual, visual.mode != "unicode", let layers = visual.layers, !layers.isEmpty {
                        VisualBoard(visual: visual, layers: layers)
                    } else {
                        Text(clue).font(Theme.font(clue.count > 40 ? 26 : 44, weight: .medium, relativeTo: .largeTitle))
                            .multilineTextAlignment(.center).lineSpacing(12).textSelection(.enabled)
                            .frame(maxWidth: .infinity, minHeight: 190).padding(.vertical, 12)
                    }
                }.accessibilityLabel("Puzzle: \(clue)")
            }
        }
    }
}
