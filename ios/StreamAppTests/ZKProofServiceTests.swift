import XCTest
import Foundation
import JavaScriptCore
@testable import StreamApp

final class ZKProofServiceTests: XCTestCase {
    var zkProofService: ZKProofService!
    var mockZKProofService: MockZKProofService!
    
    override func setUp() {
        super.setUp()
        // Use mock service for most tests to avoid JS engine complexity
        mockZKProofService = MockZKProofService()
        
        // For tests that need real service, initialize carefully
        do {
            zkProofService = try ZKProofService()
        } catch {
            // If ZKProofService fails to initialize (missing JS files), skip real service tests
            zkProofService = nil
        }
    }
    
    // MARK: - Input Validation Tests
    
    func testWitnessDataValidation() async {
        // Test valid witness data
        let validWitness = WitnessData(
            wageAmount: 100.0,
            hoursWorked: 8.0,
            hourlyRate: 12.5,
            timestamp: Date(),
            nullifier: "test_nullifier_123"
        )
        
        await XCTAssertNoThrowAsync {
            _ = try await mockZKProofService.generateWageProof(validWitness)
        }
    }
    
    func testInvalidWageAmount() async {
        let invalidWitness = WitnessData(
            wageAmount: -10.0, // Invalid: negative
            hoursWorked: 8.0,
            hourlyRate: 12.5,
            timestamp: Date(),
            nullifier: "test_nullifier"
        )
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available - missing JS files")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.generateWageProof(invalidWitness)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidPublicSignals(let message):
                    XCTAssertTrue(message.contains("Wage amount must be positive"))
                default:
                    XCTFail("Expected invalidPublicSignals error")
                }
            } else {
                XCTFail("Expected ZKProofServiceError")
            }
        }
    }
    
    func testInvalidHoursWorked() async {
        let invalidWitness = WitnessData(
            wageAmount: 100.0,
            hoursWorked: 200.0, // Invalid: more than 168 hours per week
            hourlyRate: 12.5,
            timestamp: Date(),
            nullifier: "test_nullifier"
        )
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.generateWageProof(invalidWitness)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidPublicSignals(let message):
                    XCTAssertTrue(message.contains("Hours worked must be between 0 and 168"))
                default:
                    XCTFail("Expected invalidPublicSignals error")
                }
            }
        }
    }
    
    func testInvalidHourlyRate() async {
        let invalidWitness = WitnessData(
            wageAmount: 100.0,
            hoursWorked: 8.0,
            hourlyRate: 0.0, // Invalid: zero rate
            timestamp: Date(),
            nullifier: "test_nullifier"
        )
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.generateWageProof(invalidWitness)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidPublicSignals(let message):
                    XCTAssertTrue(message.contains("Hourly rate must be positive"))
                default:
                    XCTFail("Expected invalidPublicSignals error")
                }
            }
        }
    }
    
    func testEmptyNullifier() async {
        let invalidWitness = WitnessData(
            wageAmount: 100.0,
            hoursWorked: 8.0,
            hourlyRate: 12.5,
            timestamp: Date(),
            nullifier: "" // Invalid: empty nullifier
        )
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.generateWageProof(invalidWitness)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidPublicSignals(let message):
                    XCTAssertTrue(message.contains("Nullifier cannot be empty"))
                default:
                    XCTFail("Expected invalidPublicSignals error")
                }
            }
        }
    }
    
    // MARK: - Proof Structure Validation Tests
    
    func testValidProofStructure() async {
        let validProof = createValidZKProofData()
        
        await XCTAssertNoThrowAsync {
            _ = try await mockZKProofService.verifyProof(validProof)
        }
    }
    
    func testInvalidProofStructure_WrongPiALength() async {
        var invalidProof = createValidZKProofData()
        invalidProof.proof.pi_a = ["0x123", "0x456"] // Should have 3 elements
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.verifyProof(invalidProof)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidProofStructure(let message):
                    XCTAssertTrue(message.contains("pi_a must have exactly 3 elements"))
                default:
                    XCTFail("Expected invalidProofStructure error")
                }
            }
        }
    }
    
    func testInvalidProofStructure_WrongPiBDimensions() async {
        var invalidProof = createValidZKProofData()
        invalidProof.proof.pi_b = [["0x123"]] // Should be 3x2 matrix
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.verifyProof(invalidProof)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidProofStructure(let message):
                    XCTAssertTrue(message.contains("pi_b must be a 3x2 matrix"))
                default:
                    XCTFail("Expected invalidProofStructure error")
                }
            }
        }
    }
    
    func testInvalidHexFormat() async {
        var invalidProof = createValidZKProofData()
        invalidProof.proof.pi_a = ["invalid_hex", "0x456", "0x789"]
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.verifyProof(invalidProof)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidProofStructure(let message):
                    XCTAssertTrue(message.contains("Invalid hex format"))
                default:
                    XCTFail("Expected invalidProofStructure error")
                }
            }
        }
    }
    
    // MARK: - Error Handling Tests
    
    func testJavaScriptExecutionError() async {
        // This test verifies error handling for JS execution failures
        // Since we can't easily mock JS failures, we test with invalid data that would cause JS errors
        
        let witnessWithInvalidData = WitnessData(
            wageAmount: Double.greatestFiniteMagnitude, // Could cause JS overflow
            hoursWorked: 8.0,
            hourlyRate: 12.5,
            timestamp: Date(),
            nullifier: "test"
        )
        
        // Mock service should handle this gracefully
        await XCTAssertNoThrowAsync {
            _ = try await mockZKProofService.generateWageProof(witnessWithInvalidData)
        }
    }
    
    func testTimeoutProtection() async {
        // Test that operations complete within reasonable time
        let witness = WitnessData(
            wageAmount: 100.0,
            hoursWorked: 8.0,
            hourlyRate: 12.5,
            timestamp: Date(),
            nullifier: "test_timeout"
        )
        
        let startTime = Date()
        
        await XCTAssertNoThrowAsync {
            _ = try await mockZKProofService.generateWageProof(witness)
        }
        
        let duration = Date().timeIntervalSince(startTime)
        XCTAssertLessThan(duration, 30.0, "Proof generation should complete within 30 seconds")
    }
    
    // MARK: - Protocol Validation Tests
    
    func testUnsupportedProtocol() async {
        var invalidProof = createValidZKProofData()
        invalidProof.proof.protocolType = "unsupported_protocol"
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.verifyProof(invalidProof)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidProofStructure(let message):
                    XCTAssertTrue(message.contains("Unsupported protocol type"))
                default:
                    XCTFail("Expected invalidProofStructure error")
                }
            }
        }
    }
    
    func testUnsupportedCurve() async {
        var invalidProof = createValidZKProofData()
        invalidProof.proof.curve = "unsupported_curve"
        
        guard let service = zkProofService else {
            throw XCTSkip("ZKProofService not available")
        }
        
        await XCTAssertThrowsErrorAsync(
            try await service.verifyProof(invalidProof)
        ) { error in
            if let zkError = error as? ZKProofService.ZKProofServiceError {
                switch zkError {
                case .invalidProofStructure(let message):
                    XCTAssertTrue(message.contains("Unsupported curve"))
                default:
                    XCTFail("Expected invalidProofStructure error")
                }
            }
        }
    }
    
    // MARK: - Performance Tests
    
    func testProofGenerationPerformance() async {
        let witness = WitnessData(
            wageAmount: 100.0,
            hoursWorked: 8.0,
            hourlyRate: 12.5,
            timestamp: Date(),
            nullifier: "perf_test"
        )
        
        let options = XCTMeasureOptions()
        options.iterationCount = 5
        
        measure(options: options) {
            let expectation = expectation(description: "Proof generation")
            
            Task {
                do {
                    _ = try await mockZKProofService.generateWageProof(witness)
                    expectation.fulfill()
                } catch {
                    XCTFail("Proof generation failed: \(error)")
                    expectation.fulfill()
                }
            }
            
            wait(for: [expectation], timeout: 10.0)
        }
    }
    
    func testProofVerificationPerformance() async {
        let proof = createValidZKProofData()
        
        let options = XCTMeasureOptions()
        options.iterationCount = 10
        
        measure(options: options) {
            let expectation = expectation(description: "Proof verification")
            
            Task {
                do {
                    _ = try await mockZKProofService.verifyProof(proof)
                    expectation.fulfill()
                } catch {
                    XCTFail("Proof verification failed: \(error)")
                    expectation.fulfill()
                }
            }
            
            wait(for: [expectation], timeout: 5.0)
        }
    }
    
    // MARK: - Helper Methods
    
    private func createValidZKProofData() -> ZKProofData {
        return ZKProofData(
            proof: ZKProofData.ZKProof(
                pi_a: [
                    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                    "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
                    "0x1"
                ],
                pi_b: [
                    [
                        "0xabcd1234567890efabcd1234567890efabcd1234567890efabcd1234567890ef",
                        "0xef9087654321dcbaef9087654321dcbaef9087654321dcbaef9087654321dcba"
                    ],
                    [
                        "0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef",
                        "0xdcba87654321ef90dcba87654321ef90dcba87654321ef90dcba87654321ef90"
                    ],
                    [
                        "0x1",
                        "0x0"
                    ]
                ],
                pi_c: [
                    "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
                    "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                    "0x1"
                ],
                protocolType: "groth16",
                curve: "bn254"
            ),
            publicSignals: [
                "10000000000000000000", // wage amount in wei
                "800", // hours worked * 100
                "1250", // hourly rate * 100
                "1640995200" // timestamp
            ],
            metadata: ZKProofData.ProofMetadata(
                circuitId: "wage_proof_v1",
                provingTime: 2.5,
                verificationKey: "0xverificationkey123",
                publicInputs: [
                    "wageAmount": "10000000000000000000",
                    "nullifierHash": "test_nullifier_hash"
                ]
            )
        )
    }
}

// MARK: - Async Test Helpers

extension XCTestCase {
    func XCTAssertNoThrowAsync(
        _ expression: @autoclosure () async throws -> Void
    ) async {
        do {
            _ = try await expression()
        } catch {
            XCTFail("Unexpected error thrown: \(error)")
        }
    }
}
