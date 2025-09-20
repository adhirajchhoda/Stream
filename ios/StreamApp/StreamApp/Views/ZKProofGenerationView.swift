import SwiftUI

struct ZKProofGenerationView: View {
    let scenario: WorkScenario
    @StateObject private var viewModel = ZKProofGenerationViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                ZKProofHeader(scenario: scenario)

                Spacer()

                // Main content based on state
                Group {
                    switch viewModel.currentStage {
                    case .preparing:
                        PreparingStage()
                    case .generatingWitness:
                        GeneratingWitnessStage(progress: viewModel.progress)
                    case .computingProof:
                        ComputingProofStage(progress: viewModel.progress)
                    case .verifying:
                        VerifyingStage(progress: viewModel.progress)
                    case .completed:
                        CompletedStage(proof: viewModel.generatedProof)
                    case .failed:
                        FailedStage(error: viewModel.errorMessage)
                    }
                }

                Spacer()

                // Action buttons
                ZKProofActions(
                    stage: viewModel.currentStage,
                    onStartTapped: {
                        Task {
                            await viewModel.startProofGeneration(for: scenario)
                        }
                    },
                    onSubmitTapped: {
                        Task {
                            await viewModel.submitProof()
                        }
                    },
                    onRetryTapped: {
                        Task {
                            await viewModel.retryProofGeneration()
                        }
                    }
                )
            }
            .padding(.horizontal, 24)
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("Generate Proof")
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
    }
}

// MARK: - Header

struct ZKProofHeader: View {
    let scenario: WorkScenario

    var body: some View {
        VStack(spacing: 16) {
            // Scenario info
            HStack(spacing: 16) {
                ScenarioIcon(scenario.scenarioType)
                    .frame(width: 60, height: 60)

                VStack(alignment: .leading, spacing: 4) {
                    Text(scenario.employer)
                        .streamTitle2()

                    Text(scenario.position)
                        .streamBodySecondary()

                    HStack(spacing: 8) {
                        Text("$\(scenario.totalWage, specifier: "%.2f")")
                            .font(StreamFonts.headline)
                            .foregroundColor(scenario.themeColor)

                        DifficultyBadge(difficulty: scenario.difficulty)
                    }
                }

                Spacer()
            }
            .padding(20)
            .background(StreamColors.surface)
            .cornerRadius(16)
        }
        .padding(.top, 8)
    }
}

// MARK: - Stages

struct PreparingStage: View {
    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .stroke(StreamColors.outline, lineWidth: 2)
                    .frame(width: 120, height: 120)

                Image(systemName: "gear")
                    .font(.system(size: 40))
                    .foregroundColor(StreamColors.textSecondary)
            }

            VStack(spacing: 8) {
                Text("Ready to Generate Proof")
                    .streamTitle2()

                Text("Zero-knowledge proof will be generated to protect your privacy while verifying your wage claim.")
                    .streamBodySecondary()
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }
        }
    }
}

struct GeneratingWitnessStage: View {
    let progress: Double

    var body: some View {
        VStack(spacing: 24) {
            ZKProofProgress(
                progress: progress,
                color: StreamColors.streamBlue,
                icon: "brain.head.profile"
            )

            VStack(spacing: 8) {
                Text("Generating Witness")
                    .streamTitle2()

                Text("Computing witness values from your work data...")
                    .streamBodySecondary()
                    .multilineTextAlignment(.center)
            }

            ProgressDetailsList(
                items: [
                    ("Wage calculation", progress > 0.2),
                    ("Time verification", progress > 0.5),
                    ("Nullifier generation", progress > 0.8)
                ]
            )
        }
    }
}

struct ComputingProofStage: View {
    let progress: Double

    var body: some View {
        VStack(spacing: 24) {
            ZKProofProgress(
                progress: progress,
                color: StreamColors.streamGreen,
                icon: "lock.shield"
            )

            VStack(spacing: 8) {
                Text("Computing Proof")
                    .streamTitle2()

                Text("Generating zero-knowledge proof using advanced cryptography...")
                    .streamBodySecondary()
                    .multilineTextAlignment(.center)
            }

            ProgressDetailsList(
                items: [
                    ("Circuit compilation", progress > 0.3),
                    ("Proof generation", progress > 0.6),
                    ("Optimization", progress > 0.9)
                ]
            )
        }
    }
}

struct VerifyingStage: View {
    let progress: Double

    var body: some View {
        VStack(spacing: 24) {
            ZKProofProgress(
                progress: progress,
                color: StreamColors.streamOrange,
                icon: "checkmark.shield"
            )

            VStack(spacing: 8) {
                Text("Verifying Proof")
                    .streamTitle2()

                Text("Ensuring proof validity and checking blockchain requirements...")
                    .streamBodySecondary()
                    .multilineTextAlignment(.center)
            }

            ProgressDetailsList(
                items: [
                    ("Proof validation", progress > 0.4),
                    ("Contract compatibility", progress > 0.8)
                ]
            )
        }
    }
}

struct CompletedStage: View {
    let proof: ZKProofData?

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .fill(StreamColors.success.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(StreamColors.success)
            }

