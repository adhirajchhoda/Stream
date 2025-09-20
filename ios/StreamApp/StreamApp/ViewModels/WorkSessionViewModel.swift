import Foundation
import Combine

@MainActor
class WorkSessionViewModel: ObservableObject {
    @Published var isSessionActive = false
    @Published var currentScenario: WorkScenario?
    @Published var sessionData = SessionData()
    @Published var sessionStats = SessionStats()
    @Published var recentSessions: [CompletedSession] = []

    private var sessionTimer: Timer?
    private var sessionStartTime: Date?
    private var pausedDuration: TimeInterval = 0

    init() {
        loadSessionStats()
        loadRecentSessions()
    }

    func startSession(with scenario: WorkScenario) {
        currentScenario = scenario
        sessionStartTime = Date()
        pausedDuration = 0
        isSessionActive = true

        sessionData = SessionData(
            status: .active,
            elapsedTime: 0,
            currentEarnings: 0
        )

        startTimer()
    }

    func togglePause() {
        if sessionData.status == .active {
            pauseSession()
        } else {
            resumeSession()
        }
    }

    func endSession() {
        stopTimer()

        guard let scenario = currentScenario,
              let startTime = sessionStartTime else { return }

        let totalDuration = sessionData.elapsedTime
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

        // Add to recent sessions
        recentSessions.insert(completedSession, at: 0)
        if recentSessions.count > 10 {
            recentSessions.removeLast()
        }

        // Update stats
        sessionStats.hoursWorked += totalDuration / 3600
        sessionStats.totalEarned += earnings
        sessionStats.sessionsCompleted += 1

        // Save data
        saveSessionStats()
        saveRecentSessions()

        // Reset session
        resetSession()
    }

    // MARK: - Private Methods

    private func pauseSession() {
        sessionData.status = .paused
        stopTimer()
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
        stopTimer()
    }

    private func startTimer() {
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateSessionData()
            }
        }
    }

    private func stopTimer() {
        sessionTimer?.invalidate()
        sessionTimer = nil
    }

    private func updateSessionData() {
        guard let startTime = sessionStartTime,
              let scenario = currentScenario,
              sessionData.status == .active else { return }

        let totalElapsed = Date().timeIntervalSince(startTime) - pausedDuration
        sessionData.elapsedTime = totalElapsed
        sessionData.currentEarnings = (totalElapsed / 3600) * scenario.hourlyRate
    }

    private func loadSessionStats() {
        // Load from UserDefaults or Core Data
        sessionStats = SessionStats(
            hoursWorked: UserDefaults.standard.double(forKey: "session_hours_worked"),
            totalEarned: UserDefaults.standard.double(forKey: "session_total_earned"),
            sessionsCompleted: UserDefaults.standard.integer(forKey: "session_sessions_completed")
        )
    }

    private func saveSessionStats() {
        UserDefaults.standard.set(sessionStats.hoursWorked, forKey: "session_hours_worked")
        UserDefaults.standard.set(sessionStats.totalEarned, forKey: "session_total_earned")
        UserDefaults.standard.set(sessionStats.sessionsCompleted, forKey: "session_sessions_completed")
    }

    private func loadRecentSessions() {
        // Load from UserDefaults or Core Data
        if let data = UserDefaults.standard.data(forKey: "recent_sessions"),
           let sessions = try? JSONDecoder().decode([CompletedSession].self, from: data) {
            recentSessions = sessions
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

enum SessionStatus {
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