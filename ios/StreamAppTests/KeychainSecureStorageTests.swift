import XCTest
import Foundation
import Security
@testable import StreamApp

final class KeychainSecureStorageTests: XCTestCase {
    var keychainStorage: KeychainSecureStorage!
    let testService = "com.stream-protocol.app.test"
    
    override func setUp() {
        super.setUp()
        keychainStorage = KeychainSecureStorage()
        
        // Clean up any existing test data
        cleanupKeychainTestData()
    }
    
    override func tearDown() {
        cleanupKeychainTestData()
        super.tearDown()
    }
    
    // MARK: - Basic Storage Tests
    
    func testStoreAndRetrieveData() throws {
        let testKey = "test_key_1"
        let testData = "Hello, Keychain!".data(using: .utf8)!
        
        // Store data
        try keychainStorage.store(testData, for: testKey)
        
        // Verify it exists
        XCTAssertTrue(keychainStorage.exists(for: testKey))
        
        // Retrieve data
        let retrievedData = try keychainStorage.retrieve(for: testKey)
        XCTAssertNotNil(retrievedData)
        XCTAssertEqual(retrievedData, testData)
        
        // Verify content
        let retrievedString = String(data: retrievedData!, encoding: .utf8)
        XCTAssertEqual(retrievedString, "Hello, Keychain!")
    }
    
    func testStoreOverwriteExistingData() throws {
        let testKey = "test_key_overwrite"
        let originalData = "Original Data".data(using: .utf8)!
        let newData = "New Data".data(using: .utf8)!
        
        // Store original data
        try keychainStorage.store(originalData, for: testKey)
        
        // Overwrite with new data
        try keychainStorage.store(newData, for: testKey)
        
        // Verify new data is retrieved
        let retrievedData = try keychainStorage.retrieve(for: testKey)
        XCTAssertEqual(retrievedData, newData)
        
        let retrievedString = String(data: retrievedData!, encoding: .utf8)
        XCTAssertEqual(retrievedString, "New Data")
    }
    
    func testRetrieveNonExistentKey() throws {
        let nonExistentKey = "key_that_does_not_exist"
        
        // Should return nil for non-existent key
        let retrievedData = try keychainStorage.retrieve(for: nonExistentKey)
        XCTAssertNil(retrievedData)
        
        // Should not exist
        XCTAssertFalse(keychainStorage.exists(for: nonExistentKey))
    }
    
    func testDeleteData() throws {
        let testKey = "test_key_delete"
        let testData = "Data to delete".data(using: .utf8)!
        
        // Store data
        try keychainStorage.store(testData, for: testKey)
        XCTAssertTrue(keychainStorage.exists(for: testKey))
        
        // Delete data
        try keychainStorage.delete(for: testKey)
        
        // Verify it's gone
        XCTAssertFalse(keychainStorage.exists(for: testKey))
        
        // Attempting to retrieve should return nil
        let retrievedData = try keychainStorage.retrieve(for: testKey)
        XCTAssertNil(retrievedData)
    }
    
    func testDeleteNonExistentKey() throws {
        let nonExistentKey = "key_to_delete_but_does_not_exist"
        
        // Should not throw error when deleting non-existent key
        XCTAssertNoThrow(try keychainStorage.delete(for: nonExistentKey))
    }
    
    // MARK: - Convenience Methods Tests
    
    func testStoreAndRetrieveString() throws {
        let testKey = "test_string_key"
        let testString = "Hello, String Storage!"
        
        // Store string
        try keychainStorage.storeString(testString, for: testKey)
        
        // Retrieve string
        let retrievedString = try keychainStorage.retrieveString(for: testKey)
        XCTAssertNotNil(retrievedString)
        XCTAssertEqual(retrievedString, testString)
    }
    
    func testStoreAndRetrieveCodableObject() throws {
        struct TestObject: Codable, Equatable {
            let id: Int
            let name: String
            let isActive: Bool
        }
        
        let testKey = "test_object_key"
        let testObject = TestObject(id: 123, name: "Test Object", isActive: true)
        
        // Store object
        try keychainStorage.store(testObject, for: testKey)
        
        // Retrieve object
        let retrievedObject: TestObject? = try keychainStorage.retrieve(TestObject.self, for: testKey)
        XCTAssertNotNil(retrievedObject)
        XCTAssertEqual(retrievedObject, testObject)
    }
    
