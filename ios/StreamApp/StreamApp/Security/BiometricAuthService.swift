import Foundation
import LocalAuthentication
import Combine

@MainActor
class BiometricAuthService: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var biometricType: BiometricType = .none
    @Published var isAvailable: Bool = false
    @Published var errorMessage: String?

    private let context = LAContext()
    private let reasonString = "Authenticate to access your Stream Protocol wallet"

    enum BiometricType {
        case none
        case touchID
        case faceID
        case passcode

        var displayName: String {
            switch self {
            case .none: return "None"
            case .touchID: return "Touch ID"
            case .faceID: return "Face ID"
            case .passcode: return "Passcode"
            }
        }

        var iconName: String {
            switch self {
            case .none: return "xmark.circle"
            case .touchID: return "touchid"
            case .faceID: return "faceid"
            case .passcode: return "key.fill"
            }
        }
    }

    init() {
        checkBiometricAvailability()
    }

    func setupBiometrics() async throws -> Bool {
        let result = try await authenticateWithBiometrics()
        if result {
            UserDefaults.standard.set(true, forKey: "biometric_enabled")
        }
        return result
    }

    func authenticateWithBiometrics() async throws -> Bool {
        guard isAvailable else {
            throw BiometricError.notAvailable
        }

        return try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reasonString
            ) { [weak self] success, error in
                DispatchQueue.main.async {
                    if success {
                        self?.isAuthenticated = true
                        continuation.resume(returning: true)
                    } else {
                        self?.isAuthenticated = false
                        if let error = error {
                            let biometricError = self?.mapLAError(error) ?? BiometricError.authenticationFailed
                            self?.errorMessage = biometricError.localizedDescription
                            continuation.resume(throwing: biometricError)
                        } else {
                            continuation.resume(throwing: BiometricError.authenticationFailed)
                        }
                    }
                }
            }
        }
    }

    func authenticateWithPasscode() async throws -> Bool {
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) else {
            throw BiometricError.notAvailable
        }

        return try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reasonString
            ) { [weak self] success, error in
                DispatchQueue.main.async {
                    if success {
                        self?.isAuthenticated = true
                        continuation.resume(returning: true)
                    } else {
                        self?.isAuthenticated = false
                        if let error = error {
                            let biometricError = self?.mapLAError(error) ?? BiometricError.authenticationFailed
                            self?.errorMessage = biometricError.localizedDescription
                            continuation.resume(throwing: biometricError)
                        } else {
                            continuation.resume(throwing: BiometricError.authenticationFailed)
                        }
                    }
                }
            }
        }
    }

    func logout() {
        isAuthenticated = false
        errorMessage = nil
    }

    func isBiometricEnabled() -> Bool {
        return UserDefaults.standard.bool(forKey: "biometric_enabled")
    }

    func disableBiometrics() {
        UserDefaults.standard.removeObject(forKey: "biometric_enabled")
        isAuthenticated = false
    }

    // MARK: - Private Methods

    private func checkBiometricAvailability() {
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            isAvailable = true

            switch context.biometryType {
            case .touchID:
                biometricType = .touchID
            case .faceID:
                biometricType = .faceID
            default:
                biometricType = .none
            }
        } else {
            isAvailable = false

            // Check if device has passcode
            if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) {
                biometricType = .passcode
                isAvailable = true
            } else {
                biometricType = .none
            }
        }
    }

    private func mapLAError(_ error: Error) -> BiometricError {
        guard let laError = error as? LAError else {
            return BiometricError.authenticationFailed
        }

        switch laError.code {
        case .userCancel:
            return BiometricError.userCancel
        case .userFallback:
            return BiometricError.userFallback
        case .biometryNotAvailable:
            return BiometricError.notAvailable
        case .biometryNotEnrolled:
            return BiometricError.notEnrolled
        case .biometryLockout:
            return BiometricError.lockout
        case .appCancel:
            return BiometricError.appCancel
        case .invalidContext:
            return BiometricError.invalidContext
        case .notInteractive:
            return BiometricError.notInteractive
        default:
            return BiometricError.authenticationFailed
        }
    }
}

// MARK: - Biometric Errors

enum BiometricError: Error, LocalizedError {
    case notAvailable
    case notEnrolled
    case lockout
    case authenticationFailed
    case userCancel
    case userFallback
    case appCancel
    case invalidContext
    case notInteractive

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "Biometric authentication is not available on this device"
        case .notEnrolled:
            return "No biometric data is enrolled. Please set up Touch ID or Face ID in Settings"
        case .lockout:
            return "Biometric authentication is locked. Please use your passcode"
        case .authenticationFailed:
            return "Authentication failed. Please try again"
        case .userCancel:
            return "Authentication was cancelled by user"
        case .userFallback:
            return "User chose to use passcode instead"
        case .appCancel:
            return "Authentication was cancelled by the app"
        case .invalidContext:
            return "Invalid authentication context"
        case .notInteractive:
            return "Authentication is not interactive"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .notEnrolled:
            return "Go to Settings > Touch ID & Passcode or Face ID & Passcode to set up biometric authentication"
        case .lockout:
            return "Enter your device passcode to unlock biometric authentication"
        case .authenticationFailed:
            return "Make sure your finger is clean and dry, or position your face properly"
        default:
            return nil
        }
    }
}