import SwiftUI

struct WorkSessionView: View {
    @StateObject private var viewModel = WorkSessionViewModel()
    @State private var showingScenarioSelection = false

    var body: some View {
        NavigationView {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 24) {
                    if viewModel.isSessionActive {
                        ActiveSessionCard(
                            scenario: viewModel.currentScenario!,
                            sessionData: viewModel.sessionData,
                            onPauseResume: viewModel.togglePause,
                            onEndSession: viewModel.endSession
                        )
                    } else {
                        StartSessionCard(
                            onStartSession: {
                                showingScenarioSelection = true
                            }
                        )
                    }

                    SessionStatsSection(stats: viewModel.sessionStats)

                    RecentSessionsSection(sessions: viewModel.recentSessions)

                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
            }
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("Work Session")
            .navigationBarTitleDisplayMode(.large)
        }
        .sheet(isPresented: $showingScenarioSelection) {
            ScenarioSelectionView { scenario in
                viewModel.startSession(with: scenario)
                showingScenarioSelection = false
            }
        }
    }
}

// MARK: - Active Session Card

struct ActiveSessionCard: View {
    let scenario: WorkScenario
    let sessionData: SessionData
    let onPauseResume: () -> Void
    let onEndSession: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            // Header
            HStack {
                ScenarioIcon(scenario.scenarioType)
                    .frame(width: 50, height: 50)

                VStack(alignment: .leading, spacing: 4) {
                    Text(scenario.employer)
                        .streamHeadline()

                    Text(scenario.position)
                        .streamBodySecondary()
                }

                Spacer()

                StatusIndicator(status: sessionData.status)
            }

            // Timer display
            VStack(spacing: 8) {
                Text(formatTime(sessionData.elapsedTime))
                    .font(.system(size: 48, weight: .bold, design: .monospaced))
                    .foregroundColor(scenario.themeColor)

                Text("Time Worked")
                    .streamCaption()
            }

            // Earnings display
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Current Earnings")
                        .streamCaption()

                    Text("$\(sessionData.currentEarnings, specifier: "%.2f")")
                        .font(StreamFonts.title2)
                        .foregroundColor(StreamColors.textPrimary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Hourly Rate")
                        .streamCaption()

                    Text("$\(scenario.hourlyRate, specifier: "%.0f")/hr")
                        .font(StreamFonts.title3)
                        .foregroundColor(StreamColors.textSecondary)
                }
            }

            // Action buttons
            HStack(spacing: 16) {
                Button(action: onPauseResume) {
                    HStack(spacing: 8) {
                        Image(systemName: sessionData.status == .active ? "pause.fill" : "play.fill")
                        Text(sessionData.status == .active ? "Pause" : "Resume")
                    }
                    .font(StreamFonts.button)
                    .foregroundColor(scenario.themeColor)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(scenario.themeColor.opacity(0.1))
                    .cornerRadius(12)
                }

                Button(action: onEndSession) {
                    HStack(spacing: 8) {
                        Image(systemName: "stop.fill")
                        Text("End Session")
                    }
                    .font(StreamFonts.button)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(StreamColors.error)
                    .cornerRadius(12)
                }
            }
        }
        .padding(24)
        .background(StreamColors.surface)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 4)
    }

    private func formatTime(_ timeInterval: TimeInterval) -> String {
        let hours = Int(timeInterval) / 3600
        let minutes = Int(timeInterval) % 3600 / 60
        let seconds = Int(timeInterval) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
}

// MARK: - Start Session Card

struct StartSessionCard: View {
    let onStartSession: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .fill(StreamColors.streamBlue.opacity(0.1))
                    .frame(width: 100, height: 100)

                Image(systemName: "play.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(StreamColors.streamBlue)
            }

            VStack(spacing: 8) {
                Text("Start Work Session")
                    .streamTitle2()

                Text("Begin tracking your work time to generate wage proofs and access your earnings.")
                    .streamBodySecondary()
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }

            Button(action: onStartSession) {
                HStack(spacing: 8) {
                    Image(systemName: "play.fill")
                    Text("Start Session")
                }
                .font(StreamFonts.button)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(StreamColors.streamBlue)
                .cornerRadius(16)
            }
        }
        .padding(32)
        .background(StreamColors.surface)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 4)
    }
}

// MARK: - Supporting Components

struct StatusIndicator: View {
    let status: SessionStatus

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(status.color)
                .frame(width: 8, height: 8)

            Text(status.displayName)
                .font(StreamFonts.caption)
                .foregroundColor(status.color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(status.color.opacity(0.1))
        .cornerRadius(10)
    }
}

struct SessionStatsSection: View {
    let stats: SessionStats

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Today's Stats")
                .streamHeadline()

            HStack(spacing: 16) {
                StatCard(
                    title: "Hours",
                    value: String(format: "%.1f", stats.hoursWorked),
                    icon: "clock.fill",
                    color: StreamColors.streamBlue
                )

                StatCard(
                    title: "Earned",
                    value: "$\(stats.totalEarned, specifier: "%.0f")",
                    icon: "dollarsign.circle.fill",
                    color: StreamColors.success
                )

                StatCard(
                    title: "Sessions",
                    value: "\(stats.sessionsCompleted)",
                    icon: "checkmark.circle.fill",
                    color: StreamColors.streamOrange
                )
            }
        }
    }
}

struct RecentSessionsSection: View {
    let sessions: [CompletedSession]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Sessions")
                .streamHeadline()

            LazyVStack(spacing: 12) {
                ForEach(sessions) { session in
                    RecentSessionRow(session: session)
                }
            }
        }
    }
}

struct RecentSessionRow: View {
    let session: CompletedSession

    var body: some View {
        HStack(spacing: 16) {
            ScenarioIcon(session.scenarioType)
                .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(session.employer)
                    .streamCallout()
                    .foregroundColor(StreamColors.textPrimary)

                Text("\(session.duration, specifier: "%.1f")h • $\(session.earnings, specifier: "%.2f")")
                    .streamCaption()
                    .foregroundColor(StreamColors.textSecondary)
            }

            Spacer()

            Text(RelativeDateTimeFormatter().localizedString(for: session.completedAt, relativeTo: Date()))
                .streamCaption()
                .foregroundColor(StreamColors.textTertiary)
        }
        .padding(16)
        .background(StreamColors.surface)
        .cornerRadius(12)
    }
}

// MARK: - Scenario Selection

struct ScenarioSelectionView: View {
    let onScenarioSelected: (WorkScenario) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(WorkScenario.sampleScenarios) { scenario in
                        ScenarioSelectionCard(
                            scenario: scenario,
                            onSelected: {
                                onScenarioSelected(scenario)
                            }
                        )
                    }
                }
                .padding(20)
            }
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("Select Work Scenario")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct ScenarioSelectionCard: View {
    let scenario: WorkScenario
    let onSelected: () -> Void

    var body: some View {
        Button(action: onSelected) {
            HStack(spacing: 16) {
                ScenarioIcon(scenario.scenarioType)
                    .frame(width: 50, height: 50)

                VStack(alignment: .leading, spacing: 4) {
                    Text(scenario.employer)
                        .streamHeadline()
                        .foregroundColor(StreamColors.textPrimary)

                    Text(scenario.position)
                        .streamBodySecondary()

                    Text("$\(scenario.hourlyRate, specifier: "%.0f")/hour")
                        .font(StreamFonts.callout)
                        .fontWeight(.medium)
                        .foregroundColor(scenario.themeColor)
                }

                Spacer()

                DifficultyBadge(difficulty: scenario.difficulty)
            }
            .padding(20)
            .background(StreamColors.surface)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    WorkSessionView()
}