    func testRetrieveNonExistentStringReturnsNil() throws {
        let result = try keychainStorage.retrieveString(for: "non_existent_string_key")
        XCTAssertNil(result)
    }
    
    func testRetrieveNonExistentObjectReturnsNil() throws {
        struct TestObject: Codable {
            let value: String
        }
        
        let result: TestObject? = try keychainStorage.retrieve(TestObject.self, for: "non_existent_object_key")
        XCTAssertNil(result)
    }
    
    // MARK: - Multiple Keys Tests
    
    func testMultipleKeysIndependence() throws {
        let key1 = "test_key_1"
        let key2 = "test_key_2"
        let key3 = "test_key_3"
        
        let data1 = "Data 1".data(using: .utf8)!
        let data2 = "Data 2".data(using: .utf8)!
        let data3 = "Data 3".data(using: .utf8)!
        
        // Store multiple items
        try keychainStorage.store(data1, for: key1)
        try keychainStorage.store(data2, for: key2)
        try keychainStorage.store(data3, for: key3)
        
        // Verify all exist
        XCTAssertTrue(keychainStorage.exists(for: key1))
        XCTAssertTrue(keychainStorage.exists(for: key2))
        XCTAssertTrue(keychainStorage.exists(for: key3))
        
        // Verify correct data is retrieved for each key
        XCTAssertEqual(try keychainStorage.retrieve(for: key1), data1)
        XCTAssertEqual(try keychainStorage.retrieve(for: key2), data2)
        XCTAssertEqual(try keychainStorage.retrieve(for: key3), data3)
        
        // Delete one key
        try keychainStorage.delete(for: key2)
        
        // Verify others are unaffected
        XCTAssertTrue(keychainStorage.exists(for: key1))
        XCTAssertFalse(keychainStorage.exists(for: key2))
        XCTAssertTrue(keychainStorage.exists(for: key3))
    }
    
    // MARK: - Data Size Tests
    
    func testLargeDataStorage() throws {
        let testKey = "test_large_data"
        
        // Create large data (1MB)
        let largeData = Data(repeating: 0x42, count: 1024 * 1024)
        
        // Store large data
        try keychainStorage.store(largeData, for: testKey)
        
        // Retrieve and verify
        let retrievedData = try keychainStorage.retrieve(for: testKey)
        XCTAssertNotNil(retrievedData)
        XCTAssertEqual(retrievedData!.count, largeData.count)
        XCTAssertEqual(retrievedData, largeData)
    }
    
    func testEmptyDataStorage() throws {
        let testKey = "test_empty_data"
        let emptyData = Data()
        
        // Store empty data
        try keychainStorage.store(emptyData, for: testKey)
        
        // Verify it exists and can be retrieved
        XCTAssertTrue(keychainStorage.exists(for: testKey))
        
        let retrievedData = try keychainStorage.retrieve(for: testKey)
        XCTAssertNotNil(retrievedData)
        XCTAssertEqual(retrievedData!.count, 0)
    }
    
    // MARK: - Error Handling Tests
    
    func testInvalidEncodingHandling() {
        let testKey = "test_invalid_encoding"
        
        // Try to store a string that can't be encoded (this is actually hard to trigger)
        // Instead, test the error path by checking error handling structure
        XCTAssertThrowsError(try keychainStorage.storeString("", for: "")) { error in
            // Empty key should cause an error
            XCTAssertTrue(error is KeychainError)
        }
    }
    
    func testKeychainErrorTypes() {
        // Test that error types are properly defined
        let errors: [KeychainError] = [
            .storeFailed(errSecDuplicateItem),
            .retrieveFailed(errSecItemNotFound),
            .deleteFailed(errSecItemNotFound),
            .accessControlFailed,
            .userCancelled,
            .authenticationFailed,
            .encodingFailed
        ]
        
        for error in errors {
            XCTAssertNotNil(error.errorDescription)
            
            // Some errors should have recovery suggestions
            switch error {
            case .userCancelled, .authenticationFailed, .accessControlFailed:
                XCTAssertNotNil(error.recoverySuggestion)
            default:
                break
            }
        }
    }
    
