import Foundation
import Security

struct CredentialStore {
    private let service: String
    private let memoryStore: InMemoryCredentialStorage?
    init(service: String = "com.byronwade.rebuzzle", inMemory: Bool = false) {
        self.service = service
        memoryStore = inMemory ? InMemoryCredentialStorage() : nil
    }
    func read(_ key: String) throws -> String? {
        if let memoryStore { return memoryStore.value(for: key) }
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw credentialError(status) }
        return String(data: data, encoding: .utf8)
    }
    func write(_ value: String?, key: String) throws {
        if let memoryStore {
            memoryStore.set(value, for: key)
            return
        }
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key]
        guard let value else {
            let status = SecItemDelete(query as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else { throw credentialError(status) }
            return
        }
        let attributes: [String: Any] = [kSecValueData as String: Data(value.utf8), kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            let added = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil)
            guard added == errSecSuccess else { throw credentialError(added) }
        } else if status != errSecSuccess { throw credentialError(status) }
    }
    private func credentialError(_ status: OSStatus) -> APIError { APIError(status: Int(status), message: "Your secure sign-in could not be saved. Please unlock your device and try again.") }
}

private final class InMemoryCredentialStorage {
    private let lock = NSLock()
    private var values: [String: String] = [:]

    func value(for key: String) -> String? {
        lock.lock()
        defer { lock.unlock() }
        return values[key]
    }

    func set(_ value: String?, for key: String) {
        lock.lock()
        defer { lock.unlock() }
        values[key] = value
    }
}
