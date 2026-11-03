import Foundation

/// A point relative to the visible bounds of a reviewed puzzle raster.
public struct CanonicalBoardPinPoint: Codable, Equatable, Sendable {
    private enum CodingKeys: String, CodingKey { case x, y }

    public let x: Double
    public let y: Double

    public init?(x: Double, y: Double) {
        guard x.isFinite, y.isFinite, (0...1).contains(x), (0...1).contains(y) else { return nil }
        self.x = x
        self.y = y
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let x = try container.decode(Double.self, forKey: .x)
        let y = try container.decode(Double.self, forKey: .y)
        guard let point = Self(x: x, y: y) else {
            throw DecodingError.dataCorruptedError(
                forKey: .x,
                in: container,
                debugDescription: "A board pin point must be finite and within the rendered image."
            )
        }
        self = point
    }
}

/// The image rectangle produced by SwiftUI's aspect-fit rendering.
public struct CanonicalBoardPinRect: Equatable, Sendable {
    public let minX: Double
    public let minY: Double
    public let width: Double
    public let height: Double

    public func contains(x: Double, y: Double) -> Bool {
        x.isFinite && y.isFinite
            && x >= minX && x <= minX + width
            && y >= minY && y <= minY + height
    }
}

/// Maps touch locations to the actual aspect-fit image, excluding any letterboxing.
public enum CanonicalBoardPinGeometry {
    public static func aspectFitRect(
        containerWidth: Double,
        containerHeight: Double,
        imageWidth: Double,
        imageHeight: Double
    ) -> CanonicalBoardPinRect? {
        guard containerWidth.isFinite, containerHeight.isFinite,
              imageWidth.isFinite, imageHeight.isFinite,
              containerWidth > 0, containerHeight > 0,
              imageWidth > 0, imageHeight > 0
        else { return nil }

        let scale = min(containerWidth / imageWidth, containerHeight / imageHeight)
        let width = imageWidth * scale
        let height = imageHeight * scale
        guard width.isFinite, height.isFinite, width > 0, height > 0 else { return nil }
        return CanonicalBoardPinRect(
            minX: (containerWidth - width) / 2,
            minY: (containerHeight - height) / 2,
            width: width,
            height: height
        )
    }

    public static func normalizedPoint(
        tapX: Double,
        tapY: Double,
        containerWidth: Double,
        containerHeight: Double,
        imageWidth: Double,
        imageHeight: Double
    ) -> CanonicalBoardPinPoint? {
        guard let rect = aspectFitRect(
            containerWidth: containerWidth,
            containerHeight: containerHeight,
            imageWidth: imageWidth,
            imageHeight: imageHeight
        ), rect.contains(x: tapX, y: tapY) else { return nil }

        let x = (tapX - rect.minX) / rect.width
        let y = (tapY - rect.minY) / rect.height
        return CanonicalBoardPinPoint(x: min(1, max(0, x)), y: min(1, max(0, y)))
    }
}
