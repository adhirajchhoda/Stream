import Foundation
import Combine

protocol APIServiceProtocol {
    func registerEmployer(_ request: EmployerRegistrationRequest) async throws -> EmployerResponse
    func createAttestation(_ request: AttestationRequest) async throws -> AttestationResponse
    func getAttestation(_ id: String) async throws -> AttestationResponse
    func getEmployeeAttestations(_ wallet: String) async throws -> [AttestationResponse]
    func verifyAttestation(_ id: String) async throws -> VerificationResponse
    func getZKPData(_ attestationId: String) async throws -> ZKProofData
    func checkNullifier(_ hash: String) async throws -> NullifierStatus
    func getServiceStatus() async throws -> ServiceStatus
}

class APIService: APIServiceProtocol {
    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    // Rate limiting with proper memory management
    private let rateLimitQueue = DispatchQueue(label: "com.stream.api.ratelimit", attributes: .concurrent)
    private var requestCounts: [String: (count: Int, resetTime: Date)] = [:]
    private let maxRequestsPerMinute = 60
    private let maxStoredEndpoints = 100 // Prevent unbounded growth
    private var cleanupTimer: Timer?

    init(baseURL: String = "http://localhost:3001/api/v1") {
        self.baseURL = URL(string: baseURL)!

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10  // Reduced timeout for faster failure in dev mode
        config.timeoutIntervalForResource = 20
        config.requestCachePolicy = .reloadIgnoringLocalCacheData

        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase

        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
        
        startCleanupTimer()
    }
    
    deinit {
        cleanupTimer?.invalidate()
    }

    // MARK: - Employer Management
    func registerEmployer(_ request: EmployerRegistrationRequest) async throws -> EmployerResponse {
        let endpoint = "/employers/register"
        return try await performRequest(
            endpoint: endpoint,
            method: .POST,
            body: request,
            responseType: EmployerResponse.self
        )
    }

    // MARK: - Attestation Management
    func createAttestation(_ request: AttestationRequest) async throws -> AttestationResponse {
        let endpoint = "/attestations"
        return try await performRequest(
            endpoint: endpoint,
            method: .POST,
            body: request,
            responseType: AttestationResponse.self
        )
    }

    func getAttestation(_ id: String) async throws -> AttestationResponse {
        let endpoint = "/attestations/\(id)"
        return try await performRequest(
            endpoint: endpoint,
            method: .GET,
            body: nil as String?,
            responseType: AttestationResponse.self
        )
    }

    func getEmployeeAttestations(_ wallet: String) async throws -> [AttestationResponse] {
        let endpoint = "/attestations/employee/\(wallet)"
        return try await performRequest(
            endpoint: endpoint,
            method: .GET,
            body: nil as String?,
            responseType: [AttestationResponse].self
        )
    }

    func verifyAttestation(_ id: String) async throws -> VerificationResponse {
        let endpoint = "/attestations/\(id)/verify"
        return try await performRequest(
            endpoint: endpoint,
            method: .POST,
            body: nil as String?,
            responseType: VerificationResponse.self
        )
    }

    func getZKPData(_ attestationId: String) async throws -> ZKProofData {
        let endpoint = "/attestations/\(attestationId)/zkp"
        return try await performRequest(
            endpoint: endpoint,
            method: .GET,
            body: nil as String?,
            responseType: ZKProofData.self
        )
    }

    // MARK: - Nullifier Management
    func checkNullifier(_ hash: String) async throws -> NullifierStatus {
        let endpoint = "/nullifiers/\(hash)"
        return try await performRequest(
            endpoint: endpoint,
            method: .GET,
            body: nil as String?,
            responseType: NullifierStatus.self
        )
    }

    // MARK: - Service Status
    func getServiceStatus() async throws -> ServiceStatus {
        let endpoint = "/status"
        return try await performRequest(
            endpoint: endpoint,
            method: .GET,
            body: nil as String?,
            responseType: ServiceStatus.self
        )
    }

    // MARK: - Private Implementation
    private func performRequest<T: Codable, U: Codable>(
        endpoint: String,
        method: HTTPMethod,
        body: T? = nil,
        responseType: U.Type
    ) async throws -> U {
        // Check rate limiting
        try await checkRateLimit(for: endpoint)

        // Build request
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("StreamApp/1.0", forHTTPHeaderField: "User-Agent")

        // Add authentication header if available
        if let authToken = getAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }

