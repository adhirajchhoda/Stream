# Stream Protocol - iOS App Architecture & Design

## 🧠 UltraThink & Sequential Analysis

### Phase 1: Architecture Foundation

#### Core App Structure
```
StreamApp/
├── StreamApp/                      # Main app target
│   ├── App/                       # App lifecycle & configuration
│   ├── Core/                      # Core business logic
│   ├── Network/                   # API integration layer
│   ├── Security/                  # Cryptography & ZK-proof handling
│   ├── Models/                    # Data models
│   ├── Views/                     # SwiftUI views
│   ├── ViewModels/               # MVVM view models
│   ├── Utils/                     # Utilities & extensions
│   └── Resources/                # Assets, colors, fonts
├── StreamAppTests/               # Unit tests
├── StreamAppUITests/            # UI tests
└── Packages/                    # Swift Package dependencies
```

#### Architecture Pattern: MVVM + Coordinator
- **MVVM**: Clean separation of UI, business logic, and data
- **Coordinator**: Navigation flow management
- **Repository**: Data access abstraction
- **Dependency Injection**: Loose coupling and testability

### Phase 2: User Experience Design

#### User Personas & Flows

**1. Employee (Primary User)**
```
Onboarding Flow:
1. Welcome Screen with Stream Protocol branding
2. What is Stream? (Educational carousel)
3. Connect Wallet (MetaMask/WalletConnect integration)
4. Biometric Authentication Setup
5. Select Work Scenario (Starbucks/Amazon/Uber)

Main App Flow:
1. Dashboard (Current wages, pending proofs)
2. Work Session Tracking
3. Generate ZK-Proof for wage claim
4. Submit Claim to Smart Contract
5. Track Payment Status
```

**2. Employer (Secondary User)**
```
Employer Flow:
1. Register Company
2. Upload Employee Work Data
3. Approve/Deny Wage Claims
4. View Analytics & Reports
```

#### UI Design System

**Color Palette:**
```swift
struct StreamColors {
    // Primary Brand Colors
    static let streamBlue = Color(hex: "2196F3")      // Primary blue
    static let streamGreen = Color(hex: "4CAF50")     // Success green
    static let streamOrange = Color(hex: "FF9800")    // Warning orange
    static let streamRed = Color(hex: "F44336")       // Error red

    // Scenario Theme Colors
    static let starbucksGreen = Color(hex: "00704A")  // Starbucks theme
    static let amazonOrange = Color(hex: "FF9900")    // Amazon theme
    static let uberCyan = Color(hex: "00BCD4")        // Uber theme

    // Neutral Colors
    static let background = Color(hex: "F8FAFB")      // Light background
    static let surface = Color(hex: "FFFFFF")         // Card surfaces
    static let textPrimary = Color(hex: "1A1A1A")     // Primary text
    static let textSecondary = Color(hex: "666666")   // Secondary text
}
```

**Typography:**
```swift
struct StreamFonts {
    static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)
    static let title1 = Font.system(size: 28, weight: .semibold, design: .rounded)
    static let title2 = Font.system(size: 22, weight: .semibold, design: .rounded)
    static let headline = Font.system(size: 17, weight: .semibold, design: .rounded)
    static let body = Font.system(size: 17, weight: .regular, design: .default)
    static let callout = Font.system(size: 16, weight: .regular, design: .default)
    static let caption = Font.system(size: 12, weight: .regular, design: .default)
}
```

### Phase 3: Technical Implementation Strategy

#### 1. Network Layer Architecture
```swift
protocol APIServiceProtocol {
    func registerEmployer(_ request: EmployerRegistrationRequest) async throws -> EmployerResponse
    func createAttestation(_ request: AttestationRequest) async throws -> AttestationResponse
    func verifyAttestation(_ id: String) async throws -> VerificationResponse
    func getEmployeeAttestations(_ wallet: String) async throws -> [AttestationResponse]
}

class APIService: APIServiceProtocol {
    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder

    // Rate limiting & retry logic
    // Authentication handling
    // Error mapping
}
```

#### 2. ZK-Proof Integration Strategy
```swift
protocol ZKProofServiceProtocol {
    func generateWageProof(_ data: WageData) async throws -> ZKProof
    func verifyProof(_ proof: ZKProof) async throws -> Bool
}

class ZKProofService: ZKProofServiceProtocol {
    // Integration with existing circuits/src/zkproof_service.js
    // WebAssembly wrapper for iOS
    // Proof generation optimization
}
```

#### 3. Blockchain Integration
```swift
protocol Web3ServiceProtocol {
    func connectWallet() async throws -> WalletConnection
    func submitProofToContract(_ proof: ZKProof) async throws -> TransactionResult
    func checkClaimStatus(_ txHash: String) async throws -> ClaimStatus
}

class Web3Service: Web3ServiceProtocol {
    // Web3.swift integration
    // StreamCore contract interaction
    // Gas optimization
}
```

### Phase 4: Beautiful UI Components

#### Custom UI Components

