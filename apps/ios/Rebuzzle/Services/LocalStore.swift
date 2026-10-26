import Foundation
import CryptoKit
import RebuzzleCore

@MainActor final class LocalStore {
    let root: URL
    init(root: URL? = nil) {
        self.root = root ?? URL.applicationSupportDirectory.appendingPathComponent("Rebuzzle", isDirectory: true)
    }
    private func digest(_ text: String) -> String { SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined() }
    private func url(_ key: String) -> URL {
        let parts = key.split(separator: ":", maxSplits: 2).map(String.init)
        let directory = parts.count > 1 ? root.appendingPathComponent("account-" + digest(parts[1]), isDirectory: true) : root
        return directory.appendingPathComponent(digest(key)).appendingPathExtension("json")
    }
    func removeAccount(_ id: String) throws {
        let directory = root.appendingPathComponent("account-" + digest(id), isDirectory: true)
        if FileManager.default.fileExists(atPath: directory.path) { try FileManager.default.removeItem(at: directory) }
    }
    func save<T: Encodable>(_ value: T, key: String) throws {
        try FileManager.default.createDirectory(at: url(key).deletingLastPathComponent(), withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(value)
        try data.write(to: url(key), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    func load<T: Decodable>(_ type: T.Type, key: String) throws -> T? {
        let location = url(key)
        guard FileManager.default.fileExists(atPath: location.path) else { return nil }
        return try JSONDecoder().decode(type, from: Data(contentsOf: location))
    }
    func saveDraft(_ draft: String, account: String, puzzle: String) throws { try save(draft, key: "draft:\(account):\(puzzle)") }
    func draft(account: String, puzzle: String) -> String { (try? load(String.self, key: "draft:\(account):\(puzzle)")) ?? "" }
    func remove(key: String) throws {
        let location = url(key)
        if FileManager.default.fileExists(atPath: location.path) { try FileManager.default.removeItem(at: location) }
    }
}
