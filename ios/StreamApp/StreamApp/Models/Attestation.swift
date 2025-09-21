import Foundation
import SwiftUI

struct AttestationRequest: Codable {
    let employerId: String
    let employeeWallet: String
    let wageData: WageData
    let metadata: AttestationMetadata

    struct WageData: Codable {
        let amount: Double
        let currency: String
        let period: PayPeriod
        let workDetails: WorkDetails

        struct WorkDetails: Codable {
            let startTime: Date
            let endTime: Date
            let hoursWorked: Double
            let position: String
            let location: String?
        }
    }

    struct AttestationMetadata: Codable {
        let version: String
        let timestamp: Date
        let nonce: String
    }

    enum PayPeriod: String, Codable {
        case hourly = "hourly"
        case daily = "daily"
        case weekly = "weekly"
        case monthly = "monthly"
    }
}

struct AttestationResponse: Codable, Identifiable {
    let id: String
    let employerId: String
    let employeeWallet: String
    let wageAmount: Double
    let status: AttestationStatus
    let signature: String
    let nullifierHash: String
    let createdAt: Date
    let expiresAt: Date
    let proofData: ZKProofData?

    enum AttestationStatus: String, Codable {
        case pending = "pending"
        case verified = "verified"
        case claimed = "claimed"
        case expired = "expired"
        case revoked = "revoked"

        var displayName: String {
            switch self {
            case .pending: return "Pending"
            case .verified: return "Verified"
            case .claimed: return "Claimed"
            case .expired: return "Expired"
            case .revoked: return "Revoked"
            }
        }

        var color: Color {
            switch self {
            case .pending: return StreamColors.warning
            case .verified: return StreamColors.success
            case .claimed: return StreamColors.info
            case .expired: return StreamColors.textSecondary
            case .revoked: return StreamColors.error
            }
        }
    }
}

struct ZKProofData: Codable {
    let proof: ZKProof
    let publicSignals: [String]
    let metadata: ProofMetadata

    struct ZKProof: Codable {
        let pi_a: [String]
        let pi_b: [[String]]
        let pi_c: [String]
        let protocolType: String
        let curve: String
    }

    struct ProofMetadata: Codable {
        let circuitId: String
        let provingTime: TimeInterval
        let verificationKey: String
        let publicInputs: [String: String]
    }
}

struct VerificationResponse: Codable {
    let isValid: Bool
    let attestationId: String
    let verificationTimestamp: Date
    let errors: [String]?
    let warnings: [String]?
}

// MARK: - Sample Data for Development
extension AttestationResponse {
    static let sampleAttestations = [
        AttestationResponse(
            id: "att_1234567890",
            employerId: "starbucks_downtown",
            employeeWallet: "0x1234...5678",
            wageAmount: 153.0,
            status: .verified,
            signature: "0xabc123...",
            nullifierHash: "0xdef456...",
            createdAt: Date().addingTimeInterval(-3600),
            expiresAt: Date().addingTimeInterval(86400),
            proofData: nil
        ),
        AttestationResponse(
            id: "att_0987654321",
            employerId: "amazon_warehouse_1",
            employeeWallet: "0x1234...5678",
            wageAmount: 220.0,
            status: .pending,
            signature: "0xghi789...",
            nullifierHash: "0xjkl012...",
            createdAt: Date().addingTimeInterval(-1800),
            expiresAt: Date().addingTimeInterval(82800),
            proofData: nil
        )
    ]
}