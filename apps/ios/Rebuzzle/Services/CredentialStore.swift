import Foundation
import Security

struct CredentialStore {
    private let service: String
    init(service: String = "com.byronwade.rebuzzle") { self.service = service }
    func read(_ key: String) throws -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw credentialError(status) }
        return String(data: data, encoding: .utf8)
    }
    func write(_ value: String?, key: String) throws {
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
