import Foundation
import CryptoKit

/// A present but invalid artifact is deliberately retained. Falling back to layers
/// would show different clue geometry from the image that passed review.
public struct CanonicalBoard: Codable, Sendable, Hashable {
    private struct Payload: Codable, Sendable, Hashable {
        let version: Int
        let pngDataUrl: String
        let sha256: String
        let width: Int
        let height: Int
        let sourceFingerprint: String
    }
    private let payload: Payload?
    public let pngData: Data?
    public var width: Int? { payload?.width }
    public var height: Int? { payload?.height }

    public init(from decoder: Decoder) throws {
        let decoded = try? Payload(from: decoder)
        if let decoded, let bytes = Self.verifiedData(decoded) {
            payload = decoded
            pngData = bytes
        } else {
            payload = nil
            pngData = nil
        }
    }
    public func encode(to encoder: Encoder) throws {
        if let payload { try payload.encode(to: encoder) }
        else { var container = encoder.singleValueContainer(); try container.encodeNil() }
    }
    private static func verifiedData(_ payload: Payload) -> Data? {
        let prefix = "data:image/png;base64,"
        let maximumBytes = 1_048_576
        guard payload.version == 1,
              (1...2048).contains(payload.width), (1...2048).contains(payload.height),
              isDigest(payload.sha256), isDigest(payload.sourceFingerprint),
              payload.pngDataUrl.hasPrefix(prefix),
              payload.pngDataUrl.utf8.count <= prefix.utf8.count + ((maximumBytes + 2) / 3) * 4,
              let bytes = Data(base64Encoded: String(payload.pngDataUrl.dropFirst(prefix.count))),
              (33...maximumBytes).contains(bytes.count),
              bytes.prefix(8) == Data([137, 80, 78, 71, 13, 10, 26, 10]),
              Array(bytes[8..<16]) == [0, 0, 0, 13, 73, 72, 68, 82],
              uint32(bytes, offset: 16) == payload.width,
              uint32(bytes, offset: 20) == payload.height,
              SHA256.hash(data: bytes).map({ String(format: "%02x", $0) }).joined() == payload.sha256
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
