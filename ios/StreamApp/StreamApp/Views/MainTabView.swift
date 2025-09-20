import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var appCoordinator: AppCoordinator

    var body: some View {
        TabView(selection: $appCoordinator.selectedTab) {
            DashboardView()
                .tabItem {
                    Image(systemName: MainTab.dashboard.iconName)
                    Text(MainTab.dashboard.title)
                }
                .tag(MainTab.dashboard)

            WorkSessionView()
                .tabItem {
                    Image(systemName: MainTab.work.iconName)
                    Text(MainTab.work.title)
                }
                .tag(MainTab.work)

            ProofsView()
                .tabItem {
                    Image(systemName: MainTab.proofs.iconName)
                    Text(MainTab.proofs.title)
                }
                .tag(MainTab.proofs)

            ProfileView()
                .tabItem {
                    Image(systemName: MainTab.profile.iconName)
                    Text(MainTab.profile.title)
                }
                .tag(MainTab.profile)
        }
        .accentColor(StreamColors.streamBlue)
    }
}

#Preview {
    MainTabView()
        .environmentObject(AppCoordinator())
}