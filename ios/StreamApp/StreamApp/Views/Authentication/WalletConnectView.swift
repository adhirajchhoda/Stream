import SwiftUI

struct WalletConnectView: View {
    @EnvironmentObject var walletManager: WalletManager
    @EnvironmentObject var appCoordinator: AppCoordinator
    @Environment(\.dismiss) private var dismiss
    @State private var isConnecting = false
    @State private var showingError = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                WalletConnectHeader()

                Spacer()

                // Main content
                VStack(spacing: 32) {
                    // Wallet icon
                    WalletIcon()

                    // Description
                    VStack(spacing: 16) {
                        Text("Connect Your Wallet")
                            .streamTitle1()

                        Text("Connect your Web3 wallet to start using Stream Protocol. Your wallet will be used to receive wage payments and interact with smart contracts.")
                            .streamBodySecondary()
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }

                    // Wallet options
                    WalletOptions(
                        isConnecting: isConnecting,
                        onWalletSelected: connectWallet
                    )
                }

                Spacer()

                // Security notice
                SecurityNotice()
            }
            .padding(.horizontal, 24)
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("Connect Wallet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(StreamColors.textSecondary)
                }
            }
        }
        .alert("Connection Error", isPresented: $showingError) {
            Button("Try Again") {
                Task {
                    await connectWallet(.demo)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    private func connectWallet(_ type: WalletType) async {
        isConnecting = true

        do {
            try await walletManager.connectWallet()
            appCoordinator.completeOnboarding()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }

        isConnecting = false
    }
}

// MARK: - Header

struct WalletConnectHeader: View {
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Step 2 of 2")
                    .streamCaption()

                Text("Wallet Connection")
                    .streamHeadline()
            }

            Spacer()

            // Progress indicator
            HStack(spacing: 8) {
                Circle()
                    .fill(StreamColors.success)
                    .frame(width: 8, height: 8)

                Circle()
                    .fill(StreamColors.streamBlue)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.vertical, 16)
    }
}

// MARK: - Wallet Icon

struct WalletIcon: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(StreamColors.streamBlue.opacity(0.1))
                .frame(width: 120, height: 120)

            Image(systemName: "wallet.pass.fill")
                .font(.system(size: 60))
                .foregroundColor(StreamColors.streamBlue)
        }
    }
}

// MARK: - Wallet Options

struct WalletOptions: View {
    let isConnecting: Bool
    let onWalletSelected: (WalletType) async -> Void

    var body: some View {
        VStack(spacing: 16) {
            ForEach(WalletType.allCases) { walletType in
                WalletOptionCard(
                    walletType: walletType,
                    isConnecting: isConnecting,
                    onTapped: {
                        Task {
                            await onWalletSelected(walletType)
                        }
                    }
                )
            }
        }
    }
}

struct WalletOptionCard: View {
    let walletType: WalletType
    let isConnecting: Bool
    let onTapped: () -> Void

    var body: some View {
        Button(action: onTapped) {
            HStack(spacing: 16) {
                // Wallet icon
                ZStack {
                    Circle()
                        .fill(walletType.color.opacity(0.1))
                        .frame(width: 48, height: 48)

                    Image(systemName: walletType.iconName)
                        .font(.title2)
                        .foregroundColor(walletType.color)
                }

                // Wallet info
                VStack(alignment: .leading, spacing: 4) {
                    Text(walletType.displayName)
                        .streamHeadline()
                        .foregroundColor(StreamColors.textPrimary)

                    Text(walletType.description)
                        .streamCaption()
                        .foregroundColor(StreamColors.textSecondary)
                }

                Spacer()

                // Connect indicator
                if isConnecting {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.callout)
                        .foregroundColor(StreamColors.textSecondary)
                }
            }
            .padding(20)
            .background(StreamColors.surface)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
        }
        .disabled(isConnecting)
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Security Notice

struct SecurityNotice: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "shield.checkered")
                    .font(.callout)
                    .foregroundColor(StreamColors.success)

                Text("Secure & Private")
                    .streamCallout()
                    .foregroundColor(StreamColors.success)

                Spacer()
            }

            Text("Stream Protocol never stores your private keys. Your wallet remains in your control at all times.")
                .streamCaption()
                .foregroundColor(StreamColors.textSecondary)
                .multilineTextAlignment(.leading)
        }
        .padding(16)
        .background(StreamColors.success.opacity(0.05))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(StreamColors.success.opacity(0.2), lineWidth: 1)
        )
        .padding(.bottom, 32)
    }
}

// MARK: - Wallet Types

enum WalletType: String, CaseIterable, Identifiable {
    case demo = "demo"
    case metamask = "metamask"
    case walletConnect = "walletconnect"
    case coinbase = "coinbase"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .demo: return "Demo Wallet"
        case .metamask: return "MetaMask"
        case .walletConnect: return "WalletConnect"
        case .coinbase: return "Coinbase Wallet"
        }
    }

    var description: String {
        switch self {
        case .demo: return "Test the app with a demo wallet"
        case .metamask: return "Connect with MetaMask mobile app"
        case .walletConnect: return "Connect with any WalletConnect wallet"
        case .coinbase: return "Connect with Coinbase Wallet app"
        }
    }

    var iconName: String {
        switch self {
        case .demo: return "testtube.2"
        case .metamask: return "circle.fill"
        case .walletConnect: return "qrcode"
        case .coinbase: return "building.columns.fill"
        }
    }

    var color: Color {
        switch self {
        case .demo: return StreamColors.streamOrange
        case .metamask: return StreamColors.streamOrange
        case .walletConnect: return StreamColors.streamBlue
        case .coinbase: return StreamColors.streamBlue
        }
    }
}

#Preview {
    WalletConnectView()
        .environmentObject(WalletManager())
        .environmentObject(AppCoordinator())
}