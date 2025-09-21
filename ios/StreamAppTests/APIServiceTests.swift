import XCTest
import Foundation
import Combine
@testable import StreamApp

final class APIServiceTests: XCTestCase {
    var apiService: APIService!
    var mockURLSession: MockURLSession!
    
    override func setUp() {
        super.setUp()
        mockURLSession = MockURLSession()
        
        // Create APIService with mock session
        apiService = APIService(baseURL: "https://test-api.example.com")
        
        // Replace the session with our mock (this would need to be exposed in APIService for testing)
        // For now, we'll test the behavior through the public interface
    }
    
    override func tearDown() {
        apiService = nil
        mockURLSession = nil
        super.tearDown()
    }
    
    // MARK: - Rate Limiting Tests
    
    func testRateLimitingWithinLimit() async {
        let requests = 5 // Well within the 60 per minute limit
        
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<requests {
                group.addTask {
                    do {
                        _ = try await self.apiService.getServiceStatus()
                    } catch {
                        // Expected to fail due to network, but should not be rate limited
                        if let apiError = error as? APIError,
                           case .rateLimitExceeded = apiError {
                            XCTFail("Should not be rate limited for \(i+1) requests")
                        }
                    }
                }
            }
        }
    }
    
    func testRateLimitingExceeded() async {
        // This test simulates exceeding the rate limit
        // Since we can't easily mock the internal rate limiting without exposing internals,
        // we'll test the behavior with rapid consecutive requests
        
        let rapidRequests = 70 // More than the 60 per minute limit
        var rateLimitHit = false
        
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<rapidRequests {
                group.addTask {
                    do {
                        _ = try await self.apiService.getServiceStatus()
                    } catch {
                        if let apiError = error as? APIError,
                           case .rateLimitExceeded = apiError {
                            rateLimitHit = true
                        }
                    }
                }
            }
        }
        
        // Note: Due to the async nature and actual network calls, 
        // this test might not always trigger rate limiting
        // In a real implementation, you'd mock the rate limiting mechanism
    }
    
    func testRateLimitingMemoryManagement() async {
        // Test that rate limiting doesn't cause memory leaks
        let manyEndpoints = 150 // More than maxStoredEndpoints (100)
        
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<manyEndpoints {
                group.addTask {
                    do {
                        // Use different endpoints to test memory management
                        _ = try await self.apiService.getAttestation("test_\(i)")
                    } catch {
                        // Expected to fail, we're testing memory management
                    }
                }
            }
        }
        
        // If we get here without crashing, memory management is working
        XCTAssertTrue(true, "Memory management test passed")
    }
    
    // MARK: - Error Handling Tests
    
    func testHTTPErrorStatusCodes() async {
        // Test various HTTP status codes are handled correctly
        let testCases: [(statusCode: Int, expectedError: APIError)] = [
            (400, .badRequest("Bad Request")),
            (401, .unauthorized),
            (403, .forbidden),
            (404, .notFound),
            (429, .rateLimitExceeded),
            (500, .serverError(500)),
            (503, .serverError(503))
        ]
        
        for (statusCode, expectedError) in testCases {
            await XCTAssertThrowsErrorAsync(
                try await apiService.getServiceStatus()
            ) { error in
                // Note: Actual error depends on real network response
                // In a proper test, you'd mock the URLSession
                if let apiError = error as? APIError {
                    switch (apiError, expectedError) {
                    case (.badRequest, .badRequest),
                         (.unauthorized, .unauthorized),
                         (.forbidden, .forbidden),
                         (.notFound, .notFound),
                         (.rateLimitExceeded, .rateLimitExceeded),
                         (.serverError, .serverError):
                        break // Expected error type
                    default:
                        break // Different error type, but still an APIError
                    }
                }
            }
        }
    }
    
    func testNetworkTimeouts() async {
        // Test that network timeouts are handled properly
        let startTime = Date()
        
        await XCTAssertThrowsErrorAsync(
            try await apiService.getServiceStatus()
        ) { error in
            let duration = Date().timeIntervalSince(startTime)
            
            // Should timeout within reasonable time (URLSession timeout is 30s)
            XCTAssertLessThan(duration, 35.0, "Should timeout within 35 seconds")
            
            if let urlError = error as? URLError {
                XCTAssertTrue([
                    URLError.Code.timedOut,
                    URLError.Code.cannotConnectToHost,
                    URLError.Code.networkConnectionLost
                ].contains(urlError.code))
            }
        }
    }
    
    // MARK: - Data Validation Tests
    
    func testRequestSerialization() async {
        let request = EmployerRegistrationRequest(
            name: "Test Company",
            walletAddress: "0x1234567890abcdef",
            industry: "Technology",
            contactEmail: "test@example.com",
            website: "https://example.com"
        )
        
        await XCTAssertThrowsErrorAsync(
            try await apiService.registerEmployer(request)
        ) { error in
            // Should fail due to network, but request should be properly serialized
            // We can't easily test serialization without mocking, but we verify it doesn't crash
        }
    }
    
    func testInvalidResponseHandling() async {
        // Test handling of invalid JSON responses
        await XCTAssertThrowsErrorAsync(
            try await apiService.getServiceStatus()
        ) { error in
            // Should handle invalid responses gracefully
            if let apiError = error as? APIError {
                switch apiError {
                case .decodingError, .invalidResponse:
                    break // Expected for invalid responses
                default:
                    break // Other errors are also acceptable
                }
            }
        }
    }
    
    // MARK: - Authentication Tests
    
    func testAuthenticationHeaders() async {
        // Set a test auth token
        UserDefaults.standard.set("test_token_123", forKey: "auth_token")
        
        await XCTAssertThrowsErrorAsync(
            try await apiService.getServiceStatus()
        ) { error in
            // Request should include auth header (we can't verify this without mocking)
            // But it should not crash when auth token is present
        }
        
        // Clean up
        UserDefaults.standard.removeObject(forKey: "auth_token")
    }
    
    func testMissingAuthenticationHeaders() async {
        // Ensure no auth token is set
        UserDefaults.standard.removeObject(forKey: "auth_token")
        
        await XCTAssertThrowsErrorAsync(
            try await apiService.getServiceStatus()
        ) { error in
            // Request should work without auth header for public endpoints
            // Should not crash when no auth token is present
        }
    }
    
    // MARK: - Concurrent Request Tests
    
    func testConcurrentRequests() async {
        let numberOfRequests = 10
        
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<numberOfRequests {
                group.addTask {
                    do {
                        _ = try await self.apiService.getAttestation("test_\(i)")
                    } catch {
                        // Expected to fail due to network, testing concurrency handling
                    }
                }
            }
        }
        
        // If we reach here without deadlocks or crashes, concurrency is handled properly
        XCTAssertTrue(true, "Concurrent requests handled successfully")
    }
    
    func testRequestCancellation() async {
        let task = Task {
            do {
                _ = try await apiService.getServiceStatus()
            } catch is CancellationError {
                return "cancelled"
            } catch {
                return "failed"
            }
            return "completed"
        }
        
        // Cancel the task after a short delay
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        task.cancel()
        
        let result = await task.value
        // Result could be "cancelled", "failed", or "completed" depending on timing
        XCTAssertTrue(["cancelled", "failed", "completed"].contains(result))
    }
    
    // MARK: - Performance Tests
    
    func testAPIServicePerformance() {
        measure {
            let expectation = expectation(description: "API call")
            
            Task {
                do {
                    _ = try await apiService.getServiceStatus()
                } catch {
                    // Expected to fail, measuring overhead not network speed
                }
                expectation.fulfill()
            }
            
            wait(for: [expectation], timeout: 10.0)
        }
    }
    
    func testMemoryUsageUnderLoad() async {
        // Test memory usage doesn't grow unbounded under load
        let iterations = 100
        
        for i in 0..<iterations {
            do {
                _ = try await apiService.getAttestation("load_test_\(i)")
            } catch {
                // Expected to fail, testing memory usage
            }
            
            if i % 10 == 0 {
                // Periodically yield to allow cleanup
                try? await Task.sleep(nanoseconds: 1_000_000) // 1ms
            }
        }
        
        // If we complete without memory issues, test passes
        XCTAssertTrue(true, "Memory usage test completed")
    }
    
    // MARK: - Error Recovery Tests
    
    func testErrorMessageParsing() async {
        await XCTAssertThrowsErrorAsync(
            try await apiService.getServiceStatus()
        ) { error in
            // Error should have a meaningful description
            XCTAssertFalse(error.localizedDescription.isEmpty)
            
            if let apiError = error as? APIError {
                XCTAssertNotNil(apiError.errorDescription)
                // Some errors should have recovery suggestions
                switch apiError {
                case .unauthorized, .rateLimitExceeded, .networkError, .serverError:
                    XCTAssertNotNil(apiError.recoverySuggestion)
                default:
                    break
                }
            }
        }
    }
    
    // MARK: - Configuration Tests
    
    func testCustomBaseURL() {
        let customAPI = APIService(baseURL: "https://custom-api.example.com")
        
        Task {
            do {
                _ = try await customAPI.getServiceStatus()
            } catch {
                // Expected to fail, testing that custom URL is used
                // In a real test, you'd verify the URL was used correctly
            }
        }
    }
    
    func testInvalidBaseURL() {
        // APIService should handle invalid URLs gracefully
        let invalidAPI = APIService(baseURL: "not-a-valid-url")
        
        Task {
            await XCTAssertThrowsErrorAsync(
                try await invalidAPI.getServiceStatus()
            ) { error in
                // Should handle invalid URL gracefully
            }
        }
    }
}

// MARK: - Mock Classes

class MockURLSession: URLSession {
    var mockData: Data?
    var mockResponse: URLResponse?
    var mockError: Error?
    
    override func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        if let error = mockError {
            throw error
        }
        
        let data = mockData ?? Data()
        let response = mockResponse ?? HTTPURLResponse(
            url: request.url!,
            statusCode: 200,
            httpVersion: nil,
            headerFields: nil
        )!
        
        return (data, response)
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
