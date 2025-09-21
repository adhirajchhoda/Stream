import SwiftUI

struct OnboardingCoordinatorView: View {
    @State private var currentPage = 0
    @State private var showingWalletConnect = false
    @EnvironmentObject var appCoordinator: AppCoordinator
    @EnvironmentObject var walletManager: WalletManager

    private let onboardingPages = OnboardingPage.allPages

    var body: some View {
        ZStack {
            // Background gradient
            StreamColors.primaryGradient
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Skip button
                HStack {
                    Spacer()
                    Button("Skip") {
                        appCoordinator.completeOnboarding()
                    }
                    .font(StreamFonts.callout)
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                }

                Spacer()

                // Page view
                TabView(selection: $currentPage) {
                    ForEach(Array(onboardingPages.enumerated()), id: \.offset) { index, page in
                        OnboardingPageView(page: page)
                            .tag(index)
                    }
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .frame(maxHeight: 500)

                Spacer()

                // Page indicator and navigation
                VStack(spacing: 32) {
                    // Custom page indicator
                    PageIndicator(
                        currentPage: currentPage,
                        totalPages: onboardingPages.count
                    )

                    // Navigation buttons
                    OnboardingNavigation(
                        currentPage: currentPage,
                        totalPages: onboardingPages.count,
                        onNext: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                if currentPage < onboardingPages.count - 1 {
                                    currentPage += 1
                                } else {
                                    showingWalletConnect = true
                                }
                            }
                        },
                        onGetStarted: {
                            showingWalletConnect = true
                        }
                    )
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 50)
            }
        }
        .sheet(isPresented: $showingWalletConnect) {
            WalletConnectView()
        }
    }
}


// MARK: - Page Indicator

struct PageIndicator: View {
    let currentPage: Int
    let totalPages: Int

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<totalPages, id: \.self) { index in
                Circle()
                    .fill(index == currentPage ? .white : .white.opacity(0.3))
                    .frame(width: 8, height: 8)
                    .scaleEffect(index == currentPage ? 1.2 : 1.0)
                    .animation(.easeInOut(duration: 0.2), value: currentPage)
            }
        }
    }
}

// MARK: - Navigation Buttons

struct OnboardingNavigation: View {
    let currentPage: Int
    let totalPages: Int
    let onNext: () -> Void
    let onGetStarted: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            // Primary button
            Button(action: {
                if isLastPage {
                    onGetStarted()
                } else {
                    onNext()
                }
            }) {
                Text(isLastPage ? "Get Started" : "Continue")
                    .font(StreamFonts.button)
                    .foregroundColor(StreamColors.streamBlue)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(.white)
                    .cornerRadius(16)
            }

            // Secondary button (only on last page)
            if isLastPage {
                Button("Learn More") {
                    // Open documentation or info
                }
                .font(StreamFonts.callout)
                .foregroundColor(.white.opacity(0.8))
            }
        }
    }

    private var isLastPage: Bool {
        currentPage == totalPages - 1
    }
}



#Preview {
    OnboardingCoordinatorView()
        .environmentObject(AppCoordinator())
        .environmentObject(WalletManager())
}