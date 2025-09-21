import Foundation
import SwiftUI
import Combine

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var workScenarios: [WorkScenario] = []
    @Published var recentAttestations: [AttestationResponse] = []
    @Published var totalAvailableWages: Double = 0
    @Published var pendingClaims: Int = 0
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService: APIServiceProtocol
    private let walletManager: WalletManager
    private var cancellables = Set<AnyCancellable>()
    
    // Thread safety for concurrent operations
    private let loadingQueue = DispatchQueue(label: "com.stream.dashboard.loading", qos: .userInitiated)

    init(apiService: APIServiceProtocol = APIService(), walletManager: WalletManager) {
        self.apiService = apiService
        self.walletManager = walletManager

        setupBindings()
    }
    
    deinit {
        // Explicitly cancel all subscriptions to prevent memory leaks
        cancellables.removeAll()
    }

    func loadData() async {
        await setLoadingState(true)
        
        do {
            // Use TaskGroup for concurrent loading with proper error handling
            try await withThrowingTaskGroup(of: Void.self) { group in
                group.addTask { [weak self] in
                    try await self?.loadWorkScenarios()
                }
                
                group.addTask { [weak self] in
                    try await self?.loadRecentAttestations()
                }
                
                // Wait for all tasks to complete
                for try await _ in group {}
            }
            
            await calculateTotals()
            await clearError()
            
        } catch {
            await setError(error.localizedDescription)
        }
        
        await setLoadingState(false)
    }

    func refresh() async {
        await loadData()
    }

    // MARK: - Private Methods

    private func setupBindings() {
        // Listen for wallet changes with proper memory management
        walletManager.$connectedWallet
            .compactMap { $0 }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] wallet in
                Task { @MainActor [weak self] in
                    await self?.loadData()
                }
            }
            .store(in: &cancellables)
    }

    private func loadWorkScenarios() async throws {
        return try await withCheckedThrowingContinuation { continuation in
            loadingQueue.async {
                // Simulate network delay for demo
                Thread.sleep(forTimeInterval: 0.1)
                
                Task { @MainActor in
                    // For demo purposes, we'll use sample data
                    // In production, this would fetch from API
                    self.workScenarios = WorkScenario.sampleScenarios
                    continuation.resume()
                }
            }
        }
    }

    private func loadRecentAttestations() async throws {
        guard let walletAddress = walletManager.connectedWallet?.address else {
            await MainActor.run {
                self.recentAttestations = []
            }
            return
        }

        do {
            let attestations = try await apiService.getEmployeeAttestations(walletAddress)
            await MainActor.run {
                self.recentAttestations = Array(attestations.prefix(5)) // Show only recent 5
            }
        } catch {
            // For demo purposes, use sample data if API fails
            await MainActor.run {
                self.recentAttestations = AttestationResponse.sampleAttestations
            }
        }
    }

    private func calculateTotals() async {
        // Access @Published properties on main actor
        let scenarios = workScenarios
        let attestations = recentAttestations
        
        return await withCheckedContinuation { continuation in
            loadingQueue.async {
                let totalWages = scenarios.reduce(0) { total, scenario in
                    total + scenario.totalWage
                }
                
                let pending = attestations.filter { $0.status == .pending }.count
                
                Task { @MainActor in
                    self.totalAvailableWages = totalWages
                    self.pendingClaims = pending
                    continuation.resume()
                }
            }
        }
    }
    
    // MARK: - Thread-Safe State Updates
    
    private func setLoadingState(_ loading: Bool) async {
        isLoading = loading
    }
    
    private func setError(_ message: String) async {
        errorMessage = message
    }
    
    private func clearError() async {
        errorMessage = nil
    }
}
