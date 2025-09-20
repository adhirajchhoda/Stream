import Foundation
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

    init(apiService: APIServiceProtocol = APIService(), walletManager: WalletManager = WalletManager()) {
        self.apiService = apiService
        self.walletManager = walletManager

        setupBindings()
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let scenariosTask = loadWorkScenarios()
            async let attestationsTask = loadRecentAttestations()

            try await scenariosTask
            try await attestationsTask

            calculateTotals()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func refresh() async {
        await loadData()
    }

    // MARK: - Private Methods

    private func setupBindings() {
        // Listen for wallet changes
        walletManager.$connectedWallet
            .compactMap { $0 }
            .sink { [weak self] wallet in
                Task { @MainActor in
                    await self?.loadData()
                }
            }
            .store(in: &cancellables)
    }

    private func loadWorkScenarios() async throws {
        // For demo purposes, we'll use sample data
        // In production, this would fetch from API
        workScenarios = WorkScenario.sampleScenarios
    }

    private func loadRecentAttestations() async throws {
        guard let walletAddress = walletManager.connectedWallet?.address else {
            recentAttestations = []
            return
        }

        do {
            let attestations = try await apiService.getEmployeeAttestations(walletAddress)
            recentAttestations = Array(attestations.prefix(5)) // Show only recent 5
        } catch {
            // For demo purposes, use sample data if API fails
            recentAttestations = AttestationResponse.sampleAttestations
        }
    }

    private func calculateTotals() {
        // Calculate total available wages
        totalAvailableWages = workScenarios.reduce(0) { total, scenario in
            total + scenario.totalWage
        }

        // Calculate pending claims
        pendingClaims = recentAttestations.filter { $0.status == .pending }.count
    }
}

// MARK: - Supporting Types

extension AttestationResponse.AttestationStatus {
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