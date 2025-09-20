#!/usr/bin/env node

/**
 * Usage Example for Stream Protocol ZK Wage Proof System
 *
 * This example demonstrates how to use the WageProofService to generate
 * and verify zero-knowledge proofs for wage attestations.
 */

const WageProofService = require('../src/zkproof_service');
const crypto = require('crypto');

async function demonstrateWageProof() {
    console.log('🚀 Stream Protocol ZK Wage Proof Demo\n');

    // Initialize the ZK proof service
    console.log('1️⃣ Initializing ZK Proof Service...');
    const zkService = new WageProofService();

    try {
        await zkService.initialize();
        console.log('✅ Service initialized successfully\n');
    } catch (error) {
        console.error('❌ Failed to initialize service. Make sure to run build_circuit.sh first.');
        console.error('Error:', error.message);
        process.exit(1);
    }

    // Example attestation data (what an employer would sign)
    console.log('2️⃣ Creating sample wage attestation...');
    const attestationData = {
        employerPrivKey: '12345678901234567890', // In production, this would be the employer's actual private key
        employerID: '1001',                      // Unique employer identifier
        employeeWallet: '0x742d35Cc6644C7532905C2D2C0f6E88F4c1C7E3C', // Employee's wallet address
        wageAmount: '2000000000000000000',       // 2 ETH in wei
        periodID: '202409',                      // Payment period (Sept 2024)
        timestamp: Math.floor(Date.now() / 1000).toString(), // Current timestamp
        minWageThreshold: '500000000000000000',  // 0.5 ETH minimum
        maxWageThreshold: '5000000000000000000'  // 5 ETH maximum
    };

    console.log('📋 Attestation Details:');
    console.log(`   Employer ID: ${attestationData.employerID}`);
    console.log(`   Employee Wallet: ${attestationData.employeeWallet}`);
    console.log(`   Wage Amount: ${parseFloat(attestationData.wageAmount) / 1e18} ETH`);
    console.log(`   Period: ${attestationData.periodID}`);
    console.log(`   Range: ${parseFloat(attestationData.minWageThreshold) / 1e18} - ${parseFloat(attestationData.maxWageThreshold) / 1e18} ETH\n`);

    // Employee's secret (used for nullifier generation)
    console.log('3️⃣ Generating employee secret...');
    const employeeSecret = crypto.randomInt(1000000, 9999999).toString();
    const periodNonce = crypto.randomInt(1, 1000000);

    console.log(`🔐 Employee Secret: ${employeeSecret} (keep private!)`);
    console.log(`🎲 Period Nonce: ${periodNonce}\n`);

    // Generate the ZK proof
    console.log('4️⃣ Generating ZK proof...');
    const startTime = Date.now();

    try {
        const proofResult = await zkService.createWageProof(attestationData, employeeSecret, periodNonce);

        if (!proofResult.success) {
            throw new Error(proofResult.error);
        }

        const totalTime = Date.now() - startTime;
        console.log(`✅ Proof generated successfully in ${totalTime}ms\n`);

        // Display proof information
        console.log('5️⃣ Proof Information:');
        const proofInfo = zkService.extractProofInfo(proofResult.proof);
        console.log(`   Nullifier Hash: ${proofInfo.nullifierHash.slice(0, 20)}...`);
        console.log(`   Wage Commitment: ${proofInfo.wageCommitment.slice(0, 20)}...`);
        console.log(`   Employer Key Hash: ${proofInfo.employerPubKeyHash.slice(0, 20)}...`);
        console.log(`   Generation Time: ${proofInfo.generationTime}ms\n`);

        // Verify the proof
        console.log('6️⃣ Verifying proof...');
        const verifyResult = await zkService.verifyProof(proofResult.proof);

        console.log(`✅ Verification Result: ${verifyResult.isValid ? 'VALID' : 'INVALID'}`);
        console.log(`⏱️  Verification Time: ${verifyResult.verificationTime}ms\n`);

        // Demonstrate nullifier uniqueness
        console.log('7️⃣ Demonstrating nullifier uniqueness...');

        // Try to generate another proof with same parameters (should have same nullifier)
        const proofResult2 = await zkService.createWageProof(attestationData, employeeSecret, periodNonce);
        const proofInfo2 = zkService.extractProofInfo(proofResult2.proof);

        const sameNullifier = proofInfo.nullifierHash === proofInfo2.nullifierHash;
        console.log(`🔗 Same nullifier for identical inputs: ${sameNullifier ? 'YES' : 'NO'}`);

        // Try with different period (should have different nullifier)
        const attestationData3 = { ...attestationData, periodID: '202410' };
        const proofResult3 = await zkService.createWageProof(attestationData3, employeeSecret, periodNonce);
        const proofInfo3 = zkService.extractProofInfo(proofResult3.proof);

        const differentNullifier = proofInfo.nullifierHash !== proofInfo3.nullifierHash;
        console.log(`🆔 Different nullifier for different period: ${differentNullifier ? 'YES' : 'NO'}\n`);

        // Demonstrate wage range enforcement
        console.log('8️⃣ Testing wage range enforcement...');

        try {
            // Try with wage below minimum
            const lowWageAttestation = {
                ...attestationData,
                wageAmount: '100000000000000000' // 0.1 ETH (below minimum)
            };
            await zkService.createWageProof(lowWageAttestation, employeeSecret);
            console.log('❌ Should have failed for low wage!');
        } catch (error) {
            console.log('✅ Correctly rejected wage below minimum');
        }

        try {
            // Try with wage above maximum
            const highWageAttestation = {
                ...attestationData,
                wageAmount: '10000000000000000000' // 10 ETH (above maximum)
            };
            await zkService.createWageProof(highWageAttestation, employeeSecret);
            console.log('❌ Should have failed for high wage!');
        } catch (error) {
            console.log('✅ Correctly rejected wage above maximum');
        }

        // Performance summary
        console.log('\n📊 Performance Summary:');
        console.log(`   Total Proof Generation: ${totalTime}ms`);
        console.log(`   Proof Verification: ${verifyResult.verificationTime}ms`);
        console.log(`   Target (<5000ms): ${totalTime < 5000 ? '✅ PASSED' : '❌ FAILED'}\n`);

        // Usage in production
        console.log('🏭 Production Integration Notes:');
        console.log('   1. Store nullifierHash to prevent double-spending');
        console.log('   2. Verify employerPubKeyHash against known employers');
        console.log('   3. Check wageCommitment consistency across proofs');
        console.log('   4. Implement proper key management for employer signatures');
        console.log('   5. Use trusted setup ceremony for production zkey');

        console.log('\n✅ Demo completed successfully!');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    }
}

