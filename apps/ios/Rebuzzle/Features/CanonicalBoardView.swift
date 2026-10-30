import SwiftUI
import RebuzzleCore

/// The canonical image already contains the reviewed composition and semantic colors.
/// Never recolor, crop, or reconstruct its individual clues.
struct CanonicalBoardView: View {
    private let board: CanonicalBoard
    /// Decoded once per verified raster; keyed by recognition profile id.
    private let images: [String: UIImage]
    let clue: String
    @State private var boardWidth: CGFloat = 0

    init(board: CanonicalBoard, clue: String) {
        self.board = board
        self.clue = clue
        var images: [String: UIImage] = [:]
        for raster in board.rasters {
            if let decoded = UIImage(data: raster.pngData), let pixels = decoded.cgImage,
               pixels.width == raster.width, pixels.height == raster.height {
                images[raster.profileID] = decoded
            }
        }
        self.images = images
    }

    /// The reviewed composition for this width, falling back to the desktop raster.
    private var image: UIImage? {
        if let selected = board.raster(forBoardWidth: Double(boardWidth)), let image = images[selected.profileID] {
            return image
        }
        return images["desktop-768"]
    }

    var body: some View {
        Group {
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
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { boardWidth = $0 }
    }
}
