import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var walletManager: WalletManager
    @EnvironmentObject var biometricAuth: BiometricAuthService
    @EnvironmentObject var appCoordinator: AppCoordinator
    @State private var showingWalletDetails = false
    @State private var showingSecuritySettings = false

    var body: some View {
        NavigationView {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 24) {
                    // Profile header
                    ProfileHeader(wallet: walletManager.connectedWallet)

                    // Quick stats
                    ProfileStatsSection()

                    // Settings sections
                    SettingsSection(
                        title: "Wallet",
                        items: walletSettingsItems
                    )

                    SettingsSection(
                        title: "Security",
                        items: securitySettingsItems
                    )

                    SettingsSection(
                        title: "Support",
                        items: supportSettingsItems
                    )

                    SettingsSection(
                        title: "About",
                        items: aboutSettingsItems
                    )

                    // Logout button
                    LogoutButton {
                        logout()
                    }

                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
            }
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(isPresented: $showingWalletDetails) {
            WalletDetailsView()
        }
        .sheet(isPresented: $showingSecuritySettings) {
            SecuritySettingsView()
        }
    }

    // MARK: - Settings Items

    private var walletSettingsItems: [SettingsItem] {
        [
            SettingsItem(
                title: "Wallet Details",
                subtitle: walletManager.connectedWallet?.address.prefix(6) ?? "Not connected",
                icon: "wallet.pass.fill",
                action: { showingWalletDetails = true }
            ),
            SettingsItem(
                title: "Connected Networks",
                subtitle: "Ethereum, Polygon",
                icon: "network",
                action: {}
            ),
            SettingsItem(
                title: "Transaction History",
                subtitle: "View all transactions",
                icon: "list.bullet.rectangle.portrait.fill",
                action: {}
            )
        ]
    }

    private var securitySettingsItems: [SettingsItem] {
        [
            SettingsItem(
                title: "Biometric Authentication",
                subtitle: biometricAuth.biometricType.displayName,
                icon: biometricAuth.biometricType.iconName,
                action: { showingSecuritySettings = true }
            ),
            SettingsItem(
                title: "Recovery Phrase",
                subtitle: "Backup your wallet",
                icon: "key.horizontal.fill",
                action: {}
            ),
            SettingsItem(
                title: "Privacy Settings",
                subtitle: "Manage data privacy",
                icon: "shield.lefthalf.filled",
                action: {}
            )
        ]
    }

    private var supportSettingsItems: [SettingsItem] {
        [
            SettingsItem(
                title: "Help Center",
                subtitle: "Get help and support",
                icon: "questionmark.circle.fill",
                action: {}
            ),
            SettingsItem(
                title: "Contact Support",
                subtitle: "Reach out to our team",
                icon: "message.fill",
                action: {}
            ),
            SettingsItem(
                title: "Report Issue",
                subtitle: "Report bugs or problems",
                icon: "exclamationmark.triangle.fill",
                action: {}
            )
        ]
    }

    private var aboutSettingsItems: [SettingsItem] {
        [
            SettingsItem(
                title: "Version",
                subtitle: "1.0.0 (Build 100)",
                icon: "info.circle.fill",
                action: {}
            ),
            SettingsItem(
                title: "Terms of Service",
                subtitle: "Read our terms",
                icon: "doc.text.fill",
                action: {}
            ),
            SettingsItem(
                title: "Privacy Policy",
                subtitle: "Read our privacy policy",
                icon: "hand.raised.fill",
                action: {}
            )
        ]
    }

    private func logout() {
        walletManager.disconnectWallet()
        biometricAuth.logout()
        appCoordinator.logout()
    }
}

// MARK: - Profile Header

struct ProfileHeader: View {
    let wallet: WalletConnection?

