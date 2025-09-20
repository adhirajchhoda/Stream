import SwiftUI

struct ProofsView: View {
    @StateObject private var viewModel = ProofsViewModel()

    var body: some View {
        NavigationView {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 24) {
                    // Stats header
                    ProofStatsHeader(stats: viewModel.proofStats)

                    // Active proofs
                    if !viewModel.activeProofs.isEmpty {
                        ProofSection(
                            title: "Active Proofs",
                            proofs: viewModel.activeProofs,
                            emptyMessage: nil
                        )
                    }

                    // Recent proofs
                    ProofSection(
                        title: "Recent Proofs",
                        proofs: viewModel.recentProofs,
                        emptyMessage: "No proofs generated yet"
                    )

                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
            }
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("ZK Proofs")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        // Show proof generation help
                    } label: {
                        Image(systemName: "info.circle")
                            .foregroundColor(StreamColors.streamBlue)
                    }
                }
            }
        }
        .refreshable {
            await viewModel.refresh()
        }
        .onAppear {
            Task {
                await viewModel.loadProofs()
            }
        }
    }
}

// MARK: - Proof Stats Header

struct ProofStatsHeader: View {
    let stats: ProofStats

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Generated")
                        .streamCaption()

                    Text("\(stats.totalGenerated)")
                        .font(StreamFonts.largeTitle)
                        .foregroundColor(StreamColors.textPrimary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Success Rate")
                        .streamCaption()

                    Text("\(stats.successRate, specifier: "%.1f")%")
                        .font(StreamFonts.title2)
                        .foregroundColor(StreamColors.success)
                }
            }

            HStack(spacing: 16) {
                ProofStatCard(
                    title: "Verified",
                    value: "\(stats.verified)",
                    icon: "checkmark.shield.fill",
                    color: StreamColors.success
                )

                ProofStatCard(
                    title: "Pending",
                    value: "\(stats.pending)",
                    icon: "clock.fill",
                    color: StreamColors.warning
                )

                ProofStatCard(
                    title: "Failed",
                    value: "\(stats.failed)",
                    icon: "xmark.shield.fill",
                    color: StreamColors.error
                )
            }
        }
        .padding(24)
        .background(StreamColors.surface)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 4)
    }
}

struct ProofStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(StreamFonts.title3)
                .foregroundColor(StreamColors.textPrimary)

            Text(title)
                .font(StreamFonts.caption)
                .foregroundColor(StreamColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(color.opacity(0.05))
        .cornerRadius(12)
    }
}

// MARK: - Proof Section

struct ProofSection: View {
    let title: String
    let proofs: [ZKProofRecord]
    let emptyMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .streamHeadline()

            if proofs.isEmpty {
                EmptyProofsView(message: emptyMessage ?? "No proofs available")
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(proofs) { proof in
                        ProofCard(proof: proof)
                    }
                }
            }
        }
    }
}

// MARK: - Proof Card

struct ProofCard: View {
    let proof: ZKProofRecord
    @State private var showingDetails = false

    var body: some View {
        Button(action: {
            showingDetails = true
        }) {
            VStack(spacing: 16) {
                // Header
                HStack {
                    ProofTypeIcon(proof.proofType)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(proof.title)
                            .streamHeadline()
                            .foregroundColor(StreamColors.textPrimary)

                        Text(proof.subtitle)
                            .streamBodySecondary()
                    }

                    Spacer()

                    ProofStatusBadge(status: proof.status)
                }

                // Details
                HStack {
                    ProofDetailItem(
                        label: "Amount",
                        value: "$\(proof.amount, specifier: "%.2f")"
                    )

                    Spacer()

                    ProofDetailItem(
                        label: "Generated",
                        value: RelativeDateTimeFormatter().localizedString(
                            for: proof.createdAt,
                            relativeTo: Date()
                        )
                    )

                    Spacer()

                    ProofDetailItem(
                        label: "Circuit",
                        value: proof.circuitId
                    )
                }

                // Progress bar (if generating)
                if proof.status == .generating {
                    ProgressView(value: proof.progress)
                        .progressViewStyle(LinearProgressViewStyle(tint: StreamColors.streamBlue))
                }
            }
            .padding(20)
            .background(StreamColors.surface)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.04), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showingDetails) {
            ProofDetailView(proof: proof)
        }
    }
}

