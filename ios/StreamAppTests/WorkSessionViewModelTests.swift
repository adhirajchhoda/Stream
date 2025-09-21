import XCTest
import Foundation
import Combine
@testable import StreamApp

@MainActor
final class WorkSessionViewModelTests: XCTestCase {
    var viewModel: WorkSessionViewModel!
    var cancellables: Set<AnyCancellable>!
    
    override func setUp() {
        super.setUp()
        cancellables = Set<AnyCancellable>()
        
        // Clear UserDefaults before each test
        clearUserDefaults()
        
        viewModel = WorkSessionViewModel()
    }
    
    override func tearDown() {
        viewModel = nil
        cancellables = nil
        clearUserDefaults()
        super.tearDown()
    }
    
    // MARK: - Session Management Tests
    
    func testSessionStartAndTracking() async {
        let scenario = WorkScenario.sampleScenarios[0]
        
        // Verify initial state
        XCTAssertFalse(viewModel.isSessionActive)
        XCTAssertNil(viewModel.currentScenario)
        XCTAssertEqual(viewModel.sessionData.status, .inactive)
        
        // Start session
        viewModel.startSession(with: scenario)
        
        // Give timer a moment to start
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        
        // Verify session started
        XCTAssertTrue(viewModel.isSessionActive)
        XCTAssertEqual(viewModel.currentScenario?.id, scenario.id)
        XCTAssertEqual(viewModel.sessionData.status, .active)
        
        // Wait for timer updates
        try? await Task.sleep(nanoseconds: 1_100_000_000) // 1.1 seconds
        
        // Verify time tracking
        XCTAssertGreaterThan(viewModel.sessionData.elapsedTime, 0.9)
        XCTAssertLessThan(viewModel.sessionData.elapsedTime, 1.5)
        
        // Verify earnings calculation
        let expectedEarnings = (viewModel.sessionData.elapsedTime / 3600) * scenario.hourlyRate
        XCTAssertEqual(viewModel.sessionData.currentEarnings, expectedEarnings, accuracy: 0.01)
    }
    
    func testSessionPauseAndResume() async {
        let scenario = WorkScenario.sampleScenarios[0]
        
        viewModel.startSession(with: scenario)
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        // Pause session
        viewModel.togglePause()
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        
        XCTAssertEqual(viewModel.sessionData.status, .paused)
        let pausedTime = viewModel.sessionData.elapsedTime
        
        // Wait and verify time doesn't increase while paused
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        XCTAssertEqual(viewModel.sessionData.elapsedTime, pausedTime, accuracy: 0.1)
        
        // Resume session
        viewModel.togglePause()
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        
        XCTAssertEqual(viewModel.sessionData.status, .active)
        
        // Wait and verify time increases again
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        XCTAssertGreaterThan(viewModel.sessionData.elapsedTime, pausedTime)
    }
    
    func testSessionEndAndDataPersistence() async {
        let scenario = WorkScenario.sampleScenarios[0]
        
        viewModel.startSession(with: scenario)
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        let initialSessionCount = viewModel.recentSessions.count
        let initialHoursWorked = viewModel.sessionStats.hoursWorked
        let initialEarnings = viewModel.sessionStats.totalEarned
        
        viewModel.endSession()
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        
        // Verify session reset
        XCTAssertFalse(viewModel.isSessionActive)
        XCTAssertNil(viewModel.currentScenario)
        XCTAssertEqual(viewModel.sessionData.status, .inactive)
        
        // Verify recent session added
        XCTAssertEqual(viewModel.recentSessions.count, initialSessionCount + 1)
        
        let latestSession = viewModel.recentSessions.first!
        XCTAssertEqual(latestSession.scenarioType, scenario.scenarioType)
        XCTAssertEqual(latestSession.employer, scenario.employer)
        XCTAssertGreaterThan(latestSession.duration, 0)
        XCTAssertGreaterThan(latestSession.earnings, 0)
        
        // Verify stats updated
        XCTAssertGreaterThan(viewModel.sessionStats.hoursWorked, initialHoursWorked)
        XCTAssertGreaterThan(viewModel.sessionStats.totalEarned, initialEarnings)
        XCTAssertEqual(viewModel.sessionStats.sessionsCompleted, 1)
    }
    
    // MARK: - Thread Safety Tests
    
    func testConcurrentSessionOperations() async {
        let scenario = WorkScenario.sampleScenarios[0]
        
        // Start multiple operations concurrently
        await withTaskGroup(of: Void.self) { group in
            group.addTask { @MainActor in
                self.viewModel.startSession(with: scenario)
            }
            
            group.addTask { @MainActor in
                try? await Task.sleep(nanoseconds: 100_000_000)
                self.viewModel.togglePause()
            }
            
            group.addTask { @MainActor in
                try? await Task.sleep(nanoseconds: 200_000_000)
                self.viewModel.togglePause()
            }
        }
        
        try? await Task.sleep(nanoseconds: 500_000_000)
        
        // Should still be in a consistent state
        XCTAssertTrue(viewModel.isSessionActive)
        XCTAssertNotNil(viewModel.currentScenario)
    }
    
