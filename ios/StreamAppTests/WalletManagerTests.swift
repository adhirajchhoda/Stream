import XCTest
import Foundation
import CryptoKit
import Security
@testable import StreamApp

final class WalletManagerTests: XCTestCase {
    var walletManager: WalletManager!
    var mockSecureStorage: MockSecureStorage!
    var mockWeb3Service: MockWeb3Service!
    
    override func setUp() {
        super.setUp()
        mockSecureStorage = MockSecureStorage()
        mockWeb3Service = MockWeb3Service()
        walletManager = WalletManager(
            secureStorage: mockSecureStorage,
            web3Service: mockWeb3Service
        )
    }
    
    override func tearDown() {
        mockSecureStorage.clear()
        super.tearDown()
    }
    
    // MARK: - Security Tests
    
    func testSecureRandomGeneration() throws {
        // Test that random generation produces different results
        let data1 = try walletManager.generateSecureRandomBytesForTesting(count: 32)
        let data2 = try walletManager.generateSecureRandomBytesForTesting(count: 32)
        
        XCTAssertEqual(data1.count, 32)
        XCTAssertEqual(data2.count, 32)
        XCTAssertNotEqual(data1, data2, "Random generation should produce different results")
        
        // Test entropy - should have good distribution
        let combinedData = data1 + data2
        let uniqueBytes = Set(combinedData)
        XCTAssertGreaterThan(uniqueBytes.count, 40, "Should have good byte distribution")
    }
    
    func testSecureRandomFailure() {
        // Test error handling for secure random generation
        XCTAssertThrowsError(
            try walletManager.generateSecureRandomBytesForTesting(count: 0)
        ) { error in
            XCTAssertTrue(error is WalletError)
        }
    }
    
    func testEthereumAddressDerivation() throws {
        // Test address derivation produces valid Ethereum addresses
        let privateKey = try walletManager.generateSecureRandomBytesForTesting(count: 32)
        let address = try walletManager.deriveEthereumAddressForTesting(from: privateKey)
        
        XCTAssertTrue(address.hasPrefix("0x"), "Address should start with 0x")
        XCTAssertEqual(address.count, 42, "Address should be 42 characters long")
        
        // Test consistency - same private key should produce same address
        let address2 = try walletManager.deriveEthereumAddressForTesting(from: privateKey)
        XCTAssertEqual(address, address2)
        
        // Test different private keys produce different addresses
        let privateKey2 = try walletManager.generateSecureRandomBytesForTesting(count: 32)
        let address3 = try walletManager.deriveEthereumAddressForTesting(from: privateKey2)
        XCTAssertNotEqual(address, address3)
    }
    
    // MARK: - Keychain Storage Tests
    
    func testWalletStorageAndRetrieval() async throws {
        // Test successful wallet connection and storage
        try await walletManager.connectWallet()
        
        XCTAssertTrue(walletManager.isConnected)
        XCTAssertNotNil(walletManager.connectedWallet)
        XCTAssertEqual(walletManager.connectionStatus, .connected)
        
        // Verify private key is stored securely
        XCTAssertTrue(mockSecureStorage.exists(for: "wallet_private_key"))
        
        // Test retrieval of stored private key
        let retrievedKey = try walletManager.retrievePrivateKeyFromSecureStorageForTesting()
        XCTAssertNotNil(retrievedKey)
    }
    
    func testWalletStorageFailure() async {
        // Configure mock to fail storage
        mockSecureStorage.shouldFailStore = true
        
        // Attempt wallet connection should fail and clean up
        await XCTAssertThrowsErrorAsync(
            try await walletManager.connectWallet()
        ) { error in
            XCTAssertTrue(error is WalletError)
            if case .secureStorageError = error as? WalletError {
                // Expected error type
            } else {
                XCTFail("Expected WalletError.secureStorageError")
            }
        }
        
        // Verify cleanup occurred
        XCTAssertFalse(walletManager.isConnected)
        XCTAssertNil(UserDefaults.standard.string(forKey: "wallet_address"))
        XCTAssertNil(UserDefaults.standard.object(forKey: "wallet_chain_id"))
    }
    
