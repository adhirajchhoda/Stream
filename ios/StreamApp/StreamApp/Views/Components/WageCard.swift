import SwiftUI

struct WageCard: View {
    let scenario: WorkScenario
    let amount: Double
    let status: ClaimStatus
    let onClaimTapped: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with icon and employer info
            HStack(spacing: 12) {
                ScenarioIcon(scenario.scenarioType)
                    .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 4) {
                    Text(scenario.employer)
                        .streamHeadline()
                        .lineLimit(1)

                    Text(scenario.position)
                        .streamBodySecondary()
                        .lineLimit(1)

                    DifficultyBadge(difficulty: scenario.difficulty)
                }

                Spacer()

                StatusBadge(status: status)
            }

            // Work details
            HStack(spacing: 16) {
                WorkDetailItem(
                    icon: "clock.fill",
                    value: "\(scenario.hours, specifier: "%.1f")h",
                    label: "Hours"
                )

                Divider()
                    .frame(height: 20)

                WorkDetailItem(
                    icon: "dollarsign.circle.fill",
                    value: "$\(scenario.hourlyRate, specifier: "%.0f")",
                    label: "Rate"
                )

                Spacer()
            }

            // Amount and action
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Wage")
                        .streamCaption()

                    Text("$\(amount, specifier: "%.2f")")
                        .font(StreamFonts.currencyLarge)
                        .foregroundColor(scenario.themeColor)
                }

                Spacer()

                ClaimButton(
                    status: status,
                    themeColor: scenario.themeColor,
                    action: onClaimTapped
                )
            }
        }
        .padding(20)
        .background(StreamColors.surface)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(scenario.themeColor.opacity(0.1), lineWidth: 1)
        )
    }
}

// MARK: - Supporting Components

struct ScenarioIcon: View {
    let type: ScenarioType

    init(_ type: ScenarioType) {
        self.type = type
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(type.color.opacity(0.1))

            Image(systemName: iconName)
                .font(.title2)
                .foregroundColor(type.color)
        }
    }

    private var iconName: String {
        switch type {
        case .starbucks: return "cup.and.saucer.fill"
        case .amazon: return "shippingbox.fill"
        case .uber: return "car.fill"
        case .custom: return "briefcase.fill"
        }
    }
}

struct DifficultyBadge: View {
    let difficulty: WorkScenario.Difficulty

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(difficulty.color)
                .frame(width: 6, height: 6)

            Text(difficulty.displayName)
                .font(StreamFonts.caption)
                .foregroundColor(difficulty.color)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(difficulty.color.opacity(0.1))
        .cornerRadius(12)
    }
}

struct StatusBadge: View {
    let status: ClaimStatus

    var body: some View {
        Text(status.displayName)
            .font(StreamFonts.caption)
            .foregroundColor(status.color)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(status.color.opacity(0.1))
            .cornerRadius(12)
    }
}

struct WorkDetailItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(StreamColors.textSecondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(StreamFonts.callout)
                    .fontWeight(.medium)
                    .foregroundColor(StreamColors.textPrimary)

                Text(label)
                    .font(StreamFonts.caption2)
                    .foregroundColor(StreamColors.textSecondary)
            }
        }
    }
}

struct ClaimButton: View {
    let status: ClaimStatus
    let themeColor: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if status == .processing {
                    ProgressView()
                        .scaleEffect(0.8)
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: buttonIcon)
                        .font(.callout)
                }

                Text(buttonText)
                    .font(StreamFonts.button)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(buttonBackground)
            .cornerRadius(16)
        }
        .disabled(!isButtonEnabled)
    }

    private var buttonText: String {
        switch status {
        case .available: return "Claim Now"
        case .processing: return "Processing"
        case .completed: return "Claimed"
        case .expired: return "Expired"
        }
    }

    private var buttonIcon: String {
        switch status {
        case .available: return "arrow.right"
        case .processing: return "arrow.clockwise"
        case .completed: return "checkmark"
        case .expired: return "clock"
        }
    }

    private var buttonBackground: Color {
        switch status {
        case .available: return themeColor
        case .processing: return themeColor.opacity(0.8)
        case .completed: return StreamColors.success
        case .expired: return StreamColors.textSecondary
        }
    }

    private var isButtonEnabled: Bool {
        status == .available
    }
}

// MARK: - Supporting Types

enum ClaimStatus {
    case available
    case processing
    case completed
    case expired

    var displayName: String {
        switch self {
        case .available: return "Available"
        case .processing: return "Processing"
        case .completed: return "Claimed"
        case .expired: return "Expired"
        }
    }

    var color: Color {
        switch self {
        case .available: return StreamColors.success
        case .processing: return StreamColors.warning
        case .completed: return StreamColors.info
        case .expired: return StreamColors.textSecondary
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        WageCard(
            scenario: WorkScenario.sampleScenarios[0],
            amount: 153.00,
            status: .available,
            onClaimTapped: {}
        )

        WageCard(
            scenario: WorkScenario.sampleScenarios[1],
            amount: 220.00,
            status: .processing,
            onClaimTapped: {}
        )

        WageCard(
            scenario: WorkScenario.sampleScenarios[2],
            amount: 171.00,
            status: .completed,
            onClaimTapped: {}
        )
    }
    .padding()
    .background(StreamColors.background)
}