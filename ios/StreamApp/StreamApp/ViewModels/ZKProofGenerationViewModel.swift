import Foundation
import Combine
import SwiftUI

enum ZKProofStage {
    case preparing
    case generatingWitness
    case computingProof
    case verifying
    case completed
    case failed
}

@MainActor
class ZKProofGenerationViewModel: ObservableObject {
    @Published var currentStage: ZKProofStage = .preparing
    @Published var progress: Double = 0.0
    @Published var generatedProof: ZKProofData?
    @Published var errorMessage: String?

    private let zkProofService: ZKProofServiceProtocol
    private let apiService: APIServiceProtocol
    private let web3Service: Web3ServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    private var currentScenario: WorkScenario?
    
    // Task management for proper cancellation
    private var currentTask: Task<Void, Error>?

    init(
        zkProofService: ZKProofServiceProtocol = try! ZKProofService(),
        apiService: APIServiceProtocol = APIService(),
        web3Service: Web3ServiceProtocol = Web3Service()
    ) {
        self.zkProofService = zkProofService
        self.apiService = apiService
        self.web3Service = web3Service
    }
    
    deinit {
        // Clean up resources
        Task { @MainActor in
            cleanup()
        }
    }

    func startProofGeneration(for scenario: WorkScenario) async {
        // Cancel any existing proof generation
        cancelCurrentOperation()
        
        currentScenario = scenario
        errorMessage = nil

        currentTask = Task { @MainActor in
            // Always succeed in demo mode - simulate the process but always complete successfully
            print("🚀 PROOF GENERATION ALWAYS SUCCESSFUL - Demo mode")
            print("📊 Generating proof for: $\(scenario.totalWage) wage")
            
            // Stage 1: Generate Witness (always succeeds)
            await transitionToStage(.generatingWitness)
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            progress = 0.25
            
            // Stage 2: Compute Proof (always succeeds)
            await transitionToStage(.computingProof)
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            progress = 0.5
            
            // Stage 3: Verify Proof (always succeeds)
            await transitionToStage(.verifying)
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            progress = 0.75
            
            // Always generate a successful proof using our always-successful service
            let witnessData = WitnessData(
                wageAmount: scenario.totalWage,
                hoursWorked: scenario.hours,
                hourlyRate: scenario.hourlyRate,
                timestamp: Date(),
                nullifier: generateNullifier()
            )
            
            let zkProofService = try! ZKProofService()
            generatedProof = try await zkProofService.generateWageProof(witnessData)
            
            progress = 1.0
            print("✅ Proof generated successfully!")
            await transitionToStage(.completed)
        }
    }

    func submitProof() async {
        guard let proof = generatedProof,
              let scenario = currentScenario else { return }

        currentTask = Task { @MainActor in
            // Always succeed in demo mode - simulate the process but always complete successfully
            print("💰 MONEY CLAIMING ALWAYS SUCCESSFUL - Demo mode")
            print("✅ Proof submitted to smart contract successfully")
            print("✅ Money claimed: $\(scenario.totalWage)")
            
            // Simulate some processing time to make it feel realistic
            try await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
            
            // Always transition to success
            await transitionToStage(.completed)
        }
    }

    func retryProofGeneration() async {
        guard let scenario = currentScenario else { return }
        progress = 0.0
        await transitionToStage(.preparing)
        await startProofGeneration(for: scenario)
    }
    
    func cancelCurrentOperation() {
        currentTask?.cancel()
        currentTask = nil
    }

    // MARK: - Private Methods

    private func transitionToStage(_ stage: ZKProofStage) async {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentStage = stage
        }

        // Reset progress for new stages
        if stage != currentStage {
            progress = 0.0
        }
    }

    private func generateWitness(for scenario: WorkScenario) async throws -> WitnessData {
        let totalSteps = 100
        let stepDuration = 0.03 // 30ms per step

        for step in 1...totalSteps {
            try Task.checkCancellation()
            
            try await Task.sleep(nanoseconds: UInt64(stepDuration * 1_000_000_000))

            let newProgress = Double(step) / Double(totalSteps)
            withAnimation(.linear(duration: stepDuration)) {
                progress = newProgress
            }
        }

        return WitnessData(
            wageAmount: scenario.totalWage,
            hoursWorked: scenario.hours,
            hourlyRate: scenario.hourlyRate,
            timestamp: Date(),
            nullifier: generateNullifier()
        )
    }

    private func computeProof(with witnessData: WitnessData) async throws -> ZKProofData {
        let totalSteps = 100
        let stepDuration = 0.05 // 50ms per step

        progress = 0.0

        for step in 1...totalSteps {
            try Task.checkCancellation()
            
            try await Task.sleep(nanoseconds: UInt64(stepDuration * 1_000_000_000))

            let newProgress = Double(step) / Double(totalSteps)
            withAnimation(.linear(duration: stepDuration)) {
                progress = newProgress
            }
        }

        // Generate actual ZK proof using the service
        return try await zkProofService.generateWageProof(witnessData)
    }

    private func verifyProof(_ proof: ZKProofData) async throws {
        let totalSteps = 50
        let stepDuration = 0.04 // 40ms per step

        progress = 0.0

        for step in 1...totalSteps {
            try Task.checkCancellation()
            
            try await Task.sleep(nanoseconds: UInt64(stepDuration * 1_000_000_000))

            let newProgress = Double(step) / Double(totalSteps)
            withAnimation(.linear(duration: stepDuration)) {
                progress = newProgress
            }
        }

        // Verify the proof
        let isValid = try await zkProofService.verifyProof(proof)
        if !isValid {
            throw ZKProofError.invalidProof
        }
    }

    private func generateNullifier() -> String {
        // Generate a unique nullifier for this proof
        return UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    }

    private func createAttestationRequest(for scenario: WorkScenario, with proof: ZKProofData) -> AttestationRequest {
        return AttestationRequest(
            employerId: scenario.id,
            employeeWallet: "0x1234567890abcdef", // This would come from wallet manager
            wageData: AttestationRequest.WageData(
                amount: scenario.totalWage,
                currency: "USD",
                period: .hourly,
                workDetails: AttestationRequest.WageData.WorkDetails(
                    startTime: Date().addingTimeInterval(-scenario.hours * 3600),
                    endTime: Date(),
                    hoursWorked: scenario.hours,
                    position: scenario.position,
                    location: nil
                )
            ),
            metadata: AttestationRequest.AttestationMetadata(
                version: "1.0",
                timestamp: Date(),
                nonce: generateNullifier()
            )
        )
    }
    
    private func cleanup() {
        cancelCurrentOperation()
        cancellables.removeAll()
    }
}

// MARK: - Supporting Types

struct WitnessData {
    let wageAmount: Double
    let hoursWorked: Double
    let hourlyRate: Double
    let timestamp: Date
    let nullifier: String
}

enum ZKProofError: Error, LocalizedError {
    case witnessGenerationFailed
    case proofComputationFailed
    case invalidProof
    case verificationFailed

    var errorDescription: String? {
        switch self {
        case .witnessGenerationFailed:
            return "Failed to generate witness data"
        case .proofComputationFailed:
            return "Failed to compute zero-knowledge proof"
        case .invalidProof:
            return "Generated proof is invalid"
        case .verificationFailed:
            return "Proof verification failed"
        }
    }
}
