/**
 * ZK Proof Service - SnarkJS Integration for Stream Protocol
 *
 * This service provides a high-level interface for generating and verifying
 * wage attestation proofs using the WageProof ZK circuit.
 */

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { poseidon } = require('circomlib');

class WageProofService {
    constructor(buildDir = null) {
        this.buildDir = buildDir || path.join(__dirname, '../build');
        this.circuitName = 'wage_proof';

        // File paths
        this.wasmPath = path.join(this.buildDir, `${this.circuitName}_js`, `${this.circuitName}.wasm`);
        this.zkeyPath = path.join(this.buildDir, `${this.circuitName}_final.zkey`);
        this.vkeyPath = path.join(this.buildDir, 'verification_key.json');

        // Cache for loaded circuit artifacts
        this.circuitCache = {
            wasm: null,
            zkey: null,
            vkey: null
        };
    }

    /**
     * Initialize the service by loading circuit artifacts
     */
    async initialize() {
        try {
            // Check if all required files exist
            const requiredFiles = [this.wasmPath, this.zkeyPath, this.vkeyPath];
            for (const file of requiredFiles) {
                if (!fs.existsSync(file)) {
                    throw new Error(`Required circuit file not found: ${file}`);
                }
            }

            // Load verification key
            this.circuitCache.vkey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'));

            console.log(' WageProofService initialized successfully');
            return true;

        } catch (error) {
            console.error(' Failed to initialize WageProofService:', error.message);
            throw error;
        }
    }

    /**
     * Generate cryptographic commitments and nullifiers
     */
    generateCommitments(employeeSecret, employerID, periodID, periodNonce, wageAmount) {
        // Generate nullifier hash (prevents double-spending)
        const nullifierHash = poseidon([
            BigInt(employeeSecret),
            BigInt(employerID),
            BigInt(periodID),
            BigInt(periodNonce)
        ]);

        // Generate wage commitment (hides exact amount)
        const wageCommitment = poseidon([
            BigInt(wageAmount),
            BigInt(employeeSecret),
            BigInt(periodNonce)
        ]);

        return {
            nullifierHash: nullifierHash.toString(),
            wageCommitment: wageCommitment.toString()
        };
    }

    /**
     * Generate employer public key hash from private key
     * Note: This is a simplified implementation for demo purposes
     */
    generateEmployerPubKeyHash(employerPrivKey) {
        // Simplified elliptic curve point derivation
        const privKeyBigInt = BigInt(employerPrivKey);
        const pubKeyX = privKeyBigInt * privKeyBigInt; // Simplified - use proper EC math in production
        const pubKeyY = privKeyBigInt + BigInt(1);     // Simplified - use proper EC math in production

        return poseidon([pubKeyX, pubKeyY]).toString();
    }

    /**
     * Generate ECDSA signature for attestation data
     * Note: This is a mock implementation for demo purposes
     */
    generateAttestationSignature(attestationData, employerPrivKey) {
        // In production, this would be proper ECDSA signing
        // For demo, we'll generate deterministic mock signatures
        const hash = crypto.createHash('sha256')
            .update(JSON.stringify(attestationData) + employerPrivKey)
            .digest('hex');

        return {
            r: BigInt('0x' + hash.slice(0, 32)).toString(),
            s: BigInt('0x' + hash.slice(32, 64)).toString()
        };
    }

    /**
     * Prepare circuit inputs from attestation data
     */
    prepareCircuitInputs(attestationData, employeeSecret, periodNonce) {
        const {
            employerPrivKey,
            employerID,
            employeeWallet,
            wageAmount,
            periodID,
            timestamp,
            minWageThreshold,
            maxWageThreshold
        } = attestationData;

        // Generate commitments
        const { nullifierHash, wageCommitment } = this.generateCommitments(
            employeeSecret,
            employerID,
            periodID,
            periodNonce,
            wageAmount
        );

        // Generate employer public key hash
        const employerPubKeyHash = this.generateEmployerPubKeyHash(employerPrivKey);

        // Generate mock ECDSA signature
        const signature = this.generateAttestationSignature(attestationData, employerPrivKey);

        return {
            // Private inputs (witness)
            employerPrivKey: employerPrivKey.toString(),
            r: signature.r,
            s: signature.s,
            employeeSecret: employeeSecret.toString(),
            wageAmount: wageAmount.toString(),
            periodNonce: periodNonce.toString(),
            employerID: employerID.toString(),
            employeeWallet: employeeWallet,
            periodID: periodID.toString(),
            timestamp: timestamp.toString(),

            // Public inputs
            nullifierHash: nullifierHash,
            wageCommitment: wageCommitment,
            employerPubKeyHash: employerPubKeyHash,
            minWageThreshold: minWageThreshold.toString(),
            maxWageThreshold: maxWageThreshold.toString()
        };
    }