    var body: some View {
        VStack(spacing: 20) {
            // Avatar
            ZStack {
                Circle()
                    .fill(StreamColors.primaryGradient)
                    .frame(width: 100, height: 100)

                Text(initials)
                    .font(StreamFonts.largeTitle)
                    .foregroundColor(.white)
            }

            // User info
            VStack(spacing: 8) {
                Text("Stream User")
                    .streamTitle2()

                if let wallet = wallet {
                    Text(formatAddress(wallet.address))
                        .streamMonospace()
                        .foregroundColor(StreamColors.textSecondary)
                } else {
                    Text("No wallet connected")
                        .streamBodySecondary()
                }
            }

            // Connection status
            HStack(spacing: 8) {
                Circle()
                    .fill(wallet != nil ? StreamColors.success : StreamColors.error)
                    .frame(width: 8, height: 8)

                Text(wallet != nil ? "Connected" : "Disconnected")
                    .streamCaption()
                    .foregroundColor(wallet != nil ? StreamColors.success : StreamColors.error)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background((wallet != nil ? StreamColors.success : StreamColors.error).opacity(0.1))
            .cornerRadius(16)
        }
        .padding(.vertical, 8)
    }

    private var initials: String {
        if let address = wallet?.address {
            return String(address.prefix(2)).uppercased()
        }
        return "SU"
    }

    private func formatAddress(_ address: String) -> String {
        if address.count > 10 {
            return "\(address.prefix(6))...\(address.suffix(4))"
        }
        return address
    }
}

// MARK: - Profile Stats Section

struct ProfileStatsSection: View {
    var body: some View {
        HStack(spacing: 16) {
            ProfileStatCard(
                title: "Total Earned",
                value: "$2,847",
                icon: "dollarsign.circle.fill",
                color: StreamColors.success
            )

            ProfileStatCard(
                title: "Proofs Generated",
                value: "24",
                icon: "checkmark.shield.fill",
                color: StreamColors.streamBlue
            )

            ProfileStatCard(
                title: "Hours Worked",
                value: "156",
                icon: "clock.fill",
                color: StreamColors.streamOrange
            )
        }
    }
}

struct ProfileStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            VStack(spacing: 4) {
                Text(value)
                    .font(StreamFonts.title3)
                    .foregroundColor(StreamColors.textPrimary)

                Text(title)
                    .font(StreamFonts.caption)
                    .foregroundColor(StreamColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(StreamColors.surface)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Settings Section

struct SettingsSection: View {
    let title: String
    let items: [SettingsItem]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .streamHeadline()

            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    SettingsRow(
                        item: item,
                        isFirst: index == 0,
                        isLast: index == items.count - 1
                    )
                }
            }
        }
    }
}

struct SettingsRow: View {
    let item: SettingsItem
    let isFirst: Bool
    let isLast: Bool

    var body: some View {
        Button(action: item.action) {
            HStack(spacing: 16) {
                Image(systemName: item.icon)
                    .font(.title3)
                    .foregroundColor(StreamColors.streamBlue)
                    .frame(width: 24, height: 24)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title)
                        .streamCallout()
                        .foregroundColor(StreamColors.textPrimary)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .streamCaption()
                            .foregroundColor(StreamColors.textSecondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(StreamColors.textSecondary)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(StreamColors.surface)
            .cornerRadius(isFirst && isLast ? 16 : (isFirst ? 16 : (isLast ? 16 : 0)), corners: isFirst && isLast ? .allCorners : (isFirst ? [.topLeft, .topRight] : (isLast ? [.bottomLeft, .bottomRight] : [])))
        }
        .buttonStyle(PlainButtonStyle())

        if !isLast {
            Divider()
                .padding(.leading, 60)
        }
    }
}

// MARK: - Logout Button

struct LogoutButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Logout")
            }
            .font(StreamFonts.button)
            .foregroundColor(StreamColors.error)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(StreamColors.error.opacity(0.1))
            .cornerRadius(16)
        }
    }
}

// MARK: - Supporting Types

struct SettingsItem {
    let title: String
    let subtitle: String?
    let icon: String
    let action: () -> Void

    init(title: String, subtitle: String? = nil, icon: String, action: @escaping () -> Void) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.action = action
    }
}

// MARK: - Detail Views

struct WalletDetailsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack {
                Text("Wallet Details")
                    .streamTitle1()
                Spacer()
                Text("Detailed wallet information would be shown here")
                    .streamBodySecondary()
                Spacer()
            }
            .padding()
            .navigationTitle("Wallet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

struct SecuritySettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack {
                Text("Security Settings")
                    .streamTitle1()
                Spacer()
                Text("Security settings would be shown here")
                    .streamBodySecondary()
                Spacer()
            }
            .padding()
            .navigationTitle("Security")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Corner Radius Extension

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

#Preview {
    ProfileView()
        .environmentObject(WalletManager())
        .environmentObject(BiometricAuthService())
        .environmentObject(AppCoordinator())
}