    // MARK: - Performance Tests
    
    func testStoragePerformance() {
        let testData = "Performance test data".data(using: .utf8)!
        
        measure {
            for i in 0..<100 {
                let key = "perf_test_\(i)"
                do {
                    try keychainStorage.store(testData, for: key)
                    _ = try keychainStorage.retrieve(for: key)
                    try keychainStorage.delete(for: key)
                } catch {
                    XCTFail("Performance test failed: \(error)")
                }
            }
        }
    }
    
    func testRetrievalPerformance() throws {
        let testKey = "perf_retrieval_test"
        let testData = "Performance test data for retrieval".data(using: .utf8)!
        
        // Store once
        try keychainStorage.store(testData, for: testKey)
        
        measure {
            for _ in 0..<100 {
                do {
                    _ = try keychainStorage.retrieve(for: testKey)
                } catch {
                    XCTFail("Retrieval performance test failed: \(error)")
                }
            }
        }
    }
    
    // MARK: - Concurrent Access Tests
    
    func testConcurrentAccess() async {
        let testData = "Concurrent test data".data(using: .utf8)!
        
        await withTaskGroup(of: Void.self) { group in
            // Multiple concurrent operations
            for i in 0..<20 {
                group.addTask {
                    let key = "concurrent_test_\(i)"
                    do {
                        try self.keychainStorage.store(testData, for: key)
                        _ = try self.keychainStorage.retrieve(for: key)
                        try self.keychainStorage.delete(for: key)
                    } catch {
                        XCTFail("Concurrent test failed for key \(key): \(error)")
                    }
                }
            }
        }
    }
    
    func testConcurrentSameKeyAccess() async {
        let testKey = "concurrent_same_key_test"
        let testData = "Concurrent same key test data".data(using: .utf8)!
        
        // Store initial data
        try? keychainStorage.store(testData, for: testKey)
        
        await withTaskGroup(of: Void.self) { group in
            // Multiple operations on same key
            for i in 0..<10 {
                group.addTask {
                    let data = "Data \(i)".data(using: .utf8)!
                    do {
                        try self.keychainStorage.store(data, for: testKey)
                        _ = try self.keychainStorage.retrieve(for: testKey)
                    } catch {
                        // Some operations may fail due to concurrency, which is acceptable
                        // As long as we don't crash
                    }
                }
            }
        }
        
        // Clean up
        try? keychainStorage.delete(for: testKey)
    }
    
    // MARK: - Security Attribute Tests
    
    func testSecurityAttributes() throws {
        let testKey = "test_security_attributes"
        let testData = "Security test data".data(using: .utf8)!
        
        // Store data
        try keychainStorage.store(testData, for: testKey)
        
        // Query to verify security attributes
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.stream-protocol.app",
            kSecAttrAccount as String: testKey,
            kSecReturnAttributes as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        XCTAssertEqual(status, errSecSuccess)
        
        if let attributes = result as? [String: Any] {
            // Verify accessibility attribute
            let accessibility = attributes[kSecAttrAccessible as String] as? String
            XCTAssertEqual(accessibility, kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
        }
    }
    
    // MARK: - Helper Methods
    
    private func cleanupKeychainTestData() {
        let testKeys = [
            "test_key_1",
            "test_key_overwrite", 
            "test_key_delete",
            "test_string_key",
            "test_object_key",
            "test_key_1", "test_key_2", "test_key_3",
            "test_large_data",
            "test_empty_data",
            "perf_retrieval_test",
            "test_security_attributes"
        ]
        
        for key in testKeys {
            try? keychainStorage.delete(for: key)
        }
        
        // Clean up performance test keys
        for i in 0..<100 {
            try? keychainStorage.delete(for: "perf_test_\(i)")
        }
        
        // Clean up concurrent test keys
        for i in 0..<20 {
            try? keychainStorage.delete(for: "concurrent_test_\(i)")
        }
        
        try? keychainStorage.delete(for: "concurrent_same_key_test")
    }
}
