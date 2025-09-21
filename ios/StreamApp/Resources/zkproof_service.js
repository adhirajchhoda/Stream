// Mock ZK Proof Service for Development
// This provides a functional mock implementation for testing the iOS app
// without requiring actual zero-knowledge circuit implementations

class MockZKProofService {
    constructor() {
        this.isInitialized = false;
        this.mockDelay = {
            initialization: 1000,
            proofGeneration: 2000,
            verification: 500
        };
    }

    async initialize() {
        console.log("Initializing Mock ZK Proof Service...");

        // Simulate initialization delay
        await this.delay(this.mockDelay.initialization);

        this.isInitialized = true;
        console.log("Mock ZK Proof Service initialized successfully");
        return true;
    }

    async generateWageProof(wageData, employerSignature, privateKey) {
        if (!this.isInitialized) {
            throw new Error("ZK Proof service not initialized. Call initialize() first.");
        }

        console.log("Generating mock wage proof...");
        console.log("Wage data:", wageData);

        // Validate inputs
        if (!wageData || !employerSignature || !privateKey) {
            throw new Error("Missing required parameters for proof generation");
        }

        // Simulate proof generation time (realistic delay)
        await this.delay(this.mockDelay.proofGeneration);

        // Generate mock proof structure (Groth16 format) - CORRECTED
        const proof = {
            pi_a: [
                "0x" + this.randomHex(64),
                "0x" + this.randomHex(64),
                "0x" + this.randomHex(64)  // Fixed: Groth16 requires 3 elements
            ],
            pi_b: [
                ["0x" + this.randomHex(64), "0x" + this.randomHex(64)],
                ["0x" + this.randomHex(64), "0x" + this.randomHex(64)],
                ["0x" + this.randomHex(64), "0x" + this.randomHex(64)]  // Fixed: Groth16 requires 3x2 matrix
            ],
            pi_c: [
                "0x" + this.randomHex(64),
                "0x" + this.randomHex(64),
                "0x" + this.randomHex(64)  // Fixed: Groth16 requires 3 elements
            ],
            protocolType: "groth16",  // Added: Required field
            curve: "bn254",          // Added: Required field
            publicSignals: [
                this.hashHourlyRate(wageData.hourlyRate).toString(),
                wageData.hoursWorked.toString(),
                this.hashEmployer(employerSignature),
                this.generateNullifier(privateKey, wageData.timestamp)
            ]
        };

        const result = {
            proof: {
                pi_a: proof.pi_a,
                pi_b: proof.pi_b,
                pi_c: proof.pi_c,
                protocolType: proof.protocolType,
                curve: proof.curve
            },
            publicSignals: proof.publicSignals,
            metadata: {
                circuitId: "wage_proof_v1",
                provingTime: this.mockDelay.proofGeneration / 1000,
                verificationKey: "0x" + this.randomHex(128),
                publicInputs: {
                    "wageAmount": proof.publicSignals[0],
                    "hoursWorked": proof.publicSignals[1],
                    "hourlyRate": proof.publicSignals[0], 
                    "timestamp": Date.now().toString()
                }
            },
            nullifierHash: proof.publicSignals[3],
            proofHash: this.generateProofHash(proof),
            timestamp: Date.now()
        };

        console.log("Mock proof generated successfully");
        console.log("Nullifier hash:", result.nullifierHash);

        return result;
    }

    async verifyProof(proof, publicSignals) {
        console.log("Verifying mock proof...");

        // Simulate verification time
        await this.delay(this.mockDelay.verification);

        // Basic structure validation
        if (!proof || !proof.pi_a || !proof.pi_b || !proof.pi_c) {
            return {
                isValid: false,
                errorMessage: "Invalid proof structure"
            };
        }

        if (!publicSignals || publicSignals.length !== 4) {
            return {
                isValid: false,
                errorMessage: "Invalid public signals length"
            };
        }

        // Mock verification (always returns true for development)
        // In production, this would validate the actual ZK proof
        const result = {
            isValid: true,
            errorMessage: null,
            verificationTime: this.mockDelay.verification
        };

        console.log("Mock proof verification completed:", result.isValid);
        return result;
    }

