import SwiftUI
import Combine

@MainActor
class AppCoordinator: ObservableObject {
    @Published var currentFlow: AppFlow = .loading
    @Published var selectedTab: MainTab = .dashboard

    private let userDefaults = UserDefaults.standard
    private let hasCompletedOnboardingKey = "hasCompletedOnboarding"
    private let hasSetupBiometricsKey = "hasSetupBiometrics"

    func initialize() async {
        // Simulate app initialization delay
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second

        // Check if user has completed onboarding
        if hasCompletedOnboarding() {
            // Check biometric authentication status
            if hasSetupBiometrics() {
                currentFlow = .authentication
            } else {
                currentFlow = .main
            }
        } else {
            currentFlow = .onboarding
        }
    }

    func completeOnboarding() {
        userDefaults.set(true, forKey: hasCompletedOnboardingKey)
        currentFlow = .authentication
    }

    func completeBiometricSetup() {
        userDefaults.set(true, forKey: hasSetupBiometricsKey)
        currentFlow = .main
    }

    func authenticateSuccess() {
        currentFlow = .main
    }

    func logout() {
        // Clear user data
        userDefaults.removeObject(forKey: hasCompletedOnboardingKey)
        userDefaults.removeObject(forKey: hasSetupBiometricsKey)

        // Reset to onboarding
        currentFlow = .onboarding
        selectedTab = .dashboard
    }

    func selectTab(_ tab: MainTab) {
        selectedTab = tab
    }

    private func hasCompletedOnboarding() -> Bool {
        return userDefaults.bool(forKey: hasCompletedOnboardingKey)
    }

    private func hasSetupBiometrics() -> Bool {
        return userDefaults.bool(forKey: hasSetupBiometricsKey)
    }
}

enum AppFlow {
    case loading
    case onboarding
    case authentication
    case main
}

enum MainTab: CaseIterable, Identifiable {
    case dashboard
    case work
    case proofs
    case profile

    var id: Self { self }

    var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .work: return "Work"
        case .proofs: return "Proofs"
        case .profile: return "Profile"
        }
    }

    var iconName: String {
        switch self {
        case .dashboard: return "house.fill"
        case .work: return "briefcase.fill"
        case .proofs: return "checkmark.shield.fill"
        case .profile: return "person.fill"
        }
    }
}