    /**
     * Generate a ZK proof for wage attestation
     */
    async generateProof(attestationData, employeeSecret, periodNonce = null) {
        try {
            // Generate random nonce if not provided
            if (!periodNonce) {
                periodNonce = crypto.randomInt(1, 1000000);
            }

            console.log('🔧 Preparing circuit inputs...');
            const inputs = this.prepareCircuitInputs(attestationData, employeeSecret, periodNonce);

            console.log('🧮 Calculating witness...');
            const startWitness = Date.now();
            const { witness } = await snarkjs.wtns.calculate(inputs, this.wasmPath);
            const witnessTime = Date.now() - startWitness;

            console.log('🔐 Generating proof...');
            const startProof = Date.now();
            const { proof, publicSignals } = await snarkjs.groth16.prove(this.zkeyPath, witness);
            const proofTime = Date.now() - startProof;

            const totalTime = witnessTime + proofTime;
            console.log(` Proof generated successfully in ${totalTime}ms`);
            console.log(`  - Witness calculation: ${witnessTime}ms`);
            console.log(`  - Proof generation: ${proofTime}ms`);

            // Format proof for easy transmission
            const formattedProof = {
                proof: {
                    pi_a: [proof.pi_a[0], proof.pi_a[1]],
                    pi_b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
                    pi_c: [proof.pi_c[0], proof.pi_c[1]]
                },
                publicSignals: publicSignals,
                metadata: {
                    nullifierHash: inputs.nullifierHash,
                    wageCommitment: inputs.wageCommitment,
                    employerPubKeyHash: inputs.employerPubKeyHash,
                    periodNonce: periodNonce,
                    generationTime: totalTime,
                    timestamp: Date.now()
                }
            };

            return formattedProof;

        } catch (error) {
            console.error(' Proof generation failed:', error.message);
            throw new Error(`Proof generation failed: ${error.message}`);
        }
    }

    /**
     * Verify a ZK proof
     */
    async verifyProof(proof, publicSignals = null) {
        try {
            console.log('🔍 Verifying proof...');
            const startTime = Date.now();

            // Extract public signals if they're embedded in the proof object
            if (!publicSignals && proof.publicSignals) {
                publicSignals = proof.publicSignals;
            }

            // Extract the core proof if it's wrapped
            const coreProof = proof.proof || proof;

            const isValid = await snarkjs.groth16.verify(this.circuitCache.vkey, publicSignals, coreProof);
            const verificationTime = Date.now() - startTime;

            console.log(` Proof verification completed in ${verificationTime}ms`);
            console.log(`  Result: ${isValid ? 'VALID' : 'INVALID'}`);

            return {
                isValid,
                verificationTime,
                publicSignals: publicSignals
            };

        } catch (error) {
            console.error(' Proof verification failed:', error.message);
            throw new Error(`Proof verification failed: ${error.message}`);
        }
    }

    /**
     * Validate attestation data format and constraints
     */
    validateAttestationData(attestationData) {
        const required = [
            'employerPrivKey', 'employerID', 'employeeWallet',
            'wageAmount', 'periodID', 'timestamp',
            'minWageThreshold', 'maxWageThreshold'
        ];

        for (const field of required) {
            if (!attestationData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate wage amount is within bounds
        const wage = BigInt(attestationData.wageAmount);
        const minWage = BigInt(attestationData.minWageThreshold);
        const maxWage = BigInt(attestationData.maxWageThreshold);

        if (wage < minWage || wage > maxWage) {
            throw new Error(`Wage amount ${wage} is outside valid range [${minWage}, ${maxWage}]`);
        }

        // Validate timestamp is reasonable
        const timestamp = parseInt(attestationData.timestamp);
        const now = Math.floor(Date.now() / 1000);
        const maxFuture = now + 86400; // 1 day in future
        const maxPast = now - (86400 * 30); // 30 days in past

        if (timestamp > maxFuture || timestamp < maxPast) {
            throw new Error(`Timestamp ${timestamp} is outside reasonable range`);
        }

        return true;
    }

    /**
     * Create a complete wage proof (validate + generate)
     */
    async createWageProof(attestationData, employeeSecret, periodNonce = null) {
        try {
            // Validate input data
            this.validateAttestationData(attestationData);

            // Generate proof
            const proof = await this.generateProof(attestationData, employeeSecret, periodNonce);

            // Verify proof as sanity check
            const verification = await this.verifyProof(proof);

            if (!verification.isValid) {
                throw new Error('Generated proof failed verification');
            }

            return {
                proof,
                verification,
                success: true
            };

        } catch (error) {
            console.error(' Wage proof creation failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract public information from a proof
     */
    extractProofInfo(proof) {
        if (!proof.metadata) {
            return null;
        }

        return {
            nullifierHash: proof.metadata.nullifierHash,
            wageCommitment: proof.metadata.wageCommitment,
            employerPubKeyHash: proof.metadata.employerPubKeyHash,
            periodNonce: proof.metadata.periodNonce,
            timestamp: proof.metadata.timestamp,
            generationTime: proof.metadata.generationTime
        };
    }

    /**
     * Check if a nullifier has been used (prevent double-spending)
     */
    async checkNullifierUsed(nullifierHash, usedNullifiers = new Set()) {
        return usedNullifiers.has(nullifierHash);
    }

    /**
     * Get service status and statistics
     */
    getStatus() {
        return {
            initialized: this.circuitCache.vkey !== null,
            buildDir: this.buildDir,
            circuitName: this.circuitName,
            files: {
                wasm: fs.existsSync(this.wasmPath),
                zkey: fs.existsSync(this.zkeyPath),
                vkey: fs.existsSync(this.vkeyPath)
            }
        };
    }
}

module.exports = WageProofService;