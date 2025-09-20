# Stream iOS App

A comprehensive iOS application for the Stream payroll protocol, built with SwiftUI and featuring zero-knowledge proof integration, wallet connectivity, and secure wage attestations.

## 🚀 Features

### Core Functionality
- **Wallet Integration**: Connect and manage Ethereum wallets
- **Work Session Tracking**: Track work hours across different scenarios (Starbucks, Amazon, Uber)
- **Zero-Knowledge Proofs**: Generate and verify ZK proofs for wage attestations
- **Secure Storage**: Biometric-protected keychain storage for sensitive data
- **Real-time Updates**: Live dashboard with earnings and claim status

### Security Features
- **Biometric Authentication**: Face ID/Touch ID integration
- **Secure Keychain Storage**: Encrypted storage for private keys and sensitive data
- **Anti-replay Protection**: Nullifier hash system to prevent double-spending
- **End-to-end Encryption**: Secure communication with backend services

### User Experience
- **Modern SwiftUI Design**: Clean, intuitive interface with custom components
- **Dark/Light Mode Support**: Adaptive UI design
- **Smooth Animations**: Polished transitions and micro-interactions
- **Offline Support**: Local data caching and sync capabilities

## 📱 App Architecture

### MVVM Pattern
```
StreamApp/
├── App/                    # App entry point and main views
├── Core/                   # App coordination and navigation
├── Models/                 # Data models and business logic
├── ViewModels/            # View models for MVVM architecture
├── Views/                 # SwiftUI views and components
├── Network/               # API services and networking
├── Security/              # Wallet, crypto, and security services
└── Resources/             # Colors, fonts, and styling
```

### Key Components

#### 🎯 **Dashboard**
- Real-time earnings display
- Work scenario cards with claim buttons
- Recent activity feed
- Quick action buttons

#### 💼 **Work Sessions**
- Multiple work scenarios (Starbucks, Amazon, Uber)
- Time tracking and wage calculation
- Difficulty-based scenarios
- Employer-specific theming

#### 🔐 **Zero-Knowledge Proofs**
- ZK proof generation for wage attestations
- Verification system
- Privacy-preserving claims
- Blockchain integration

#### 👤 **Profile & Settings**
- Wallet management
- Security settings
- Biometric authentication setup
- App preferences

## 🛠 Technical Stack

### Frameworks & Libraries
- **SwiftUI**: Modern declarative UI framework
- **Combine**: Reactive programming for data flow
- **CryptoKit**: Cryptographic operations
- **Security Framework**: Keychain and biometric authentication
- **Foundation**: Core system services

### Architecture Patterns
- **MVVM**: Model-View-ViewModel architecture
- **Protocol-Oriented**: Dependency injection and testability
- **Async/Await**: Modern concurrency handling
- **Combine Publishers**: Reactive data binding

### Security Implementation
- **Keychain Services**: Secure credential storage
- **Biometric Authentication**: Face ID/Touch ID integration
- **Secure Enclave**: Hardware-backed key storage
- **Certificate Pinning**: API security (production ready)

## 🚀 Getting Started

### Prerequisites
- Xcode 15.0 or later
- iOS 17.0 or later
- macOS 14.0 or later for development

### Installation
1. Clone the repository
2. Open `StreamApp.xcodeproj` in Xcode
3. Select your target device or simulator
4. Build and run (⌘+R)

### Configuration
The app includes mock data and services for development:
- **Mock Wallet**: Automatically generates demo wallet
- **Sample Scenarios**: Pre-configured work scenarios
- **Local Storage**: Uses UserDefaults and Keychain for demo

## 📋 App Flow

### 1. Onboarding
- Welcome screens
- Wallet connection setup
- Biometric authentication setup
- Permissions and privacy

### 2. Authentication
- Biometric verification
- Wallet connection status
- Security checks

### 3. Main Dashboard
- Earnings overview
- Available claims
- Work scenarios
- Recent activity

### 4. Work Session
- Scenario selection
- Time tracking
- Wage calculation
- Session completion

### 5. ZK Proof Generation
- Proof creation process
- Verification steps
- Blockchain submission
- Claim confirmation

## 🔧 Development Features

### Mock Services
- **APIService**: Simulated backend responses
- **WalletManager**: Demo wallet with mock transactions
- **ZKProofService**: Simulated proof generation
- **BiometricAuth**: Mock authentication for simulator

### Sample Data
- Pre-configured work scenarios
- Mock attestation responses
- Demo wallet addresses
- Test transaction data

### Error Handling
- Comprehensive error types
- User-friendly error messages
- Recovery suggestions
- Logging and debugging

## 🎨 Design System

### Colors
- **Brand Colors**: Stream blue, green, orange
- **Scenario Colors**: Starbucks green, Amazon orange, Uber cyan
- **System Colors**: Success, warning, error states
- **Neutral Palette**: Background, surface, text colors

### Typography
- **Display Fonts**: Large titles with rounded design
- **Body Text**: System fonts with proper hierarchy
- **Monospace**: For addresses and hashes
- **Custom Weights**: Emphasis and hierarchy

### Components
- **WageCard**: Scenario display with claim functionality
- **StatCard**: Dashboard statistics
- **QuickActionButton**: Dashboard shortcuts
- **Custom Modifiers**: Consistent styling

## 🔒 Security Considerations

### Production Readiness
- Replace mock services with real implementations
- Implement proper key management
- Add certificate pinning
- Enable app transport security
- Implement proper error handling

### Privacy
- No sensitive data in logs
- Secure data transmission
- Local data encryption
- User consent management

## 🧪 Testing

### Unit Tests
- ViewModel logic testing
- Service layer testing
- Model validation
- Crypto operations

### UI Tests
- User flow testing
- Accessibility testing
- Performance testing
- Error state testing

## 📦 Deployment

### App Store Preparation
1. Update bundle identifier
2. Configure signing certificates
3. Add app icons and launch screens
4. Update Info.plist permissions
5. Test on physical devices
6. Submit for review

### Backend Integration
1. Replace mock API endpoints
2. Configure real wallet providers
3. Implement ZK circuit integration
4. Set up blockchain connections
5. Configure push notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is part of the Stream Protocol ecosystem. See the main repository for license information.

## 🆘 Support

For technical support or questions:
- Check the main Stream Protocol documentation
- Review the API documentation
- Submit issues through the main repository
- Join the developer community

---

**Note**: This is a development version with mock services. For production deployment, replace all mock implementations with real backend services and proper security measures.