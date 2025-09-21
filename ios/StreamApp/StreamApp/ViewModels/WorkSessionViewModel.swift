import Foundation
import SwiftUI
import Combine

@MainActor
class WorkSessionViewModel: ObservableObject {
    @Published var isSessionActive = false
    @Published var currentScenario: WorkScenario?
    @Published var sessionData = SessionData()
    @Published var sessionStats = SessionStats()
    @Published var recentSessions: [CompletedSession] = []

    // Thread-safe session tracking
    private let sessionQueue = DispatchQueue(label: "com.stream.session", qos: .userInitiated)
    private var sessionTimer: Timer?
    private var sessionStartTime: Date?
    private var pausedDuration: TimeInterval = 0
    private var backgroundEnteredTime: Date?
    
    // App state monitoring
    private var cancellables = Set<AnyCancellable>()

    init() {
        loadSessionStats()
        loadRecentSessions()
        setupAppStateObservers()
    }
    
    deinit {
        // Clean up resources immediately - don't create new tasks in deinit
        sessionTimer?.invalidate()
        sessionTimer = nil
        cancellables.removeAll()
    }

    func startSession(with scenario: WorkScenario) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            
            Task { @MainActor in
                self.currentScenario = scenario
                self.sessionStartTime = Date()
                self.pausedDuration = 0
                self.isSessionActive = true

                self.sessionData = SessionData(
                    status: .active,
                    elapsedTime: 0,
                    currentEarnings: 0
                )

                self.startTimer()
            }
        }
    }

    func togglePause() {
        sessionQueue.async { [weak self] in
            Task { @MainActor in
                if self?.sessionData.status == .active {
                    self?.pauseSession()
                } else {
                    self?.resumeSession()
                }
            }
        }
    }

    func endSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            
            Task { @MainActor in
                self.stopTimer()

                guard let scenario = self.currentScenario,
                      let startTime = self.sessionStartTime else { return }

                let totalDuration = self.sessionData.elapsedTime
                let earnings = totalDuration / 3600 * scenario.hourlyRate

                let completedSession = CompletedSession(
                    id: UUID().uuidString,
                    scenarioType: scenario.scenarioType,
                    employer: scenario.employer,
                    position: scenario.position,
                    duration: totalDuration / 3600,
                    earnings: earnings,
                    completedAt: Date()
                )

                // Add to recent sessions (thread-safe)
                self.addRecentSession(completedSession)

                // Update stats (thread-safe)
                self.updateSessionStats(duration: totalDuration / 3600, earnings: earnings)

                // Reset session
                self.resetSession()
            }
        }
    }

    // MARK: - Private Methods

    private func pauseSession() {
        sessionData.status = .paused
        stopTimer()
        
        // Store current pause time for accurate calculations
        if let startTime = sessionStartTime {
            let currentElapsed = Date().timeIntervalSince(startTime) - pausedDuration
            sessionData.elapsedTime = currentElapsed
        }
    }

    private func resumeSession() {
        sessionData.status = .active
        startTimer()
    }

    private func resetSession() {
        isSessionActive = false
        currentScenario = nil
        sessionData = SessionData()
        sessionStartTime = nil
        pausedDuration = 0
        backgroundEnteredTime = nil
        stopTimer()
    }

    private func startTimer() {
        stopTimer() // Ensure no duplicate timers
        
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateSessionData()
            }
        }
        
        // Ensure timer continues in background
        RunLoop.current.add(sessionTimer!, forMode: .common)
    }

    private func stopTimer() {
        sessionTimer?.invalidate()
        sessionTimer = nil
    }

    private func updateSessionData() {
        Task { @MainActor in
            guard let startTime = sessionStartTime,
                  let scenario = currentScenario else { return }
            
            guard sessionData.status == .active else { return }

            let totalElapsed = Date().timeIntervalSince(startTime) - pausedDuration
            sessionData.elapsedTime = totalElapsed
            sessionData.currentEarnings = (totalElapsed / 3600) * scenario.hourlyRate
        }
    }
    
    private func addRecentSession(_ session: CompletedSession) {
        sessionQueue.async { [weak self] in
            Task { @MainActor in
                self?.recentSessions.insert(session, at: 0)
                if let sessions = self?.recentSessions, sessions.count > 10 {
                    self?.recentSessions.removeLast()
                }
                self?.saveRecentSessions()
            }
        }
    }
    
    private func updateSessionStats(duration: Double, earnings: Double) {
        sessionQueue.async { [weak self] in
            Task { @MainActor in
                self?.sessionStats.hoursWorked += duration
                self?.sessionStats.totalEarned += earnings
                self?.sessionStats.sessionsCompleted += 1
                self?.saveSessionStats()
            }
        }
    }

    // MARK: - App State Management
    
    private func setupAppStateObservers() {
        // Monitor app going to background
        NotificationCenter.default.publisher(for: UIApplication.didEnterBackgroundNotification)
            .sink { [weak self] _ in
                self?.handleAppDidEnterBackground()
            }
            .store(in: &cancellables)
        
        // Monitor app returning to foreground
        NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)
            .sink { [weak self] _ in
                self?.handleAppWillEnterForeground()
            }
            .store(in: &cancellables)
        
        // Monitor app termination
        NotificationCenter.default.publisher(for: UIApplication.willTerminateNotification)
            .sink { [weak self] _ in
                self?.handleAppWillTerminate()
            }
            .store(in: &cancellables)
    }
    
    private func handleAppDidEnterBackground() {
        sessionQueue.async { [weak self] in
            Task { @MainActor in
                // Record when app went to background for accurate time calculations
                self?.backgroundEnteredTime = Date()
                
                // Pause active sessions to prevent inaccurate time tracking
                if self?.sessionData.status == .active {
                    self?.pauseSession()
                }
            }
        }
    }
    
    private func handleAppWillEnterForeground() {
        sessionQueue.async { [weak self] in
            Task { @MainActor in
                // Calculate time spent in background and add to paused duration
                if let backgroundTime = self?.backgroundEnteredTime {
                    let backgroundDuration = Date().timeIntervalSince(backgroundTime)
                    self?.pausedDuration += backgroundDuration
                }
                self?.backgroundEnteredTime = nil
                
                // Note: Don't auto-resume - let user decide to resume session
            }
        }
    }
    
    private func handleAppWillTerminate() {
        cleanupSession()
    }
    
    private func cleanupSession() {
        stopTimer()
        
        // Save current session state if active
        if isSessionActive {
            saveSessionState()
        }
    }
    
    private func saveSessionState() {
        // Save current session to be potentially restored on next launch
        guard let scenario = currentScenario,
              let startTime = sessionStartTime else { return }
        
        let sessionState: [String: Any] = [
            "scenarioId": scenario.id,
            "startTime": startTime.timeIntervalSince1970,
            "pausedDuration": pausedDuration,
            "status": sessionData.status.rawValue
        ]
        
        UserDefaults.standard.set(sessionState, forKey: "saved_session_state")
    }

    // MARK: - Data Persistence

    private func loadSessionStats() {
        sessionQueue.async { [weak self] in
            Task { @MainActor in
                // Load from UserDefaults or Core Data
                self?.sessionStats = SessionStats(
                    hoursWorked: UserDefaults.standard.double(forKey: "session_hours_worked"),
                    totalEarned: UserDefaults.standard.double(forKey: "session_total_earned"),
                    sessionsCompleted: UserDefaults.standard.integer(forKey: "session_sessions_completed")
                )
            }
        }
    }

    private func saveSessionStats() {
        UserDefaults.standard.set(sessionStats.hoursWorked, forKey: "session_hours_worked")
        UserDefaults.standard.set(sessionStats.totalEarned, forKey: "session_total_earned")
        UserDefaults.standard.set(sessionStats.sessionsCompleted, forKey: "session_sessions_completed")
    }

    private func loadRecentSessions() {
        sessionQueue.async { [weak self] in
            Task { @MainActor in
                // Load from UserDefaults or Core Data
                if let data = UserDefaults.standard.data(forKey: "recent_sessions"),
                   let sessions = try? JSONDecoder().decode([CompletedSession].self, from: data) {
                    self?.recentSessions = sessions
                }
            }
        }
    }

    private func saveRecentSessions() {
        if let data = try? JSONEncoder().encode(recentSessions) {
            UserDefaults.standard.set(data, forKey: "recent_sessions")
        }
    }
}

// MARK: - Supporting Types

struct SessionData {
    var status: SessionStatus = .inactive
    var elapsedTime: TimeInterval = 0
    var currentEarnings: Double = 0
}

enum SessionStatus: String, CaseIterable {
    case inactive
    case active
    case paused

    var displayName: String {
        switch self {
        case .inactive: return "Inactive"
        case .active: return "Active"
        case .paused: return "Paused"
        }
    }

    var color: Color {
        switch self {
        case .inactive: return StreamColors.textSecondary
        case .active: return StreamColors.success
        case .paused: return StreamColors.warning
        }
    }
}

struct SessionStats {
    var hoursWorked: Double = 0
    var totalEarned: Double = 0
    var sessionsCompleted: Int = 0
}

struct CompletedSession: Identifiable, Codable {
    let id: String
    let scenarioType: ScenarioType
    let employer: String
    let position: String
    let duration: Double // in hours
    let earnings: Double
    let completedAt: Date
}
