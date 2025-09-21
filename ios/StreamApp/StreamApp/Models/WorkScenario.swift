import SwiftUI

struct WorkScenario: Identifiable, Codable, Hashable {
    let id: String
    let employer: String
    let position: String
    let hours: Double
    let hourlyRate: Double
    let totalWage: Double
    let description: String
    let employee: String
    let difficulty: Difficulty
    let theme: String

    enum Difficulty: String, Codable, CaseIterable {
        case easy = "easy"
        case medium = "medium"
        case hard = "hard"

        var displayName: String {
            switch self {
            case .easy: return "Easy"
            case .medium: return "Medium"
            case .hard: return "Hard"
            }
        }

        var color: Color {
            switch self {
            case .easy: return StreamColors.success
            case .medium: return StreamColors.warning
            case .hard: return StreamColors.error
            }
        }
    }

    var themeColor: Color {
        switch id {
        case "starbucks_barista":
            return StreamColors.starbucksGreen
        case "amazon_warehouse":
            return StreamColors.amazonOrange
        case "uber_driver":
            return StreamColors.uberCyan
        default:
            return StreamColors.streamBlue
        }
    }

    var iconName: String {
        switch id {
        case "starbucks_barista":
            return "cup.and.saucer.fill"
        case "amazon_warehouse":
            return "shippingbox.fill"
        case "uber_driver":
            return "car.fill"
        default:
            return "briefcase.fill"
        }
    }

    var scenarioType: ScenarioType {
        switch id {
        case "starbucks_barista":
            return .starbucks
        case "amazon_warehouse":
            return .amazon
        case "uber_driver":
            return .uber
        default:
            return .custom
        }
    }
}

enum ScenarioType: String, CaseIterable, Codable {
    case starbucks = "starbucks_barista"
    case amazon = "amazon_warehouse"
    case uber = "uber_driver"
    case custom = "custom"

    var displayName: String {
        switch self {
        case .starbucks: return "Starbucks"
        case .amazon: return "Amazon"
        case .uber: return "Uber"
        case .custom: return "Custom"
        }
    }

    var color: Color {
        switch self {
        case .starbucks: return StreamColors.starbucksGreen
        case .amazon: return StreamColors.amazonOrange
        case .uber: return StreamColors.uberCyan
        case .custom: return StreamColors.streamBlue
        }
    }
}

// Sample data for development and previews
extension WorkScenario {
    static let sampleScenarios = [
        WorkScenario(
            id: "starbucks_barista",
            employer: "Starbucks Coffee",
            position: "Barista",
            hours: 8.5,
            hourlyRate: 18,
            totalWage: 153,
            description: "Morning shift at busy downtown location",
            employee: "Alex Johnson",
            difficulty: .easy,
            theme: "green"
        ),
        WorkScenario(
            id: "amazon_warehouse",
            employer: "Amazon Fulfillment",
            position: "Warehouse Associate",
            hours: 10,
            hourlyRate: 22,
            totalWage: 220,
            description: "Night shift package sorting and loading",
            employee: "Maria Rodriguez",
            difficulty: .medium,
            theme: "orange"
        ),
        WorkScenario(
            id: "uber_driver",
            employer: "Uber Technologies",
            position: "Rideshare Driver",
            hours: 6,
            hourlyRate: 28.5,
            totalWage: 171,
            description: "Evening rush hour with surge pricing",
            employee: "David Chen",
            difficulty: .hard,
            theme: "cyan"
        )
    ]
}