import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject var biometricAuth: BiometricAuthService
    @EnvironmentObject var appCoordinator: AppCoordinator
    @State private var isAuthenticating = false
    @State private var showingError = false
    @State private var errorMessage = ""

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // App branding
            VStack(spacing: 24) {
                AppLogo()

                VStack(spacing: 8) {
                    Text("Welcome Back")
                        .streamTitle1()

                    Text("Authenticate to access your Stream Protocol wallet")
                        .streamBodySecondary()
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
            }

            Spacer()

            // Authentication section
            VStack(spacing: 32) {
                // Biometric icon and status
                BiometricAuthIcon(
                    biometricType: biometricAuth.biometricType,
                    isAuthenticating: isAuthenticating
                )

                // Authentication button
                AuthenticationButton(
                    biometricType: biometricAuth.biometricType,
                    isAuthenticating: isAuthenticating,
                    onTapped: authenticate
                )

                // Alternative options
                AlternativeAuthOptions()
            }

            Spacer()

            // Footer
            AuthenticationFooter()
        }
        .padding(.horizontal, 24)
        .background(StreamColors.background.ignoresSafeArea())
        .alert("Authentication Error", isPresented: $showingError) {
            Button("Try Again") {
                Task {
                    await authenticate()
                }
            }
            Button("Use Passcode") {
                Task {
                    await authenticateWithPasscode()
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .onAppear {
            // Auto-trigger biometric authentication if available
            if biometricAuth.isAvailable && biometricAuth.isBiometricEnabled() {
                Task {
                    await authenticate()
                }
            }
        }
    }

    private func authenticate() async {
        guard !isAuthenticating else { return }

        isAuthenticating = true

        do {
            let success = try await biometricAuth.authenticateWithBiometrics()
            if success {
                appCoordinator.authenticateSuccess()
            }
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }

        isAuthenticating = false
    }

    private func authenticateWithPasscode() async {
        guard !isAuthenticating else { return }

        isAuthenticating = true

        do {
            let success = try await biometricAuth.authenticateWithPasscode()
            if success {
                appCoordinator.authenticateSuccess()
            }
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }

        isAuthenticating = false
    }
}

// MARK: - App Logo

struct AppLogo: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(StreamColors.primaryGradient)
                .frame(width: 100, height: 100)

            Image(systemName: "water.waves")
                .font(.system(size: 40, weight: .medium))
                .foregroundColor(.white)
        }
        .shadow(color: StreamColors.streamBlue.opacity(0.3), radius: 20, x: 0, y: 10)
    }
}

// MARK: - Biometric Auth Icon

struct BiometricAuthIcon: View {
    let biometricType: BiometricAuthService.BiometricType
    let isAuthenticating: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(biometricType.color.opacity(0.1))
                .frame(width: 120, height: 120)

            if isAuthenticating {
                ProgressView()
                    .scaleEffect(1.5)
                    .progressViewStyle(CircularProgressViewStyle(tint: biometricType.color))
            } else {
                Image(systemName: biometricType.iconName)
                    .font(.system(size: 50))
                    .foregroundColor(biometricType.color)
            }
        }
    }
}

extension BiometricAuthService.BiometricType {
    var color: Color {
        switch self {
        case .none: return StreamColors.textSecondary
        case .touchID: return StreamColors.streamBlue
        case .faceID: return StreamColors.streamGreen
        case .passcode: return StreamColors.streamOrange
        }
    }
}

// MARK: - Authentication Button

struct AuthenticationButton: View {
    let biometricType: BiometricAuthService.BiometricType
    let isAuthenticating: Bool
    let onTapped: () async -> Void

    var body: some View {
        Button(action: {
            Task {
                await onTapped()
            }
        }) {
            HStack(spacing: 12) {
                if !isAuthenticating {
                    Image(systemName: biometricType.iconName)
                        .font(.title3)
                }

                Text(buttonText)
                    .font(StreamFonts.button)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(biometricType.color)
            .cornerRadius(16)
        }
        .disabled(isAuthenticating || biometricType == .none)
    }

    private var buttonText: String {
        if isAuthenticating {
            return "Authenticating..."
        }

        switch biometricType {
        case .none: return "Authentication Not Available"
        case .touchID: return "Authenticate with Touch ID"
        case .faceID: return "Authenticate with Face ID"
        case .passcode: return "Authenticate with Passcode"
        }
    }
}

// MARK: - Alternative Auth Options

struct AlternativeAuthOptions: View {
    var body: some View {
        VStack(spacing: 16) {
            Button("Use Passcode Instead") {
                // Handle passcode authentication
            }
            .font(StreamFonts.callout)
            .foregroundColor(StreamColors.streamBlue)

            Button("Forgot Passcode?") {
                // Handle forgot passcode
            }
            .font(StreamFonts.callout)
            .foregroundColor(StreamColors.textSecondary)
        }
    }
}

// MARK: - Footer

struct AuthenticationFooter: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "lock.fill")
                    .font(.caption)
                    .foregroundColor(StreamColors.textSecondary)

                Text("Your biometric data never leaves your device")
                    .streamCaption()
                    .foregroundColor(StreamColors.textSecondary)
            }

            Button("Need help?") {
                // Open help or support
            }
            .font(StreamFonts.caption)
            .foregroundColor(StreamColors.streamBlue)
        }
        .padding(.bottom, 32)
    }
}

// MARK: - Loading View

struct AuthenticationLoadingView: View {
    var body: some View {
        VStack(spacing: 24) {
            ProgressView()
                .scaleEffect(1.5)
                .progressViewStyle(CircularProgressViewStyle(tint: StreamColors.streamBlue))

            Text("Loading Stream Protocol...")
                .streamBodySecondary()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(StreamColors.background.ignoresSafeArea())
    }
}

#Preview {
    Group {
        AuthenticationView()
            .environmentObject(BiometricAuthService())
            .environmentObject(AppCoordinator())

        AuthenticationLoadingView()
    }
}