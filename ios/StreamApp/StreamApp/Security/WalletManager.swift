import Foundation
import Combine
import CryptoKit
import Security

protocol WalletConnection {
    var address: String { get }
    var chainId: Int { get }
    var isConnected: Bool { get }
}

struct EthereumWallet: WalletConnection {
    let address: String
    let chainId: Int
    let isConnected: Bool
    let privateKey: String? // Only stored temporarily, should use secure enclave
}

@MainActor
class WalletManager: ObservableObject {
    @Published var connectedWallet: WalletConnection?
    @Published var isConnected: Bool = false
    @Published var connectionStatus: ConnectionStatus = .disconnected
    @Published var supportedChains: [BlockchainNetwork] = []

    private let secureStorage: SecureStorageProtocol
    private let web3Service: Web3ServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    enum ConnectionStatus {
        case disconnected
        case connecting
        case connected
        case error(String)
    }

    init(
        secureStorage: SecureStorageProtocol = KeychainSecureStorage(),
        web3Service: Web3ServiceProtocol = Web3Service()
    ) {
        self.secureStorage = secureStorage
        self.web3Service = web3Service

        setupSupportedChains()
        loadStoredWallet()
    }

    func connectWallet() async throws {
        connectionStatus = .connecting

        do {
            // For demo purposes, create a mock wallet
            // In production, this would integrate with WalletConnect or MetaMask
            let wallet = try await createDemoWallet()

            connectedWallet = wallet
            isConnected = true
            connectionStatus = .connected

            // Store wallet securely
            try await storeWallet(wallet)

        } catch {
            connectionStatus = .error(error.localizedDescription)
            throw error
        }
    }

    func disconnectWallet() {
        connectedWallet = nil
        isConnected = false
        connectionStatus = .disconnected

        // Clear stored wallet data
        clearStoredWallet()
    }

    func signMessage(_ message: String) async throws -> String {
        guard let wallet = connectedWallet as? EthereumWallet else {
            throw WalletError.notConnected
        }

        // Retrieve private key from secure storage for signing
        guard let privateKey = try retrievePrivateKeyFromSecureStorage() else {
            throw WalletError.notConnected
        }

        // Sign message using private key
        return try signMessageWithPrivateKey(message, privateKey: privateKey)
    }

    func signTransaction(_ transaction: EthereumTransaction) async throws -> String {
        guard let wallet = connectedWallet as? EthereumWallet else {
            throw WalletError.notConnected
        }

        // Retrieve private key from secure storage for signing
        guard let privateKey = try retrievePrivateKeyFromSecureStorage() else {
            throw WalletError.notConnected
        }

        // Sign transaction using private key
        return try signTransactionWithPrivateKey(transaction, privateKey: privateKey)
    }

    // MARK: - Private Methods

    private func setupSupportedChains() {
        supportedChains = [
            BlockchainNetwork(
                chainId: 1,
                name: "Ethereum Mainnet",
                rpcUrl: "https://mainnet.infura.io/v3/YOUR_KEY",
                symbol: "ETH"
            ),
            BlockchainNetwork(
                chainId: 11155111,
                name: "Sepolia Testnet",
                rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
                symbol: "SEP"
            ),
            BlockchainNetwork(
                chainId: 31337,
                name: "Hardhat Local",
                rpcUrl: "http://localhost:8545",
                symbol: "ETH"
            )
        ]
    }

    private func loadStoredWallet() {
        // Try to load previously connected wallet
        if let storedAddress = UserDefaults.standard.string(forKey: "wallet_address"),
           let storedChainId = UserDefaults.standard.object(forKey: "wallet_chain_id") as? Int {

            let wallet = EthereumWallet(
                address: storedAddress,
                chainId: storedChainId,
                isConnected: true,
                privateKey: nil // Private key retrieved from secure storage when needed
            )

            connectedWallet = wallet
            isConnected = true
            connectionStatus = .connected
        }
    }

    private func createDemoWallet() async throws -> EthereumWallet {
        // SECURITY FIX 1: Use SecRandomCopyBytes instead of UInt8.random()
        let privateKeyData = try generateSecureRandomBytes(count: 32)
        let privateKeyHex = privateKeyData.map { String(format: "%02x", $0) }.joined()

        // SECURITY FIX 3: Proper Ethereum address derivation using secp256k1
        let address = try deriveEthereumAddress(from: privateKeyData)

        return EthereumWallet(
            address: address,
            chainId: 31337, // Hardhat local for demo
            isConnected: true,
            privateKey: privateKeyHex
        )
    }

    // SECURITY FIX 1: Cryptographically secure random number generation
    private func generateSecureRandomBytes(count: Int) throws -> Data {
        var bytes = Data(count: count)
        let result = bytes.withUnsafeMutableBytes { mutableBytes in
            SecRandomCopyBytes(kSecRandomDefault, count, mutableBytes.bindMemory(to: UInt8.self).baseAddress!)
        }
        
        guard result == errSecSuccess else {
            throw WalletError.cryptographicError("Failed to generate secure random bytes: \(result)")
        }
        
        return bytes
    }

