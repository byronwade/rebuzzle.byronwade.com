import Foundation
import CryptoKit

/// A present but invalid artifact is deliberately retained. Falling back to layers
/// would show different clue geometry from the image that passed review.
public struct CanonicalBoard: Codable, Sendable, Hashable {
    private struct Raster: Codable, Sendable, Hashable {
        let pngDataUrl: String
        let sha256: String
        let width: Int
        let height: Int
    }
    private struct Payload: Codable, Sendable, Hashable {
        let version: Int
        let pngDataUrl: String
        let sha256: String
        let width: Int
        let height: Int
        let sourceFingerprint: String
        /// Reviewed phone-sized compositions keyed by recognition profile id.
        var profileVariants: [String: Raster]?
    }
    /// One verified PNG composition of the board.
    public struct VerifiedRaster: Sendable, Hashable {
        public let profileID: String
        public let pngData: Data
        public let width: Int
        public let height: Int
    }
    private let payload: Payload?
    public let pngData: Data?
    /// The desktop raster first, then every phone variant that passed verification.
    public let rasters: [VerifiedRaster]
    public var width: Int? { payload?.width }
    public var height: Int? { payload?.height }

    public init(from decoder: Decoder) throws {
        let candidate = try? Payload(from: decoder)
        guard var decoded = candidate, decoded.version == 1, Self.isDigest(decoded.sourceFingerprint),
              let bytes = Self.verifiedPNG(decoded.pngDataUrl, sha256: decoded.sha256, width: decoded.width, height: decoded.height)
        else {
            payload = nil
            pngData = nil
            rasters = []
            return
        }
        var verified = [VerifiedRaster(profileID: "desktop-768", pngData: bytes, width: decoded.width, height: decoded.height)]
        var keptVariants: [String: Raster] = [:]
        // A bad variant is dropped on its own; the reviewed desktop raster still renders.
        for id in Self.phoneProfiles {
            guard let raster = decoded.profileVariants?[id],
                  let data = Self.verifiedPNG(raster.pngDataUrl, sha256: raster.sha256, width: raster.width, height: raster.height)
            else { continue }
            keptVariants[id] = raster
            verified.append(VerifiedRaster(profileID: id, pngData: data, width: raster.width, height: raster.height))
        }
        decoded.profileVariants = keptVariants.isEmpty ? nil : keptVariants
        payload = decoded
        pngData = bytes
        rasters = verified
    }
    public func encode(to encoder: Encoder) throws {
        if let payload { try payload.encode(to: encoder) }
        else { var container = encoder.singleValueContainer(); try container.encodeNil() }
    }

    private static let phoneProfiles = ["mobile-375", "compact-320", "mobile-375-medium"]

    /// Picks the reviewed composition for the width the board is drawn at, so phones
    /// show the mobile layout that passed recognition instead of a shrunken desktop one.
    /// Thresholds are board widths in points: today's phones draw it roughly 290–380 wide.
    public func raster(forBoardWidth width: Double) -> VerifiedRaster? {
        func variant(_ id: String) -> VerifiedRaster? { rasters.first { $0.profileID == id } }
        let desktop = rasters.first
        if width >= 560 { return desktop }
        if width > 0, width < 260 { return variant("compact-320") ?? variant("mobile-375") ?? desktop }
        return variant("mobile-375") ?? desktop
    }

    private static func verifiedPNG(_ dataUrl: String, sha256: String, width: Int, height: Int) -> Data? {
        let prefix = "data:image/png;base64,"
        let maximumBytes = 1_048_576
        guard (1...2048).contains(width), (1...2048).contains(height),
              Self.isDigest(sha256),
              dataUrl.hasPrefix(prefix),
              dataUrl.utf8.count <= prefix.utf8.count + ((maximumBytes + 2) / 3) * 4,
              let bytes = Data(base64Encoded: String(dataUrl.dropFirst(prefix.count))),
              (33...maximumBytes).contains(bytes.count),
              bytes.prefix(8) == Data([137, 80, 78, 71, 13, 10, 26, 10]),
              Array(bytes[8..<16]) == [0, 0, 0, 13, 73, 72, 68, 82],
              uint32(bytes, offset: 16) == width,
              uint32(bytes, offset: 20) == height,
              SHA256.hash(data: bytes).map({ String(format: "%02x", $0) }).joined() == sha256
        else { return nil }
        return bytes
    }
    private static func uint32(_ data: Data, offset: Int) -> Int {
        data[offset..<(offset + 4)].reduce(0) { ($0 << 8) | Int($1) }
    }
    private static func isDigest(_ value: String) -> Bool {
        value.utf8.count == 64 && value.utf8.allSatisfy { (48...57).contains($0) || (97...102).contains($0) }
    }
}
