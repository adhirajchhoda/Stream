import Foundation
import SwiftUI
import Combine

@MainActor
class ProofsViewModel: ObservableObject {
    @Published var activeProofs: [ZKProofRecord] = []
    @Published var recentProofs: [ZKProofRecord] = []
    @Published var proofStats = ProofStats()
    @Published var isLoading = false

    private let apiService: APIServiceProtocol
    private let zkProofService: ZKProofServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    
    // Background processing queue for stats calculations
    private let statsQueue = DispatchQueue(label: "com.stream.proofs.stats", qos: .utility)

    init(
        apiService: APIServiceProtocol = APIService(),
        zkProofService: ZKProofServiceProtocol = try! ZKProofService()
    ) {
        self.apiService = apiService
        self.zkProofService = zkProofService

        loadSampleData()
    }
    
    deinit {
        // Ensure all subscriptions are cancelled
        cancellables.removeAll()
    }

    func loadProofs() async {
        isLoading = true

        // In production, load from API
        // For demo, use sample data
        await loadSampleDataAsync()

        isLoading = false
    }

    func refresh() async {
        await loadProofs()
    }

    // MARK: - Private Methods

    private func loadSampleData() {
        let sampleProofs = ZKProofRecord.sampleProofs

        activeProofs = sampleProofs.filter { proof in
            proof.status == .generating || proof.status == .pending
        }

        recentProofs = sampleProofs.filter { proof in
            proof.status == .verified || proof.status == .failed
        }

        Task {
            await updateStats()
        }
    }
    
    private func loadSampleDataAsync() async {
        return await withCheckedContinuation { continuation in
            statsQueue.async {
                let sampleProofs = ZKProofRecord.sampleProofs

                let active = sampleProofs.filter { proof in
                    proof.status == .generating || proof.status == .pending
                }

                let recent = sampleProofs.filter { proof in
                    proof.status == .verified || proof.status == .failed
                }
                
                Task { @MainActor in
                    self.activeProofs = active
                    self.recentProofs = recent
                    await self.updateStats()
                    continuation.resume()
                }
            }
        }
    }

    private func updateStats() async {
        return await withCheckedContinuation { continuation in
            statsQueue.async {
                let allProofs = self.activeProofs + self.recentProofs
                
                let stats = ProofStats(
                    totalGenerated: allProofs.count,
                    verified: allProofs.filter { $0.status == .verified }.count,
                    pending: allProofs.filter { $0.status == .pending || $0.status == .generating }.count,
                    failed: allProofs.filter { $0.status == .failed }.count,
                    successRate: allProofs.isEmpty ? 0 : Double(allProofs.filter { $0.status == .verified }.count) / Double(allProofs.count) * 100
                )
                
                Task { @MainActor in
                    self.proofStats = stats
                    continuation.resume()
                }
            }
        }
    }
}

// MARK: - Supporting Types

struct ProofStats {
    var totalGenerated: Int = 0
    var verified: Int = 0
    var pending: Int = 0
    var failed: Int = 0
    var successRate: Double = 0
}

struct ZKProofRecord: Identifiable {
    let id: String
    let proofType: ProofType
    let title: String
    let subtitle: String
    let amount: Double
    let status: ProofStatus
    let progress: Double
    let circuitId: String
    let circuitVersion: String
    let publicSignalsCount: Int
    let generationTime: Double
    let createdAt: Date
    let verifiedAt: Date?

    static let sampleProofs = [
        ZKProofRecord(
            id: "proof_001",
            proofType: .wageAttestation,
            title: "Starbucks Wage Proof",
            subtitle: "Barista - 8.5 hours",
            amount: 153.00,
            status: .verified,
            progress: 1.0,
            circuitId: "wage_proof_v1",
            circuitVersion: "1.0.0",
            publicSignalsCount: 4,
            generationTime: 23.4,
            createdAt: Date().addingTimeInterval(-3600),
            verifiedAt: Date().addingTimeInterval(-3400)
        ),
        ZKProofRecord(
            id: "proof_002",
            proofType: .wageAttestation,
            title: "Amazon Warehouse Proof",
            subtitle: "Associate - 10 hours",
            amount: 220.00,
            status: .pending,
            progress: 1.0,
            circuitId: "wage_proof_v1",
            circuitVersion: "1.0.0",
            publicSignalsCount: 4,
            generationTime: 28.1,
            createdAt: Date().addingTimeInterval(-1800),
            verifiedAt: nil
        ),
        ZKProofRecord(
            id: "proof_003",
            proofType: .wageAttestation,
            title: "Uber Driver Proof",
            subtitle: "Driver - 6 hours",
            amount: 171.00,
            status: .generating,
            progress: 0.67,
            circuitId: "wage_proof_v1",
            circuitVersion: "1.0.0",
            publicSignalsCount: 4,
            generationTime: 0,
            createdAt: Date().addingTimeInterval(-300),
            verifiedAt: nil
        ),
        ZKProofRecord(
            id: "proof_004",
            proofType: .wageAttestation,
            title: "Previous Starbucks Shift",
            subtitle: "Barista - 7 hours",
            amount: 126.00,
            status: .verified,
            progress: 1.0,
            circuitId: "wage_proof_v1",
            circuitVersion: "1.0.0",
            publicSignalsCount: 4,
            generationTime: 19.8,
            createdAt: Date().addingTimeInterval(-86400),
            verifiedAt: Date().addingTimeInterval(-86200)
        )
    ]
}

enum ProofType {
    case wageAttestation
    case identityProof
    case workHistory

    var displayName: String {
        switch self {
        case .wageAttestation: return "Wage Attestation"
        case .identityProof: return "Identity Proof"
        case .workHistory: return "Work History"
        }
    }

    var iconName: String {
        switch self {
        case .wageAttestation: return "dollarsign.circle.fill"
        case .identityProof: return "person.badge.shield.checkmark.fill"
        case .workHistory: return "clock.arrow.circlepath"
        }
    }

    var color: SwiftUI.Color {
        switch self {
        case .wageAttestation: return StreamColors.streamGreen
        case .identityProof: return StreamColors.streamBlue
        case .workHistory: return StreamColors.streamOrange
        }
    }
}

enum ProofStatus {
    case generating
    case pending
    case verified
    case failed

    var displayName: String {
        switch self {
        case .generating: return "Generating"
        case .pending: return "Pending"
        case .verified: return "Verified"
        case .failed: return "Failed"
        }
    }

    var color: SwiftUI.Color {
        switch self {
        case .generating: return StreamColors.streamBlue
        case .pending: return StreamColors.warning
        case .verified: return StreamColors.success
        case .failed: return StreamColors.error
        }
    }
}
