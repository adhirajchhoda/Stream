# StreamApp Test Suite

This test suite provides comprehensive testing for the critical functionality and security fixes implemented in the StreamApp iOS application.

## Overview

The test suite focuses on practical, functional testing of the core security and functionality components:

1. **WalletManager** - Cryptographic security and keychain storage
2. **ZKProofService** - Zero-knowledge proof validation and error handling  
3. **WorkSessionViewModel** - Session tracking and timer management
4. **APIService** - Rate limiting and memory management
5. **KeychainSecureStorage** - Secure data storage

## Test Files

### WalletManagerTests.swift
Tests the wallet management functionality with focus on:
- **Security**: Cryptographically secure random number generation using SecRandomCopyBytes
- **Address Derivation**: Proper Ethereum address derivation (simplified demo implementation)
- **Keychain Storage**: Secure storage and retrieval of private keys with error handling
- **Error Handling**: Proper cleanup on storage failures
- **Performance**: Random generation and address derivation performance

Key Security Tests:
- `testSecureRandomGeneration()` - Verifies use of SecRandomCopyBytes instead of UInt8.random()
- `testWalletStorageFailure()` - Tests proper cleanup when keychain storage fails
- `testWalletDisconnectionCleanup()` - Ensures sensitive data is properly cleared

### ZKProofServiceTests.swift
Tests zero-knowledge proof generation and validation:
- **Input Validation**: Comprehensive validation of witness data
- **Proof Structure**: Validation of Groth16 proof components
- **Error Handling**: JavaScript execution errors and timeouts
- **Protocol Support**: Validation of supported protocols and curves
- **Performance**: Proof generation and verification performance

Key Security Tests:
- `testInvalidWageAmount()` - Prevents negative or zero wage amounts
- `testInvalidHoursWorked()` - Validates reasonable working hours (0-168 per week)
- `testInvalidProofStructure_*()` - Validates proper Groth16 proof structure
- `testTimeoutProtection()` - Ensures operations complete within reasonable time

### WorkSessionViewModelTests.swift
Tests work session tracking and management:
- **Thread Safety**: Concurrent session operations
- **Timer Management**: Accurate time tracking with pause/resume
- **App State Handling**: Background/foreground transitions
- **Data Persistence**: Session stats and recent sessions storage
- **Memory Management**: No memory leaks under load

Key Functionality Tests:
- `testSessionStartAndTracking()` - Basic session timing accuracy
- `testSessionPauseAndResume()` - Pause functionality doesn't accumulate time
- `testBackgroundForegroundHandling()` - Proper handling of app state changes
- `testMemoryManagement()` - No memory leaks with repeated sessions

### APIServiceTests.swift
Tests API communication and security:
- **Rate Limiting**: Protection against excessive requests
- **Memory Management**: Bounded growth of rate limiting storage
- **Error Handling**: Proper HTTP status code handling
- **Concurrency**: Multiple simultaneous requests
- **Performance**: Request overhead and memory usage

Key Security Tests:
- `testRateLimitingWithinLimit()` - Normal operation within rate limits
- `testRateLimitingMemoryManagement()` - Memory doesn't grow unbounded
- `testConcurrentRequests()` - Thread-safe concurrent operations
- `testAuthenticationHeaders()` - Proper auth token handling

### KeychainSecureStorageTests.swift
Tests secure storage implementation:
- **Basic Operations**: Store, retrieve, delete, exists
- **Data Integrity**: Correct data storage and retrieval
- **Error Handling**: Graceful handling of keychain errors
- **Security Attributes**: Proper accessibility settings
- **Concurrent Access**: Thread-safe operations

Key Security Tests:
- `testStoreAndRetrieveData()` - Basic secure storage functionality
- `testSecurityAttributes()` - Verifies proper keychain security attributes
- `testConcurrentAccess()` - Thread-safe concurrent operations
- `testLargeDataStorage()` - Handles large data without corruption

## Running the Tests

### Prerequisites
1. Xcode 14.0 or later
2. iOS 15.0+ deployment target
3. Swift 5.7+

### Setup Instructions

1. **Add Test Target to Xcode Project**:
   - Open `StreamApp.xcodeproj`
   - Add a new Test target if not already present
   - Name it `StreamAppTests`
   - Set the target to be tested as `StreamApp`

