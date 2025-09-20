import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appCoordinator: AppCoordinator
    @EnvironmentObject var walletManager: WalletManager
    @EnvironmentObject var biometricAuth: BiometricAuthService

    var body: some View {
        Group {
            switch appCoordinator.currentFlow {
            case .onboarding:
                OnboardingCoordinatorView()
            case .authentication:
                AuthenticationView()
            case .main:
                MainTabView()
            case .loading:
                LoadingView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appCoordinator.currentFlow)
        .onReceive(walletManager.$isConnected) { isConnected in
            if isConnected && appCoordinator.currentFlow == .onboarding {
                appCoordinator.completeOnboarding()
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppCoordinator())
        .environmentObject(WalletManager())
        .environmentObject(BiometricAuthService())
}