// Additional example: Batch proof generation
async function demonstrateBatchProofGeneration() {
    console.log('\n🔄 Batch Proof Generation Demo');
    console.log('=' * 40);

    const zkService = new WageProofService();
    await zkService.initialize();

    const startTime = Date.now();
    const batchSize = 5;
    const proofs = [];

    for (let i = 0; i < batchSize; i++) {
        const attestationData = {
            employerPrivKey: (12345 + i).toString(),
            employerID: (1001 + i).toString(),
            employeeWallet: `0x742d35Cc6644C7532905C2D2C0f6E88F4c1C7E${i.toString(16).padStart(2, '0')}`,
            wageAmount: (1000000000000000000 + i * 100000000000000000).toString(),
            periodID: '202409',
            timestamp: Math.floor(Date.now() / 1000).toString(),
            minWageThreshold: '500000000000000000',
            maxWageThreshold: '5000000000000000000'
        };

        const employeeSecret = (54321 + i * 1111).toString();
        const periodNonce = i + 1;

        console.log(`🔄 Generating proof ${i + 1}/${batchSize}...`);
        const proofResult = await zkService.createWageProof(attestationData, employeeSecret, periodNonce);

        if (proofResult.success) {
            proofs.push(proofResult.proof);
            console.log(`✅ Proof ${i + 1} generated successfully`);
        } else {
            console.error(`❌ Proof ${i + 1} failed: ${proofResult.error}`);
        }
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / batchSize;

    console.log(`\n📈 Batch Results:`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Average per Proof: ${avgTime.toFixed(2)}ms`);
    console.log(`   Successfully Generated: ${proofs.length}/${batchSize}`);
}

// Run the demonstrations
async function main() {
    try {
        await demonstrateWageProof();
        await demonstrateBatchProofGeneration();
    } catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    demonstrateWageProof,
    demonstrateBatchProofGeneration
};