2. **Add Test Files**:
   - Add all `.swift` test files to the `StreamAppTests` target
   - Ensure `@testable import StreamApp` can access the main app module

3. **Configure Test Bundle**:
   - Use the provided `Info.plist` for the test bundle
   - Set bundle identifier to `com.stream-protocol.app.tests`

4. **Expose Private Methods for Testing**:
   Some tests require access to private methods. Add these extensions to the main app code:

   ```swift
   // In WalletManager.swift - for testing only
   #if DEBUG
   extension WalletManager {
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
   #endif
   ```

### Running Tests

**Command Line** (using xcodebuild):
```bash
xcodebuild test -project StreamApp.xcodeproj -scheme StreamApp -destination 'platform=iOS Simulator,name=iPhone 14,OS=latest'
```

**Xcode IDE**:
1. Select the `StreamApp` scheme
2. Go to Product → Test (⌘U)
3. Or use Test Navigator to run individual test classes

**Individual Test Classes**:
```bash
# Run specific test class
xcodebuild test -project StreamApp.xcodeproj -scheme StreamApp -destination 'platform=iOS Simulator,name=iPhone 14,OS=latest' -only-testing:StreamAppTests/WalletManagerTests

# Run specific test method
xcodebuild test -project StreamApp.xcodeproj -scheme StreamApp -destination 'platform=iOS Simulator,name=iPhone 14,OS=latest' -only-testing:StreamAppTests/WalletManagerTests/testSecureRandomGeneration
```

## Test Coverage

The test suite covers the critical security fixes and functionality:

### Security Fixes Tested:
1. ✅ **Secure Random Generation** - WalletManager uses SecRandomCopyBytes
2. ✅ **Keychain Error Handling** - Proper cleanup on storage failures  
3. ✅ **Address Derivation** - Consistent Ethereum address generation
4. ✅ **Input Validation** - ZKProof input sanitization
5. ✅ **Rate Limiting** - API request throttling and memory management
6. ✅ **Timer Management** - Accurate session time tracking
7. ✅ **Thread Safety** - Concurrent operation safety

### Performance Testing:
- Cryptographic operations performance
- Memory usage under load
- API request overhead
- Session tracking accuracy

## Expected Test Results

**Total Tests**: ~80 test methods across 5 test classes

**Typical Run Time**: 30-60 seconds depending on hardware

**Expected Failures**: 
- Some network-related tests may fail if run without proper mocking
- ZKProofService tests may skip if JavaScript files are missing
- Performance tests may vary based on simulator/device performance

## Troubleshooting

### Common Issues:

1. **Missing JavaScript Files**:
   ```
   Error: ZKProofService not available - missing JS files
   ```
   Solution: Ensure `zkproof_service.js`, `wage_proof.wasm`, and `verification_key.json` are in the app bundle.

2. **Keychain Access Denied**:
   ```
   Error: Keychain operation failed with status -25308
   ```
   Solution: Reset iOS Simulator or ensure proper keychain entitlements.

3. **Network Timeouts**:
   ```
   Error: The request timed out
   ```
   Solution: Expected for tests that make real network requests. Consider mocking.

4. **Memory Warnings**:
   ```
   Warning: Memory usage test completed but with warnings
   ```
   Solution: Close other simulator apps, increase simulator memory allocation.

### Debug Tips:

1. **Enable Test Debugging**:
   - Set breakpoints in test methods
   - Use `print()` statements for debugging
   - Check Xcode's Test Navigator for detailed results

2. **Performance Analysis**:
   - Use Xcode's Instruments for memory profiling
   - Monitor CPU usage during performance tests
   - Check for retain cycles in concurrent tests

3. **Test Isolation**:
   - Each test method runs in isolation
   - `setUp()` and `tearDown()` ensure clean state
   - Use separate test keys/data for each test

## Integration with CI/CD

For continuous integration, add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    xcodebuild test \
      -project StreamApp.xcodeproj \
      -scheme StreamApp \
      -destination 'platform=iOS Simulator,name=iPhone 14,OS=latest' \
      -resultBundlePath TestResults.xcresult
      
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: TestResults.xcresult
```

## Maintenance

- **Update tests** when adding new functionality
- **Review security tests** after any cryptographic changes
- **Monitor performance tests** for regression detection
- **Keep mocks updated** with API changes

This test suite provides a solid foundation for ensuring the critical functionality works correctly and securely.
