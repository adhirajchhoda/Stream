import SwiftUI

struct StreamColors {
    // MARK: - Primary Brand Colors
    static let streamBlue = Color(hex: "2196F3")
    static let streamGreen = Color(hex: "4CAF50")
    static let streamOrange = Color(hex: "FF9800")
    static let streamRed = Color(hex: "F44336")

    // MARK: - Scenario Theme Colors
    static let starbucksGreen = Color(hex: "00704A")
    static let amazonOrange = Color(hex: "FF9900")
    static let uberCyan = Color(hex: "00BCD4")

    // MARK: - Neutral Colors
    static let background = Color(hex: "F8FAFB")
    static let surface = Color(hex: "FFFFFF")
    static let surfaceVariant = Color(hex: "F5F7FA")
    static let outline = Color(hex: "E0E4E7")

    // MARK: - Text Colors
    static let textPrimary = Color(hex: "1A1A1A")
    static let textSecondary = Color(hex: "666666")
    static let textTertiary = Color(hex: "999999")
    static let textInverse = Color(hex: "FFFFFF")

    // MARK: - Status Colors
    static let success = Color(hex: "10B981")
    static let warning = Color(hex: "F59E0B")
    static let error = Color(hex: "EF4444")
    static let info = Color(hex: "3B82F6")

    // MARK: - Gradient Colors
    static let primaryGradient = LinearGradient(
        colors: [streamBlue, streamBlue.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let successGradient = LinearGradient(
        colors: [success, success.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// MARK: - Color Extension for Hex Support
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}