import SwiftUI

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color(StreamColors.surface)
                .edgesIgnoringSafeArea(.all)
            
            VStack {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color(StreamColors.textPrimary)))
                    .scaleEffect(1.5)
                
                Text("Loading...")
                    .font(StreamFonts.body)
                    .foregroundColor(Color(StreamColors.textPrimary))
                    .padding(.top, 20)
            }
        }
    }
}

#Preview {
    LoadingView()
}