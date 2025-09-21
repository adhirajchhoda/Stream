import Foundation
import Security

protocol SecureStorageProtocol {
    func store(_ data: Data, for key: String) throws
    func retrieve(for key: String) throws -> Data?
    func delete(for key: String) throws
    func exists(for key: String) -> Bool
}

class KeychainSecureStorage: SecureStorageProtocol {
    private let service = "com.stream-protocol.app"

    func store(_ data: Data, for key: String) throws {
        // Delete existing item first
        try? delete(for: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.storeFailed(status)
        }
    }

    func retrieve(for key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            return result as? Data
        case errSecItemNotFound:
            return nil
        default:
            throw KeychainError.retrieveFailed(status)
        }
    }

    func delete(for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }

    func exists(for key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: false,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    // MARK: - Biometric Protected Storage

    func storeBiometricProtected(_ data: Data, for key: String) throws {
        // Delete existing item first
        try? delete(for: key)

        let access = SecAccessControlCreateWithFlags(
            nil,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryAny,
            nil
        )

        guard let accessControl = access else {
            throw KeychainError.accessControlFailed
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessControl as String: accessControl
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.storeFailed(status)
        }
    }

    func retrieveBiometricProtected(for key: String, prompt: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecUseOperationPrompt as String: prompt
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            return result as? Data
        case errSecItemNotFound:
            return nil
        case errSecUserCanceled:
            throw KeychainError.userCancelled
        case errSecAuthFailed:
            throw KeychainError.authenticationFailed
        default:
            throw KeychainError.retrieveFailed(status)
        }
    }

    // MARK: - Convenience Methods

    func store<T: Codable>(_ object: T, for key: String) throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(object)
        try store(data, for: key)
    }

    func retrieve<T: Codable>(_ type: T.Type, for key: String) throws -> T? {
        guard let data = try retrieve(for: key) else { return nil }
        let decoder = JSONDecoder()
        return try decoder.decode(type, from: data)
    }

    func storeString(_ string: String, for key: String) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }
        try store(data, for: key)
    }

    func retrieveString(for key: String) throws -> String? {
        guard let data = try retrieve(for: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

// MARK: - Keychain Errors

enum KeychainError: Error, LocalizedError {
    case storeFailed(OSStatus)
    case retrieveFailed(OSStatus)
    case deleteFailed(OSStatus)
    case accessControlFailed
    case userCancelled
    case authenticationFailed
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .storeFailed(let status):
            return "Failed to store item in keychain: \(status)"
        case .retrieveFailed(let status):
            return "Failed to retrieve item from keychain: \(status)"
        case .deleteFailed(let status):
            return "Failed to delete item from keychain: \(status)"
        case .accessControlFailed:
            return "Failed to create access control for keychain item"
        case .userCancelled:
            return "User cancelled keychain access"
        case .authenticationFailed:
            return "Authentication failed for keychain access"
        case .encodingFailed:
            return "Failed to encode data for keychain storage"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .userCancelled:
            return "Please try again and complete the authentication"
        case .authenticationFailed:
            return "Check your biometric settings and try again"
        case .accessControlFailed:
            return "Ensure biometric authentication is set up on your device"
        default:
            return "Please try again or contact support if the problem persists"
        }
    }
}

// MARK: - Mock Implementation for Testing

class MockSecureStorage: SecureStorageProtocol {
    private var storage: [String: Data] = [:]

    func store(_ data: Data, for key: String) throws {
        storage[key] = data
    }

    func retrieve(for key: String) throws -> Data? {
        return storage[key]
    }

    func delete(for key: String) throws {
        storage.removeValue(forKey: key)
    }

    func exists(for key: String) -> Bool {
        return storage[key] != nil
    }

    func clear() {
        storage.removeAll()
    }
}