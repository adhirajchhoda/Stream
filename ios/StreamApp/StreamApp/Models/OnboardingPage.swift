import Foundation

struct OnboardingPage {
    let title: String
    let description: String
    let iconName: String

    static let allPages = [
        OnboardingPage(
            title: "Welcome to Stream Protocol",
            description: "The future of earned wage access using zero-knowledge proofs. Access your wages instantly while keeping your privacy intact.",
            iconName: "hand.wave.fill"
        ),
        OnboardingPage(
            title: "Privacy-First Technology",
            description: "Your wage data stays private with advanced zero-knowledge cryptography. Prove your earnings without revealing sensitive information.",
            iconName: "lock.shield.fill"
        ),
        OnboardingPage(
            title: "Instant Wage Access",
            description: "Get paid immediately after completing work. No waiting for payroll cycles or expensive advance fees.",
            iconName: "bolt.fill"
        ),
        OnboardingPage(
            title: "Blockchain Powered",
            description: "Built on Ethereum with smart contracts ensuring transparent, secure, and automated wage payments.",
            iconName: "link"
        )
    ]
}