        // Encode body if provided
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        // Perform request with backend integration
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            // Log the error but still try to connect to backend
            print("Network request failed: \(error.localizedDescription)")
            print("Ensure the attestation service is running on localhost:3001")
            throw APIError.networkError(error)
        }

        // Handle response
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Check status code
        switch httpResponse.statusCode {
        case 200...299:
            // Success - decode response
            do {
                return try decoder.decode(responseType, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        case 400:
            throw APIError.badRequest(parseErrorMessage(from: data))
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 429:
            throw APIError.rateLimitExceeded
        case 500...599:
            throw APIError.serverError(httpResponse.statusCode)
        default:
            throw APIError.unknown(httpResponse.statusCode)
        }
    }

    // MARK: - Rate Limiting with Memory Management
    private func checkRateLimit(for endpoint: String) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            rateLimitQueue.async(flags: .barrier) {
                let now = Date()
                let key = endpoint
                
                // Clean up expired entries first
                self.cleanupExpiredEntries(currentTime: now)
                
                if let existing = self.requestCounts[key] {
                    if now < existing.resetTime {
                        if existing.count >= self.maxRequestsPerMinute {
                            continuation.resume(throwing: APIError.rateLimitExceeded)
                            return
                        }
                        self.requestCounts[key] = (existing.count + 1, existing.resetTime)
                    } else {
                        self.requestCounts[key] = (1, now.addingTimeInterval(60))
                    }
                } else {
                    // Ensure we don't exceed maximum stored endpoints
                    if self.requestCounts.count >= self.maxStoredEndpoints {
                        self.cleanupOldestEntries()
                    }
                    self.requestCounts[key] = (1, now.addingTimeInterval(60))
                }
                
                continuation.resume()
            }
        }
    }
    
    private func cleanupExpiredEntries(currentTime: Date) {
        requestCounts = requestCounts.filter { _, value in
            currentTime < value.resetTime
        }
    }
    
    private func cleanupOldestEntries() {
        // Remove 25% of entries (oldest reset times) when at capacity
        let sortedEntries = requestCounts.sorted { $0.value.resetTime < $1.value.resetTime }
        let removeCount = max(1, requestCounts.count / 4)
        
        for i in 0..<removeCount {
            requestCounts.removeValue(forKey: sortedEntries[i].key)
        }
    }
    
    private func startCleanupTimer() {
        cleanupTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            self?.rateLimitQueue.async(flags: .barrier) {
                self?.cleanupExpiredEntries(currentTime: Date())
            }
        }
    }

    private func getAuthToken() -> String? {
        // Retrieve from secure storage
        return UserDefaults.standard.string(forKey: "auth_token")
    }

    private func parseErrorMessage(from data: Data) -> String {
        if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
            return errorResponse.message
        }
        return "Unknown error occurred"
    }
    
    // MARK: - Mock Data for Development
    private func getMockResponse<T: Codable>(for endpoint: String, responseType: T.Type) throws -> T {
        print("Providing mock response for endpoint: \(endpoint)")
        
        if endpoint.contains("/attestations/employee/") {
            // Mock employee attestations response
            let mockProofData = ZKProofData(
                proof: ZKProofData.ZKProof(
                    pi_a: ["0x1234567890abcdef", "0xabcdef1234567890"],
                    pi_b: [["0x1111111111111111", "0x2222222222222222"], ["0x3333333333333333", "0x4444444444444444"]],
                    pi_c: ["0x5555555555555555", "0x6666666666666666"],
                    protocolType: "groth16",
                    curve: "bn128"
                ),
                publicSignals: ["1000", "40", "25"],
                metadata: ZKProofData.ProofMetadata(
                    circuitId: "wage-proof-v1",
                    provingTime: 1.5,
                    verificationKey: "0xverificationkey123",
                    publicInputs: ["wageAmount": "1000", "hoursWorked": "40"]
                )
            )
            
            let mockAttestations: [AttestationResponse] = [
                AttestationResponse(
                    id: "mock-attestation-1",
                    employerId: "employer-123",
                    employeeWallet: "0xdc5a00972690ad55e859bd06023001a2dfd685a3",
                    wageAmount: 2500.0,
                    status: .verified,
                    signature: "0x1234567890abcdef",
                    nullifierHash: "0xabcdef1234567890",
                    createdAt: Date(),
                    expiresAt: Date().addingTimeInterval(86400 * 30), // 30 days
                    proofData: mockProofData
                )
            ]
            
            if let mockData = mockAttestations as? T {
                return mockData
            }
        } else if endpoint.contains("/attestations/") {
            // Mock single attestation response
            let mockProofData = ZKProofData(
                proof: ZKProofData.ZKProof(
                    pi_a: ["0x1234567890abcdef", "0xabcdef1234567890"],
                    pi_b: [["0x1111111111111111", "0x2222222222222222"], ["0x3333333333333333", "0x4444444444444444"]],
                    pi_c: ["0x5555555555555555", "0x6666666666666666"],
                    protocolType: "groth16",
                    curve: "bn128"
                ),
                publicSignals: ["1000", "40", "25"],
                metadata: ZKProofData.ProofMetadata(
                    circuitId: "wage-proof-v1",
                    provingTime: 1.5,
                    verificationKey: "0xverificationkey123",
                    publicInputs: ["wageAmount": "1000", "hoursWorked": "40"]
                )
            )
            
            let mockAttestation = AttestationResponse(
                id: "mock-attestation-1",
                employerId: "employer-123",
                employeeWallet: "0xdc5a00972690ad55e859bd06023001a2dfd685a3",
                wageAmount: 2500.0,
                status: .verified,
                signature: "0x1234567890abcdef",
                nullifierHash: "0xabcdef1234567890",
                createdAt: Date(),
                expiresAt: Date().addingTimeInterval(86400 * 30), // 30 days
                proofData: mockProofData
            )
            
            if let mockData = mockAttestation as? T {
                return mockData
            }
        } else if endpoint.contains("/status") {
            // Mock service status
            let mockStatus = ServiceStatus(
                service: "StreamApp API",
                status: "operational",
                statistics: ServiceStatus.Statistics(
                    totalAttestations: 1000,
                    totalVerifications: 950,
                    activeEmployers: 25,
                    totalEmployers: 100
                ),
                features: ServiceStatus.Features(
                    attestationCreation: true,
                    signatureVerification: true,
                    antiReplayProtection: true,
                    zkpCompatibility: true,
                    rateLimiting: true
                ),
                timestamp: Date()
            )
            
            if let mockData = mockStatus as? T {
                return mockData
            }
        }
        
        // If we can't provide a specific mock, throw an error
        throw APIError.notFound
    }
}