// MARK: - Supporting Components

struct ProofTypeIcon: View {
    let proofType: ProofType

    var body: some View {
        ZStack {
            Circle()
                .fill(proofType.color.opacity(0.1))
                .frame(width: 44, height: 44)

            Image(systemName: proofType.iconName)
                .font(.title3)
                .foregroundColor(proofType.color)
        }
    }
}

struct ProofStatusBadge: View {
    let status: ProofStatus

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(status.color)
                .frame(width: 6, height: 6)

            Text(status.displayName)
                .font(StreamFonts.caption)
                .foregroundColor(status.color)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(status.color.opacity(0.1))
        .cornerRadius(8)
    }
}

struct ProofDetailItem: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(StreamFonts.caption2)
                .foregroundColor(StreamColors.textSecondary)

            Text(value)
                .font(StreamFonts.caption)
                .foregroundColor(StreamColors.textPrimary)
        }
    }
}

struct EmptyProofsView: View {
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 40))
                .foregroundColor(StreamColors.textSecondary)

            Text(message)
                .streamBodySecondary()
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .background(StreamColors.surface)
        .cornerRadius(16)
    }
}

// MARK: - Proof Detail View

struct ProofDetailView: View {
    let proof: ZKProofRecord
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Status and basic info
                    ProofDetailHeader(proof: proof)

                    // Technical details
                    ProofTechnicalDetails(proof: proof)

                    // Verification info
                    if proof.status == .verified {
                        ProofVerificationInfo(proof: proof)
                    }
                }
                .padding(20)
            }
            .background(StreamColors.background.ignoresSafeArea())
            .navigationTitle("Proof Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Share") {
                        // Share proof details
                    }
                }
            }
        }
    }
}

struct ProofDetailHeader: View {
    let proof: ZKProofRecord

    var body: some View {
        VStack(spacing: 16) {
            ProofTypeIcon(proof.proofType)
                .scaleEffect(1.5)

            VStack(spacing: 8) {
                Text(proof.title)
                    .streamTitle2()

                ProofStatusBadge(status: proof.status)
            }

            HStack(spacing: 32) {
                VStack(spacing: 4) {
                    Text("Amount")
                        .streamCaption()
                    Text("$\(proof.amount, specifier: "%.2f")")
                        .streamTitle3()
                }

                VStack(spacing: 4) {
                    Text("Circuit")
                        .streamCaption()
                    Text(proof.circuitId)
                        .streamCallout()
                        .streamMonospace()
                }
            }
        }
        .padding(24)
        .background(StreamColors.surface)
        .cornerRadius(16)
    }
}

struct ProofTechnicalDetails: View {
    let proof: ZKProofRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Technical Details")
                .streamHeadline()

            VStack(spacing: 12) {
                DetailRow(label: "Proof ID", value: proof.id)
                DetailRow(label: "Generation Time", value: "\(proof.generationTime, specifier: "%.2f")s")
                DetailRow(label: "Circuit Version", value: proof.circuitVersion)
                DetailRow(label: "Public Signals", value: "\(proof.publicSignalsCount)")
            }
        }
        .padding(20)
        .background(StreamColors.surface)
        .cornerRadius(16)
    }
}

struct ProofVerificationInfo: View {
    let proof: ZKProofRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Verification")
                .streamHeadline()

            HStack(spacing: 12) {
                Image(systemName: "checkmark.shield.fill")
                    .font(.title2)
                    .foregroundColor(StreamColors.success)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Proof Verified")
                        .streamCallout()
                        .foregroundColor(StreamColors.success)

                    Text("Verified on \(proof.verifiedAt?.formatted() ?? "Unknown")")
                        .streamCaption()
                        .foregroundColor(StreamColors.textSecondary)
                }
            }
        }
        .padding(20)
        .background(StreamColors.success.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(StreamColors.success.opacity(0.2), lineWidth: 1)
        )
    }
}

struct DetailRow: View {
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

#Preview {
    ProofsView()
}