            VStack(spacing: 8) {
                Text("Proof Generated!")
                    .streamTitle2()
                    .foregroundColor(StreamColors.success)

                Text("Your zero-knowledge proof is ready to be submitted to the blockchain.")
                    .streamBodySecondary()
                    .multilineTextAlignment(.center)
            }

            if let proof = proof {
                ProofSummaryCard(proof: proof)
            }
        }
    }
}

struct FailedStage: View {
    let error: String?

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .fill(StreamColors.error.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(StreamColors.error)
            }

            VStack(spacing: 8) {
                Text("Proof Generation Failed")
                    .streamTitle2()
                    .foregroundColor(StreamColors.error)

                Text(error ?? "An unexpected error occurred while generating the proof.")
                    .streamBodySecondary()
                    .multilineTextAlignment(.center)
            }
        }
    }
}

// MARK: - Supporting Components

struct ZKProofProgress: View {
    let progress: Double
    let color: Color
    let icon: String

    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 8)
                .frame(width: 120, height: 120)

            // Progress circle
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .frame(width: 120, height: 120)
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.5), value: progress)

            // Icon
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(color)

            // Percentage
            Text("\(Int(progress * 100))%")
                .font(StreamFonts.caption)
                .foregroundColor(color)
                .offset(y: 35)
        }
    }
}

struct ProgressDetailsList: View {
    let items: [(String, Bool)]

    var body: some View {
        VStack(spacing: 12) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                HStack(spacing: 12) {
                    Image(systemName: item.1 ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundColor(item.1 ? StreamColors.success : StreamColors.outline)

                    Text(item.0)
                        .streamCallout()
                        .foregroundColor(item.1 ? StreamColors.textPrimary : StreamColors.textSecondary)

                    Spacer()
                }
                .padding(.horizontal, 20)
            }
        }
        .padding(.vertical, 16)
        .background(StreamColors.surface)
        .cornerRadius(12)
    }
}

struct ProofSummaryCard: View {
    let proof: ZKProofData

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Proof Summary")
                    .streamHeadline()

                Spacer()

                Button("View Details") {
                    // Show detailed proof information
                }
                .font(StreamFonts.callout)
                .foregroundColor(StreamColors.streamBlue)
            }

            VStack(spacing: 12) {
                ProofDetailRow(
                    label: "Circuit ID",
                    value: proof.metadata.circuitId
                )

                ProofDetailRow(
                    label: "Generation Time",
                    value: "\(proof.metadata.provingTime, specifier: "%.2f")s"
                )

                ProofDetailRow(
                    label: "Public Signals",
                    value: "\(proof.publicSignals.count)"
                )
            }
        }
        .padding(20)
        .background(StreamColors.surface)
        .cornerRadius(16)
    }
}

struct ProofDetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .streamCallout()
                .foregroundColor(StreamColors.textSecondary)

            Spacer()

            Text(value)
                .streamCallout()
                .foregroundColor(StreamColors.textPrimary)
        }
    }
}

// MARK: - Actions

struct ZKProofActions: View {
    let stage: ZKProofStage
    let onStartTapped: () -> Void
    let onSubmitTapped: () -> Void
    let onRetryTapped: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            switch stage {
            case .preparing:
                StreamButton(
                    title: "Generate Proof",
                    style: .primary,
                    action: onStartTapped
                )

            case .generatingWitness, .computingProof, .verifying:
                StreamButton(
                    title: "Generating...",
                    style: .disabled,
                    action: {}
                )

            case .completed:
                StreamButton(
                    title: "Submit to Blockchain",
                    style: .primary,
                    action: onSubmitTapped
                )

            case .failed:
                HStack(spacing: 16) {
                    StreamButton(
                        title: "Retry",
                        style: .secondary,
                        action: onRetryTapped
                    )

                    StreamButton(
                        title: "Cancel",
                        style: .outline,
                        action: {}
                    )
                }
            }
        }
        .padding(.bottom, 32)
    }
}

// MARK: - Custom Button

struct StreamButton: View {
    let title: String
    let style: ButtonStyle
    let action: () -> Void

    enum ButtonStyle {
        case primary, secondary, outline, disabled
    }

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(StreamFonts.button)
                .foregroundColor(foregroundColor)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(backgroundColor)
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(borderColor, lineWidth: borderWidth)
                )
        }
        .disabled(style == .disabled)
    }

    private var foregroundColor: Color {
        switch style {
        case .primary: return .white
        case .secondary: return StreamColors.streamBlue
        case .outline: return StreamColors.textPrimary
        case .disabled: return StreamColors.textSecondary
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .primary: return StreamColors.streamBlue
        case .secondary: return StreamColors.streamBlue.opacity(0.1)
        case .outline: return Color.clear
        case .disabled: return StreamColors.outline
        }
    }

    private var borderColor: Color {
        switch style {
        case .outline: return StreamColors.outline
        default: return Color.clear
        }
    }

    private var borderWidth: CGFloat {
        style == .outline ? 1 : 0
    }
}

#Preview {
    ZKProofGenerationView(scenario: WorkScenario.sampleScenarios[0])
}