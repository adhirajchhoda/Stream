import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showingProofGeneration = false
    @State private var selectedScenario: WorkScenario?

    var body: some View {
        NavigationView {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 24) {
                    // Header section
                    DashboardHeader(
                        totalBalance: viewModel.totalAvailableWages,
                        pendingClaims: viewModel.pendingClaims
                    )

                    // Quick actions
                    QuickActionsSection()

                    // Work scenarios
                    WorkScenariosSection(
                        scenarios: viewModel.workScenarios,
                        onScenarioTapped: { scenario in
                            selectedScenario = scenario
                            startWorkSession(for: scenario)
                        },
                        onClaimTapped: { scenario in
                            selectedScenario = scenario
                            showingProofGeneration = true
                        }
                    )

                    // Recent activity
                    RecentActivitySection(attestations: viewModel.recentAttestations)

                    // Bottom padding for tab bar
                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
            }
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    ProfileButton()
                }
            }
            .refreshable {
                await viewModel.refresh()
            }
        }
        .sheet(isPresented: $showingProofGeneration) {
            if let scenario = selectedScenario {
                ZKProofGenerationView(scenario: scenario)
            }
        }
        .onAppear {
            Task {
                await viewModel.loadData()
            }
        }
    }

    private func startWorkSession(for scenario: WorkScenario) {
        // Navigate to work session view
        // This would typically be handled by the coordinator
    }
}

// MARK: - Dashboard Header

struct DashboardHeader: View {
    let totalBalance: Double
    let pendingClaims: Int

    var body: some View {
        VStack(spacing: 20) {
            // Greeting and balance
            VStack(spacing: 8) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(greeting)
                            .streamBodySecondary()

                        Text("Available to Claim")
                            .streamCaption()
                    }

                    Spacer()

                    NotificationButton()
                }

                HStack {
                    Text("$\(totalBalance, specifier: "%.2f")")
                        .font(StreamFonts.largeTitle)
                        .foregroundColor(StreamColors.textPrimary)

                    Spacer()
                }
            }

            // Stats cards
            HStack(spacing: 16) {
                StatCard(
                    title: "Pending",
                    value: "\(pendingClaims)",
                    icon: "clock.fill",
                    color: StreamColors.warning
                )

                StatCard(
                    title: "This Week",
                    value: "$1,240",
                    icon: "calendar.badge.clock",
                    color: StreamColors.success
                )

                StatCard(
                    title: "ZK Proofs",
                    value: "8",
                    icon: "checkmark.shield.fill",
                    color: StreamColors.info
                )
            }
        }
        .padding(.top, 8)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)

                Spacer()
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(StreamFonts.title2)
                    .foregroundColor(StreamColors.textPrimary)

                Text(title)
                    .font(StreamFonts.caption)
                    .foregroundColor(StreamColors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(StreamColors.surface)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Quick Actions

struct QuickActionsSection: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Quick Actions")
                .streamHeadline()

            HStack(spacing: 16) {
                QuickActionButton(
                    title: "Start Work",
                    icon: "play.fill",
                    color: StreamColors.streamBlue,
                    action: {}
                )

                QuickActionButton(
                    title: "View Proofs",
                    icon: "doc.text.fill",
                    color: StreamColors.streamGreen,
                    action: {}
                )

                QuickActionButton(
                    title: "History",
                    icon: "clock.arrow.circlepath",
                    color: StreamColors.streamOrange,
                    action: {}
                )
            }
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.1))
                        .frame(width: 56, height: 56)

                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundColor(color)
                }

                Text(title)
                    .font(StreamFonts.caption)
                    .foregroundColor(StreamColors.textPrimary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(StreamColors.surface)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Work Scenarios

struct WorkScenariosSection: View {
    let scenarios: [WorkScenario]
    let onScenarioTapped: (WorkScenario) -> Void
    let onClaimTapped: (WorkScenario) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Work Scenarios")
                    .streamHeadline()

                Spacer()

                Button("See All") {
                    // Navigate to all scenarios
                }
                .font(StreamFonts.callout)
                .foregroundColor(StreamColors.streamBlue)
            }

            LazyVStack(spacing: 16) {
                ForEach(scenarios) { scenario in
                    WageCard(
                        scenario: scenario,
                        amount: scenario.totalWage,
                        status: .available,
                        onClaimTapped: {
                            onClaimTapped(scenario)
                        }
                    )
                    .onTapGesture {
                        onScenarioTapped(scenario)
                    }
                }
            }
        }
    }
}

// MARK: - Recent Activity

struct RecentActivitySection: View {
    let attestations: [AttestationResponse]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Activity")
                .streamHeadline()

            LazyVStack(spacing: 12) {
                ForEach(attestations) { attestation in
                    ActivityItem(attestation: attestation)
                }
            }
        }
    }
}

struct ActivityItem: View {
    let attestation: AttestationResponse

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(attestation.status.color.opacity(0.1))
                    .frame(width: 44, height: 44)

                Image(systemName: statusIcon)
                    .font(.title3)
                    .foregroundColor(attestation.status.color)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Wage Attestation")
                    .font(StreamFonts.callout)
                    .foregroundColor(StreamColors.textPrimary)

                Text("$\(attestation.wageAmount, specifier: "%.2f") • \(attestation.status.displayName)")
                    .font(StreamFonts.caption)
                    .foregroundColor(StreamColors.textSecondary)
            }

            Spacer()

            Text(RelativeDateTimeFormatter().localizedString(for: attestation.createdAt, relativeTo: Date()))
                .font(StreamFonts.caption2)
                .foregroundColor(StreamColors.textTertiary)
        }
        .padding(16)
        .background(StreamColors.surface)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)
    }

    private var statusIcon: String {
        switch attestation.status {
        case .pending: return "clock"
        case .verified: return "checkmark"
        case .claimed: return "checkmark.circle.fill"
        case .expired: return "xmark"
        case .revoked: return "exclamationmark.triangle"
        }
    }
}

// MARK: - Supporting Components

struct ProfileButton: View {
    var body: some View {
        Button(action: {}) {
            ZStack {
                Circle()
                    .fill(StreamColors.streamBlue.opacity(0.1))
                    .frame(width: 36, height: 36)

                Image(systemName: "person.fill")
                    .font(.callout)
                    .foregroundColor(StreamColors.streamBlue)
            }
        }
    }
}

struct NotificationButton: View {
    var body: some View {
        Button(action: {}) {
            ZStack {
                Circle()
                    .fill(StreamColors.surface)
                    .frame(width: 40, height: 40)
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)

                Image(systemName: "bell.fill")
                    .font(.callout)
                    .foregroundColor(StreamColors.textSecondary)

                // Notification badge
                Circle()
                    .fill(StreamColors.streamRed)
                    .frame(width: 8, height: 8)
                    .offset(x: 12, y: -12)
            }
        }
    }
}

#Preview {
    DashboardView()
}