import SwiftUI

struct StreamFonts {
    // MARK: - Display Fonts
    static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)
    static let title1 = Font.system(size: 28, weight: .semibold, design: .rounded)
    static let title2 = Font.system(size: 22, weight: .semibold, design: .rounded)
    static let title3 = Font.system(size: 20, weight: .medium, design: .rounded)

    // MARK: - Body Fonts
    static let headline = Font.system(size: 17, weight: .semibold, design: .default)
    static let body = Font.system(size: 17, weight: .regular, design: .default)
    static let bodyEmphasized = Font.system(size: 17, weight: .medium, design: .default)
    static let callout = Font.system(size: 16, weight: .regular, design: .default)
    static let subheadline = Font.system(size: 15, weight: .regular, design: .default)

    // MARK: - Utility Fonts
    static let footnote = Font.system(size: 13, weight: .regular, design: .default)
    static let caption = Font.system(size: 12, weight: .regular, design: .default)
    static let caption2 = Font.system(size: 11, weight: .regular, design: .default)

    // MARK: - Custom Fonts
    static let currency = Font.system(size: 24, weight: .bold, design: .rounded)
    static let currencyLarge = Font.system(size: 32, weight: .bold, design: .rounded)
    static let button = Font.system(size: 16, weight: .semibold, design: .default)
    static let navigationTitle = Font.system(size: 17, weight: .semibold, design: .default)

    // MARK: - Monospace Fonts (for addresses, hashes)
    static let monospace = Font.system(size: 14, weight: .regular, design: .monospaced)
    static let monospaceSmall = Font.system(size: 12, weight: .regular, design: .monospaced)
}

// MARK: - Text Style Modifiers
extension Text {
    func streamTitle1() -> some View {
        self.font(StreamFonts.title1)
            .foregroundColor(StreamColors.textPrimary)
    }

    func streamTitle2() -> some View {
        self.font(StreamFonts.title2)
            .foregroundColor(StreamColors.textPrimary)
    }

    func streamHeadline() -> some View {
        self.font(StreamFonts.headline)
            .foregroundColor(StreamColors.textPrimary)
    }

    func streamBody() -> some View {
        self.font(StreamFonts.body)
            .foregroundColor(StreamColors.textPrimary)
    }

    func streamBodySecondary() -> some View {
        self.font(StreamFonts.body)
            .foregroundColor(StreamColors.textSecondary)
    }

    func streamCaption() -> some View {
        self.font(StreamFonts.caption)
            .foregroundColor(StreamColors.textSecondary)
    }

    func streamCurrency() -> some View {
        self.font(StreamFonts.currency)
            .foregroundColor(StreamColors.textPrimary)
    }

    func streamMonospace() -> some View {
        self.font(StreamFonts.monospace)
            .foregroundColor(StreamColors.textSecondary)
    }
}