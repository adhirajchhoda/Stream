import SwiftUI

struct OnboardingPageView: View {
    let page: OnboardingPage

    var body: some View {
        VStack(spacing: 32) {
            // Illustration
            ZStack {
                Circle()
                    .fill(.white.opacity(0.1))
                    .frame(width: 200, height: 200)

                Image(systemName: page.iconName)
                    .font(.system(size: 80, weight: .light))
                    .foregroundColor(.white)
            }

            // Content
            VStack(spacing: 16) {
                Text(page.title)
                    .font(StreamFonts.title1)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                Text(page.description)
                    .font(StreamFonts.body)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            .padding(.horizontal, 32)
        }
    }
}