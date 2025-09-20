import SwiftUI

@main
struct StreamApp: App {
    @StateObject private var appCoordinator = AppCoordinator()
    @StateObject private var walletManager = WalletManager()
    @StateObject private var biometricAuth = BiometricAuthService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appCoordinator)
                .environmentObject(walletManager)
                .environmentObject(biometricAuth)
                .preferredColorScheme(.light)
                .onAppear {
                    setupApp()
                }
        }
    }

    private func setupApp() {
        // Configure app-wide settings
        configureAppearance()

        // Initialize services
        Task {
            await appCoordinator.initialize()
        }
    }

    private func configureAppearance() {
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(StreamColors.surface)
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(StreamColors.textPrimary),
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
        ]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance

        // Configure tab bar appearance
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(StreamColors.surface)

        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
    }
}