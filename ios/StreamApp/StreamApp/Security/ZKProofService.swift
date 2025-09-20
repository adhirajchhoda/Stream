import Foundation
import JavaScriptCore

protocol ZKProofServiceProtocol {
    func generateWageProof(_ data: WitnessData) async throws -> ZKProofData
    func verifyProof(_ proof: ZKProofData) async throws -> Bool
}

class ZKProofService: ZKProofServiceProtocol {
    private let jsContext: JSContext
    private let circuitWasm: Data?
    private let verificationKey: Data?

    init() {
        self.jsContext = JSContext()
        self.circuitWasm = loadCircuitWasm()
        self.verificationKey = loadVerificationKey()

        setupJavaScriptEnvironment()
    }

    func generateWageProof(_ data: WitnessData) async throws -> ZKProofData {
        return try await withCheckedThrowingContinuation { continuation in
            // Prepare input data for the circuit
            let circuitInputs = [
                "wageAmount": String(Int(data.wageAmount * 100)), // Convert to cents
                "hoursWorked": String(Int(data.hoursWorked * 100)), // Convert to hundredths
                "hourlyRate": String(Int(data.hourlyRate * 100)), // Convert to cents
                "timestamp": String(Int(data.timestamp.timeIntervalSince1970)),
                "nullifier": data.nullifier
            ]

            // Generate proof using JavaScript context
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let proof = try self.generateProofInJS(inputs: circuitInputs)
                    continuation.resume(returning: proof)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    func verifyProof(_ proof: ZKProofData) async throws -> Bool {
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let isValid = try self.verifyProofInJS(proof: proof)
                    continuation.resume(returning: isValid)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    // MARK: - Private Methods

    private func setupJavaScriptEnvironment() {
        // Load the ZK proof generation JavaScript
        guard let jsPath = Bundle.main.path(forResource: "zkproof_service", ofType: "js"),
              let jsContent = try? String(contentsOfFile: jsPath) else {
            print("Warning: Could not load zkproof_service.js")
            return
        }

        jsContext.evaluateScript(jsContent)

        // Add console.log support for debugging
        let logFunction: @convention(block) (String) -> Void = { message in
            print("JS: \(message)")
        }
        jsContext.setObject(logFunction, forKeyedSubscript: "log" as NSString)

        // Add error handling
        jsContext.exceptionHandler = { context, exception in
            print("JS Exception: \(exception?.toString() ?? "Unknown error")")
        }
    }

    private func generateProofInJS(inputs: [String: String]) throws -> ZKProofData {
        // Convert inputs to JavaScript object
        let inputsJSON = try JSONSerialization.data(withJSONObject: inputs)
        let inputsString = String(data: inputsJSON, encoding: .utf8)!

        // Call JavaScript function to generate proof
        let script = """
            (function() {
                try {
                    const inputs = \(inputsString);
                    const result = generateWageProof(inputs);
                    return JSON.stringify(result);
                } catch (error) {
                    throw new Error('Proof generation failed: ' + error.message);
                }
            })()
        """

        guard let result = jsContext.evaluateScript(script),
              let resultString = result.toString(),
              let resultData = resultString.data(using: .utf8) else {
            throw ZKProofError.proofComputationFailed
        }

        // Parse the result into ZKProofData
        return try parseZKProofData(from: resultData)
    }

    private func verifyProofInJS(proof: ZKProofData) throws -> Bool {
        // Convert proof to JavaScript object
        let encoder = JSONEncoder()
        let proofData = try encoder.encode(proof)
        let proofString = String(data: proofData, encoding: .utf8)!

        // Call JavaScript function to verify proof
        let script = """
            (function() {
                try {
                    const proof = \(proofString);
                    return verifyWageProof(proof);
                } catch (error) {
                    throw new Error('Proof verification failed: ' + error.message);
                }
            })()
        """

        guard let result = jsContext.evaluateScript(script),
              result.toBool() != nil else {
            throw ZKProofError.verificationFailed
        }

        return result.toBool()
    }

    private func parseZKProofData(from data: Data) throws -> ZKProofData {
        let decoder = JSONDecoder()

        // For demo purposes, create a mock proof structure
        // In production, this would parse the actual JavaScript result
        return ZKProofData(
            proof: ZKProofData.ZKProof(
                pi_a: ["0x123...", "0x456...", "0x1"],
                pi_b: [["0x789...", "0xabc..."], ["0xdef...", "0x012..."], ["0x1", "0x0"]],
                pi_c: ["0x345...", "0x678...", "0x1"],
                protocol: "groth16",
                curve: "bn254"
            ),
            publicSignals: [
                "12345678901234567890", // Wage amount in wei
                "850", // Hours worked * 100
                "1800", // Hourly rate * 100
                String(Int(Date().timeIntervalSince1970)) // Timestamp
            ],
            metadata: ZKProofData.ProofMetadata(
                circuitId: "wage_proof_v1",
                provingTime: Double.random(in: 15...30),
                verificationKey: "0xverificationkey...",
                publicInputs: [
                    "wageAmount": "12345678901234567890",
                    "nullifierHash": "0xnullifier..."
                ]
            )
        )
    }

    private func loadCircuitWasm() -> Data? {
        guard let wasmPath = Bundle.main.path(forResource: "wage_proof", ofType: "wasm") else {
            print("Warning: Could not find wage_proof.wasm in bundle")
            return nil
        }

        return try? Data(contentsOf: URL(fileURLWithPath: wasmPath))
    }

    private func loadVerificationKey() -> Data? {
        guard let vkeyPath = Bundle.main.path(forResource: "verification_key", ofType: "json") else {
            print("Warning: Could not find verification_key.json in bundle")
            return nil
        }

        return try? Data(contentsOf: URL(fileURLWithPath: vkeyPath))
    }
}

// MARK: - Fallback/Mock Implementation

class MockZKProofService: ZKProofServiceProtocol {
    func generateWageProof(_ data: WitnessData) async throws -> ZKProofData {
        // Simulate proof generation time
        try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds

        return ZKProofData(
            proof: ZKProofData.ZKProof(
                pi_a: [generateRandomHex(), generateRandomHex(), "0x1"],
                pi_b: [
                    [generateRandomHex(), generateRandomHex()],
                    [generateRandomHex(), generateRandomHex()],
                    ["0x1", "0x0"]
                ],
                pi_c: [generateRandomHex(), generateRandomHex(), "0x1"],
                protocol: "groth16",
                curve: "bn254"
            ),
            publicSignals: [
                String(Int(data.wageAmount * 1e18)), // Convert to wei
                String(Int(data.hoursWorked * 100)),
                String(Int(data.hourlyRate * 100)),
                String(Int(data.timestamp.timeIntervalSince1970))
            ],
            metadata: ZKProofData.ProofMetadata(
                circuitId: "wage_proof_v1_mock",
                provingTime: Double.random(in: 1.5...3.0),
                verificationKey: generateRandomHex(),
                publicInputs: [
                    "wageAmount": String(Int(data.wageAmount * 1e18)),
                    "nullifierHash": data.nullifier
                ]
            )
        )
    }

    func verifyProof(_ proof: ZKProofData) async throws -> Bool {
        // Simulate verification time
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds

        // Mock verification always succeeds for demo
        return true
    }

    private func generateRandomHex() -> String {
        let bytes = (0..<32).map { _ in UInt8.random(in: 0...255) }
        return "0x" + bytes.map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - JavaScript Bridge Utilities

extension JSContext {
    func callFunction(_ functionName: String, withArguments arguments: [Any]) -> JSValue? {
        guard let function = objectForKeyedSubscript(functionName) else {
            return nil
        }
        return function.call(withArguments: arguments)
    }
}