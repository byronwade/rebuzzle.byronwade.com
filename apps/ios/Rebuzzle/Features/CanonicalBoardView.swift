import SwiftUI
import RebuzzleCore

/// The canonical image already contains the reviewed composition and semantic colors.
/// Never recolor, crop, or reconstruct its individual clues.
struct CanonicalBoardView: View {
    private let image: UIImage?
    let clue: String

    init(board: CanonicalBoard, clue: String) {
        self.clue = clue
        if let data = board.pngData, let decoded = UIImage(data: data),
           let pixels = decoded.cgImage,
           pixels.width == board.width, pixels.height == board.height {
            image = decoded
        } else { image = nil }
    }
    var body: some View {
        if let image {
            Image(uiImage: image)
                .renderingMode(.original)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .accessibilityLabel("Puzzle: \(clue)")
                .accessibilityIdentifier("canonicalPuzzleBoard")
        } else {
            ContentUnavailableView("Puzzle image unavailable", systemImage: "photo.badge.exclamationmark",
                                   description: Text("Pull down to refresh the puzzle. Your progress is safe."))
                .accessibilityIdentifier("canonicalPuzzleUnavailable")
        }
    }
}