    // Utility Methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    randomHex(length) {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }

    hashHourlyRate(rate) {
        // In production, this would be a proper hash
        // For mock, return a deterministic value based on rate
        return Math.floor(rate * 1000) % 1000000;
    }

    hashEmployer(signature) {
        // Simple hash simulation for employer verification
        let hash = 0;
        for (let i = 0; i < signature.length; i++) {
            const char = signature.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return "0x" + Math.abs(hash).toString(16).padStart(16, '0') + this.randomHex(48);
    }

    generateNullifier(privateKey, timestamp) {
        // Generate deterministic nullifier for anti-replay protection
        // In production, this would use proper cryptographic hashing
        const combined = privateKey + timestamp.toString();
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return "0x" + Math.abs(hash).toString(16).padStart(16, '0') + this.randomHex(48);
    }

    generateProofHash(proof) {
        // Generate a hash representing the entire proof
        const proofString = JSON.stringify(proof);
        let hash = 0;
        for (let i = 0; i < proofString.length; i++) {
            const char = proofString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return "0x" + Math.abs(hash).toString(16).padStart(64, '0');
    }

    // Circuit Information
    getCircuitInfo() {
        return {
            name: "MockWageProofCircuit",
            version: "0.1.0",
            description: "Mock implementation for testing",
            publicInputCount: 4,
            privateInputCount: 3,
            constraintCount: 1000, // Mock constraint count
            supportedCurves: ["bn128"],
            provingSystem: "groth16"
        };
    }
}

// Global instance
const zkProofService = new MockZKProofService();

// Swift Bridge Functions
// These functions are called from Swift code via JavaScriptCore

function initializeZKProof() {
    console.log("Swift bridge: initializeZKProof called");
    return zkProofService.initialize();
}

function generateWageProof(inputs) {
    console.log("Swift bridge: generateWageProof called");
    console.log("Inputs:", inputs);

    try {
        // Convert inputs to the expected format
        const wageData = {
            hourlyRate: parseFloat(inputs.hourlyRate) / 100, // Convert back from cents
            hoursWorked: parseFloat(inputs.hoursWorked) / 100, // Convert back from cents
            wageAmount: parseFloat(inputs.wageAmount) / 100, // Convert back from cents
            timestamp: parseInt(inputs.timestamp)
        };
        
        // Generate mock employer signature and private key for demo
        const mockEmployerSignature = "0x" + Math.random().toString(16).substring(2, 66);
        const mockPrivateKey = inputs.nullifier || "0x" + Math.random().toString(16).substring(2, 66);
        
        return zkProofService.generateWageProof(wageData, mockEmployerSignature, mockPrivateKey);
    } catch (error) {
        console.error("Error generating wage proof:", error);
        throw error;
    }
}

// Keep the old function for backward compatibility
function generateProof(wageDataJSON, employerSignature, privateKey) {
    console.log("Swift bridge: generateProof called (deprecated)");
    console.log("Wage data JSON:", wageDataJSON);

    try {
        const wageData = JSON.parse(wageDataJSON);
        return zkProofService.generateWageProof(wageData, employerSignature, privateKey);
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}

function verifyProof(proofJSON, publicSignalsJSON) {
    console.log("Swift bridge: verifyProof called");

    try {
        const proof = JSON.parse(proofJSON);
        const publicSignals = JSON.parse(publicSignalsJSON);
        return zkProofService.verifyProof(proof, publicSignals);
    } catch (error) {
        console.error("Error verifying proof:", error);
        throw error;
    }
}

function getCircuitInfo() {
    console.log("Swift bridge: getCircuitInfo called");
    return zkProofService.getCircuitInfo();
}

// Health check function for Swift to verify JavaScript is loaded
function healthCheck() {
    return {
        status: "healthy",
        service: "MockZKProofService",
        timestamp: Date.now(),
        initialized: zkProofService.isInitialized
    };
}

// Export functions for testing (if running in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MockZKProofService,
        initializeZKProof,
        generateProof,
        verifyProof,
        getCircuitInfo,
        healthCheck
    };
}

console.log("Mock ZK Proof Service JavaScript loaded successfully");