// MARK: - HTTP Method
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
    case PATCH = "PATCH"
}

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case invalidResponse
    case decodingError(Error)
    case badRequest(String)
    case unauthorized
    case forbidden
    case notFound
    case rateLimitExceeded
    case serverError(Int)
    case unknown(Int)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .badRequest(let message):
            return message
        case .unauthorized:
            return "Authentication required"
        case .forbidden:
            return "Access denied"
        case .notFound:
            return "Resource not found"
        case .rateLimitExceeded:
            return "Too many requests. Please try again later."
        case .serverError(let code):
            return "Server error (\(code))"
        case .unknown(let code):
            return "Unknown error (\(code))"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .unauthorized:
            return "Please check your authentication credentials"
        case .rateLimitExceeded:
            return "Wait a moment and try again"
        case .networkError:
            return "Check your internet connection"
        case .serverError:
            return "Please try again later"
        default:
            return nil
        }
    }
}

// MARK: - Supporting Types
struct APIErrorResponse: Codable {
    let error: String
    let message: String
}

struct EmployerRegistrationRequest: Codable {
    let name: String
    let walletAddress: String
    let industry: String
    let contactEmail: String
    let website: String?
}

struct EmployerResponse: Codable {
    let id: String
    let name: String
    let walletAddress: String
    let industry: String
    let isVerified: Bool
    let createdAt: Date
}

struct NullifierStatus: Codable {
    let hash: String
    let isUsed: Bool
    let usedAt: Date?
}

struct ServiceStatus: Codable {
    let service: String
    let status: String
    let statistics: Statistics
    let features: Features
    let timestamp: Date

    struct Statistics: Codable {
        let totalAttestations: Int
        let totalVerifications: Int
        let activeEmployers: Int
        let totalEmployers: Int
    }

    struct Features: Codable {
        let attestationCreation: Bool
        let signatureVerification: Bool
        let antiReplayProtection: Bool
        let zkpCompatibility: Bool
        let rateLimiting: Bool
    }
}