**1. WageCard Component**
```swift
struct WageCard: View {
    let scenario: WorkScenario
    let amount: Double
    let status: ClaimStatus

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                ScenarioIcon(scenario.type)
                VStack(alignment: .leading) {
                    Text(scenario.employer)
                        .font(StreamFonts.headline)
                    Text(scenario.position)
                        .font(StreamFonts.callout)
                        .foregroundColor(StreamColors.textSecondary)
                }
                Spacer()
                StatusBadge(status)
            }

            HStack {
                Text("$\(amount, specifier: "%.2f")")
                    .font(StreamFonts.title1)
                    .foregroundColor(scenario.themeColor)
                Spacer()
                Button("Claim Now") {
                    // Claim action
                }
                .buttonStyle(StreamButtonStyle())
            }
        }
        .padding()
        .background(StreamColors.surface)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 8)
    }
}
```

**2. ZK-Proof Progress Component**
```swift
struct ZKProofProgress: View {
    let progress: Double
    let stage: ProofStage

    var body: some View {
        VStack(spacing: 20) {
            CircularProgressView(progress: progress)
                .frame(width: 120, height: 120)

            VStack(spacing: 8) {
                Text(stage.title)
                    .font(StreamFonts.headline)
                Text(stage.description)
                    .font(StreamFonts.callout)
                    .foregroundColor(StreamColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
    }
}
```

#### Screen Designs

**1. Dashboard Screen**
- Header with user avatar and balance
- Work scenario cards (Starbucks, Amazon, Uber)
- Recent claims list
- ZK-proof generation status
- Quick actions (Start Work, View History)

**2. Work Session Screen**
- Timer for current work session
- Real-time wage calculation
- Break tracking
- Photo/location verification
- End session with proof generation

**3. Proof Generation Screen**
- Animated ZK-proof generation process
- Progress indicators for each step
- Technical details (collapsible)
- Success/error states with clear actions

**4. Transaction Status Screen**
- Blockchain transaction tracking
- Gas fee estimation
- Confirmation status
- Payment receipt

### Phase 5: Security & Privacy Implementation

#### 1. Biometric Authentication
```swift
protocol BiometricAuthServiceProtocol {
    func setupBiometrics() async throws -> Bool
    func authenticateWithBiometrics() async throws -> Bool
    func isBiometricAvailable() -> Bool
}
```

#### 2. Secure Storage
```swift
protocol SecureStorageProtocol {
    func store(_ data: Data, for key: String) throws
    func retrieve(for key: String) throws -> Data?
    func delete(for key: String) throws
}

class KeychainSecureStorage: SecureStorageProtocol {
    // Keychain integration for sensitive data
    // Wallet private keys
    // Proof generation parameters
}
```

#### 3. Data Privacy
- Zero-knowledge proof generation locally
- Minimal data transmission
- No wage amount storage on device
- Encrypted communication with backend

### Phase 6: Performance Optimization

#### 1. Asynchronous Operations
- All network calls async/await
- Background ZK-proof generation
- Progressive UI loading
- Optimistic UI updates

#### 2. Caching Strategy
```swift
protocol CacheServiceProtocol {
    func cache<T: Codable>(_ object: T, for key: String)
    func retrieve<T: Codable>(_ type: T.Type, for key: String) -> T?
    func invalidate(for key: String)
}
```

#### 3. Memory Management
- Proper retain cycle prevention
- Large data cleanup after use
- Background task management

### Phase 7: Error Handling & User Experience

#### 1. Error Types & Handling
```swift
enum StreamError: Error, LocalizedError {
    case networkError(NetworkError)
    case zkProofError(ZKProofError)
    case walletError(WalletError)
    case validationError(String)

    var errorDescription: String? {
        // User-friendly error messages
    }

    var recoverySuggestion: String? {
        // Actionable recovery suggestions
    }
}
```

#### 2. Offline Support
- Cache critical data locally
- Queue actions for when online
- Graceful degradation of features
- Clear offline state indicators

### Phase 8: Analytics & Monitoring

#### 1. User Analytics
- Screen view tracking
- User journey analysis
- Feature usage metrics
- Error rate monitoring

#### 2. Performance Metrics
- ZK-proof generation time
- Network request latency
- App launch time
- Memory usage patterns

## Implementation Roadmap

### Sprint 1: Foundation (Week 1)
- [ ] Project setup with SwiftUI & Swift Package Manager
- [ ] Basic navigation structure
- [ ] Design system implementation
- [ ] Network layer foundation

### Sprint 2: Core Features (Week 2)
- [ ] Wallet connection integration
- [ ] API service implementation
- [ ] ZK-proof service wrapper
- [ ] Basic UI screens

### Sprint 3: Advanced Features (Week 3)
- [ ] Biometric authentication
- [ ] Work session tracking
- [ ] Proof generation UI
- [ ] Transaction monitoring

### Sprint 4: Polish & Testing (Week 4)
- [ ] UI animations & polish
- [ ] Error handling refinement
- [ ] Performance optimization
- [ ] Comprehensive testing

## Success Metrics

### Technical Metrics
- ZK-proof generation time < 30 seconds
- API response time < 500ms
- App launch time < 3 seconds
- Crash-free rate > 99.9%

### User Experience Metrics
- Onboarding completion rate > 90%
- Successful wage claim rate > 95%
- User session length > 5 minutes
- Feature adoption rate > 80%

### Security Metrics
- Zero data breaches
- All sensitive operations encrypted
- Biometric authentication rate > 85%
- Private key security maintained