    func testWalletDisconnectionCleanup() async throws {
        // Connect wallet first
        try await walletManager.connectWallet()
        XCTAssertTrue(walletManager.isConnected)
        
        // Disconnect and verify cleanup
        walletManager.disconnectWallet()
        
        XCTAssertFalse(walletManager.isConnected)
        XCTAssertNil(walletManager.connectedWallet)
        XCTAssertEqual(walletManager.connectionStatus, .disconnected)
        
        // Verify secure storage is cleared
        XCTAssertFalse(mockSecureStorage.exists(for: "wallet_private_key"))
        
        // Verify UserDefaults are cleared
        XCTAssertNil(UserDefaults.standard.string(forKey: "wallet_address"))
        XCTAssertNil(UserDefaults.standard.object(forKey: "wallet_chain_id"))
    }
    
    // MARK: - Error Handling Tests
    
    func testPrivateKeyRetrievalFailure() async throws {
        // Connect wallet first
        try await walletManager.connectWallet()
        
        // Configure mock to fail retrieval
        mockSecureStorage.shouldFailRetrieve = true
        
        await XCTAssertThrowsErrorAsync(
            try await walletManager.signMessage("test message")
        ) { error in
            XCTAssertTrue(error is WalletError)
        }
    }
    
    func testSigningWithoutConnectedWallet() async {
        // Attempt to sign without connected wallet
        await XCTAssertThrowsErrorAsync(
            try await walletManager.signMessage("test message")
        ) { error in
            XCTAssertEqual(error as? WalletError, .notConnected)
        }
    }
    
    // MARK: - Performance Tests
    
    func testRandomGenerationPerformance() {
        measure {
            for _ in 0..<100 {
                _ = try? walletManager.generateSecureRandomBytesForTesting(count: 32)
            }
        }
    }
    
    func testAddressDerivationPerformance() throws {
        let privateKey = try walletManager.generateSecureRandomBytesForTesting(count: 32)
        
        measure {
            for _ in 0..<50 {
                _ = try? walletManager.deriveEthereumAddressForTesting(from: privateKey)
            }
        }
    }
}

// MARK: - Mock Services

class MockWeb3Service: Web3ServiceProtocol {
    func connectWallet() async throws -> WalletConnection {
        return EthereumWallet(
            address: "0x1234567890abcdef1234567890abcdef12345678",
            chainId: 31337,
            isConnected: true,
            privateKey: "test_private_key"
        )
    }
    
    func submitProofToContract(_ proof: ZKProofData) async throws -> TransactionResult {
        return TransactionResult(
            transactionHash: "0xtest",
            blockNumber: 123456,
            gasUsed: "21000",
            status: .confirmed
        )
    }
    
    func checkClaimStatus(_ txHash: String) async throws -> BlockchainClaimStatus {
        return BlockchainClaimStatus(
            transactionHash: txHash,
            status: .confirmed,
            blockNumber: 123456,
            confirmations: 6
        )
    }
    
    func getBalance(for address: String) async throws -> String {
        return "1.0"
    }
    
    func estimateGasFee(for transaction: EthereumTransaction) async throws -> String {
        return "50.0"
    }
}

// MARK: - Extended MockSecureStorage for Testing

extension MockSecureStorage {
    var shouldFailStore: Bool = false
    var shouldFailRetrieve: Bool = false
    
    override func store(_ data: Data, for key: String) throws {
        if shouldFailStore {
            throw KeychainError.storeFailed(errSecUnimplemented)
        }
        try super.store(data, for: key)
    }
    
    override func retrieve(for key: String) throws -> Data? {
        if shouldFailRetrieve {
            throw KeychainError.retrieveFailed(errSecUnimplemented)
        }
        return try super.retrieve(for: key)
    }
}

// MARK: - WalletManager Testing Extensions

extension WalletManager {
    // Expose private methods for testing
    func generateSecureRandomBytesForTesting(count: Int) throws -> Data {
        return try generateSecureRandomBytes(count: count)
    }
    
    func deriveEthereumAddressForTesting(from privateKey: Data) throws -> String {
        return try deriveEthereumAddress(from: privateKey)
    }
    
    func retrievePrivateKeyFromSecureStorageForTesting() throws -> String? {
        return try retrievePrivateKeyFromSecureStorage()
    }
}

// MARK: - Async Test Helpers

extension XCTestCase {
    func XCTAssertThrowsErrorAsync<T>(
        _ expression: @autoclosure () async throws -> T,
        _ errorHandler: (Error) -> Void = { _ in }
    ) async {
        do {
            _ = try await expression()
            XCTFail("Expected expression to throw an error")
        } catch {
            errorHandler(error)
        }
    }
}