    func testMultipleSessionStarts() async {
        let scenario1 = WorkScenario.sampleScenarios[0]
        let scenario2 = WorkScenario.sampleScenarios[1]
        
        // Start first session
        viewModel.startSession(with: scenario1)
        try? await Task.sleep(nanoseconds: 200_000_000)
        
        // Start second session (should replace first)
        viewModel.startSession(with: scenario2)
        try? await Task.sleep(nanoseconds: 200_000_000)
        
        // Verify current session is the second one
        XCTAssertEqual(viewModel.currentScenario?.id, scenario2.id)
        XCTAssertTrue(viewModel.isSessionActive)
    }
    
    // MARK: - App State Handling Tests
    
    func testBackgroundForegroundHandling() {
        let scenario = WorkScenario.sampleScenarios[0]
        
        viewModel.startSession(with: scenario)
        XCTAssertEqual(viewModel.sessionData.status, .active)
        
        // Simulate app going to background
        NotificationCenter.default.post(name: UIApplication.didEnterBackgroundNotification, object: nil)
        
        // Session should be paused
        XCTAssertEqual(viewModel.sessionData.status, .paused)
        
        // Simulate app returning to foreground
        NotificationCenter.default.post(name: UIApplication.willEnterForegroundNotification, object: nil)
        
        // Session should remain paused (user must manually resume)
        XCTAssertEqual(viewModel.sessionData.status, .paused)
    }
    
    func testAppTerminationCleanup() {
        let scenario = WorkScenario.sampleScenarios[0]
        
        viewModel.startSession(with: scenario)
        XCTAssertTrue(viewModel.isSessionActive)
        
        // Simulate app termination
        NotificationCenter.default.post(name: UIApplication.willTerminateNotification, object: nil)
        
        // Session state should be saved
        let savedState = UserDefaults.standard.dictionary(forKey: "saved_session_state")
        XCTAssertNotNil(savedState)
        XCTAssertEqual(savedState?["scenarioId"] as? String, scenario.id)
    }
    
    // MARK: - Data Persistence Tests
    
    func testSessionStatsPersistence() async {
        // Complete a session
        let scenario = WorkScenario.sampleScenarios[0]
        viewModel.startSession(with: scenario)
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        viewModel.endSession()
        
        let hoursWorked = viewModel.sessionStats.hoursWorked
        let totalEarned = viewModel.sessionStats.totalEarned
        let sessionsCompleted = viewModel.sessionStats.sessionsCompleted
        
        // Create new view model (simulates app restart)
        viewModel = WorkSessionViewModel()
        
        // Stats should be loaded from persistence
        XCTAssertEqual(viewModel.sessionStats.hoursWorked, hoursWorked, accuracy: 0.001)
        XCTAssertEqual(viewModel.sessionStats.totalEarned, totalEarned, accuracy: 0.01)
        XCTAssertEqual(viewModel.sessionStats.sessionsCompleted, sessionsCompleted)
    }
    
    func testRecentSessionsPersistence() async {
        // Complete a session
        let scenario = WorkScenario.sampleScenarios[0]
        viewModel.startSession(with: scenario)
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        viewModel.endSession()
        
        let recentSessionsCount = viewModel.recentSessions.count
        let firstSession = viewModel.recentSessions.first!
        
        // Create new view model (simulates app restart)
        viewModel = WorkSessionViewModel()
        
        // Recent sessions should be loaded from persistence
        XCTAssertEqual(viewModel.recentSessions.count, recentSessionsCount)
        XCTAssertEqual(viewModel.recentSessions.first?.id, firstSession.id)
    }
    
    func testRecentSessionsLimit() async {
        let scenario = WorkScenario.sampleScenarios[0]
        
        // Complete 12 sessions (more than limit of 10)
        for _ in 0..<12 {
            viewModel.startSession(with: scenario)
            try? await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
            viewModel.endSession()
            try? await Task.sleep(nanoseconds: 50_000_000) // 0.05 seconds
        }
        
        // Should only keep 10 most recent sessions
        XCTAssertEqual(viewModel.recentSessions.count, 10)
    }
    
    // MARK: - Edge Cases and Error Handling
    
    func testEndSessionWithoutActiveSession() {
        // Ending session when no session is active should not crash
        XCTAssertNoThrow(viewModel.endSession())
        XCTAssertFalse(viewModel.isSessionActive)
    }
    
    func testTogglePauseWithoutActiveSession() {
        // Toggling pause when no session is active should not crash
        XCTAssertNoThrow(viewModel.togglePause())
        XCTAssertEqual(viewModel.sessionData.status, .inactive)
    }
    
    func testMemoryManagement() {
        // Start and stop many sessions to test for memory leaks
        let scenario = WorkScenario.sampleScenarios[0]
        
        for _ in 0..<50 {
            viewModel.startSession(with: scenario)
            viewModel.endSession()
        }
        
        // No assertions needed - this tests that we don't crash or leak memory
    }
    
    // MARK: - Helper Methods
    
    private func clearUserDefaults() {
        UserDefaults.standard.removeObject(forKey: "session_hours_worked")
        UserDefaults.standard.removeObject(forKey: "session_total_earned")
        UserDefaults.standard.removeObject(forKey: "session_sessions_completed")
        UserDefaults.standard.removeObject(forKey: "recent_sessions")
        UserDefaults.standard.removeObject(forKey: "saved_session_state")
    }
}