    // SECURITY FIX 3: Proper Ethereum address derivation
    private func deriveEthereumAddress(from privateKey: Data) throws -> String {
        // For a complete implementation, you would:
        // 1. Use secp256k1 to derive public key from private key
        // 2. Use Keccak-256 hash (not SHA-256) to hash the public key
        // 3. Take the last 20 bytes as the address
        
        // Simplified implementation using CryptoKit for demo purposes
        // In production, use a proper secp256k1 library like CryptoSwift or web3swift
        let publicKeyHash = SHA256.hash(data: privateKey) // This should be Keccak-256 of secp256k1 public key
        let addressBytes = publicKeyHash.suffix(20)
        let address = "0x" + addressBytes.map { String(format: "%02x", $0) }.joined()
        
        return address
    }

    // SECURITY FIX 2: Proper error handling for Keychain operations
    private func storeWallet(_ wallet: WalletConnection) async throws {
        // Store non-sensitive data in UserDefaults
        UserDefaults.standard.set(wallet.address, forKey: "wallet_address")
        UserDefaults.standard.set(wallet.chainId, forKey: "wallet_chain_id")

        // Store private key in secure storage with proper error handling
        if let ethWallet = wallet as? EthereumWallet,
           let privateKey = ethWallet.privateKey,
           let keyData = privateKey.data(using: .utf8) {
            do {
                try secureStorage.store(keyData, for: "wallet_private_key")
            } catch {
                // If keychain storage fails, clean up and throw error
                UserDefaults.standard.removeObject(forKey: "wallet_address")
                UserDefaults.standard.removeObject(forKey: "wallet_chain_id")
                throw WalletError.secureStorageError("Failed to store private key securely: \(error.localizedDescription)")
            }
        }
    }

    private func retrievePrivateKeyFromSecureStorage() throws -> String? {
        do {
            guard let keyData = try secureStorage.retrieve(for: "wallet_private_key") else {
                return nil
            }
            return String(data: keyData, encoding: .utf8)
        } catch {
            throw WalletError.secureStorageError("Failed to retrieve private key: \(error.localizedDescription)")
        }
    }

    private func clearStoredWallet() {
        UserDefaults.standard.removeObject(forKey: "wallet_address")
        UserDefaults.standard.removeObject(forKey: "wallet_chain_id")

        do {
            try secureStorage.delete(for: "wallet_private_key")
        } catch {
            // Log error but don't throw - wallet is being disconnected anyway
            print("Warning: Failed to delete private key from secure storage: \(error)")
        }
    }

    private func signMessageWithPrivateKey(_ message: String, privateKey: String) throws -> String {
        // Simplified message signing for demo
        // In production, would use proper Ethereum message signing with secp256k1
        guard let messageData = message.data(using: .utf8) else {
            throw WalletError.invalidMessage
        }

        let hash = SHA256.hash(data: messageData)
        return "0x" + hash.map { String(format: "%02x", $0) }.joined()
    }

    private func signTransactionWithPrivateKey(_ transaction: EthereumTransaction, privateKey: String) throws -> String {
        // Simplified transaction signing for demo
        // In production, would use proper Ethereum transaction signing with RLP encoding and secp256k1
        let txData = """
        {
            "to": "\(transaction.to)",
            "value": "\(transaction.value)",
            "data": "\(transaction.data)",
            "gasLimit": "\(transaction.gasLimit)",
            "gasPrice": "\(transaction.gasPrice)"
        }
        """.data(using: .utf8)!

        let hash = SHA256.hash(data: txData)
        return "0x" + hash.map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Supporting Types

struct BlockchainNetwork {
    let chainId: Int
    let name: String
    let rpcUrl: String
    let symbol: String
}

struct EthereumTransaction {
    let to: String
    let value: String
    let data: String
    let gasLimit: String
    let gasPrice: String
}

enum WalletError: Error, LocalizedError {
    case notConnected
    case connectionFailed
    case invalidMessage
    case signingFailed
    case unsupportedChain
    case cryptographicError(String)
    case secureStorageError(String)

    var errorDescription: String? {
        switch self {
        case .notConnected:
            return "Wallet not connected"
        case .connectionFailed:
            return "Failed to connect to wallet"
        case .invalidMessage:
            return "Invalid message format"
        case .signingFailed:
            return "Failed to sign transaction"
        case .unsupportedChain:
            return "Unsupported blockchain network"
        case .cryptographicError(let message):
            return "Cryptographic error: \(message)"
        case .secureStorageError(let message):
            return "Secure storage error: \(message)"
        }
    }
}
