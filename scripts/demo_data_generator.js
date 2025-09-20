/**
 * Demo Data Generator - HACKATHON VERSION
 *
 * Generates realistic attestation data for impressive ZKP demos
 * Focus on scenarios that judges can easily understand and relate to
 */

const fs = require('fs');
const path = require('path');

class DemoDataGenerator {
    constructor() {
        this.employers = {
            "amazon": {
                id: 2001,
                secret: "amazon_secret_key_demo_2024_v1_0x1",
                name: "Amazon",
                logo: "🛒",
                avgSalary: 95000,
                description: "Major tech company"
            },
            "starbucks": {
                id: 2002,
                secret: "starbucks_secret_key_demo_2024_v1",
                name: "Starbucks",
                logo: "☕",
                avgSalary: 35000,
                description: "Coffee retail chain"
            },
            "uber": {
                id: 2003,
                secret: "uber_secret_key_demo_2024_v1_xyz",
                name: "Uber",
                logo: "🚗",
                avgSalary: 48000,
                description: "Rideshare platform"
            },
            "google": {
                id: 2004,
                secret: "google_secret_key_demo_2024_v1_ai",
                name: "Google",
                logo: "🔍",
                avgSalary: 120000,
                description: "Search & cloud services"
            },
            "mcdonalds": {
                id: 2005,
                secret: "mcdonalds_secret_key_demo_24_abc",
                name: "McDonald's",
                logo: "🍟",
                avgSalary: 28000,
                description: "Fast food restaurant"
            },
            "microsoft": {
                id: 2006,
                secret: "microsoft_secret_key_demo_24_xyz",
                name: "Microsoft",
                logo: "💻",
                name: "Microsoft",
                avgSalary: 110000,
                description: "Software & cloud services"
            }
        };

        this.useCases = {
            "loan_application": {
                name: "Bank Loan Application",
                description: "Prove minimum income for loan without revealing exact salary",
                minWage: 60000,
                narrative: "🏦 Applying for home loan - need to prove $60k+ income"
            },
            "apartment_rental": {
                name: "Apartment Rental",
                description: "Prove income for apartment without showing payslips",
                minWage: 45000,
                narrative: "🏠 Renting apartment - need to prove $45k+ income"
            },
            "visa_application": {
                name: "Visa Application",
                description: "Prove financial stability for visa without full disclosure",
                minWage: 50000,
                narrative: "✈️ Visa application - need to prove financial stability"
            },
            "government_benefits": {
                name: "Government Benefits",
                description: "Prove income level for benefits eligibility",
                maxWage: 40000,
                narrative: "🏛️ Benefits application - need to prove income below $40k"
            },
            "insurance_premium": {
                name: "Insurance Premium",
                description: "Prove income bracket for insurance rate calculation",
                minWage: 35000,
                maxWage: 75000,
                narrative: "🛡️ Insurance application - prove income in $35k-$75k range"
            }
        };

        this.demoScenarios = [];
        this.generatedData = [];
    }

    /**
     * Generate complete demo scenarios
     */
    generateDemoScenarios() {
        console.log("🎭 Generating Hackathon Demo Scenarios...");

        // Clear previous data
        this.demoScenarios = [];
        this.generatedData = [];

        // Generate scenarios for each use case
        Object.entries(this.useCases).forEach(([useCaseKey, useCase]) => {
            this.generateScenarioForUseCase(useCaseKey, useCase);
        });

        // Generate some impressive high-value scenarios
        this.generateHighValueScenarios();

        // Generate edge case scenarios for robustness demo
        this.generateEdgeCaseScenarios();

        console.log(`✅ Generated ${this.demoScenarios.length} demo scenarios`);
        return this.demoScenarios;
    }

    /**
     * Generate scenario for a specific use case
     */
    generateScenarioForUseCase(useCaseKey, useCase) {
        const suitableEmployers = this.findSuitableEmployers(useCase);

        suitableEmployers.forEach(employer => {
            const scenario = this.createScenario({
                useCaseKey,
                useCase,
                employer,
                employeeName: this.generateEmployeeName(),
                wageAmount: this.generateRealisticWage(employer, useCase)
            });

            this.demoScenarios.push(scenario);
        });
    }

    /**
     * Find employers suitable for a use case
     */
    findSuitableEmployers(useCase) {
        return Object.entries(this.employers)
            .filter(([key, employer]) => {
                if (useCase.minWage && employer.avgSalary < useCase.minWage - 10000) return false;
                if (useCase.maxWage && employer.avgSalary > useCase.maxWage + 10000) return false;
                return true;
            })
            .map(([key, employer]) => ({ key, ...employer }))
            .slice(0, 2); // Limit to 2 employers per use case for demo
    }

    /**
     * Generate realistic wage for employer and use case
     */
    generateRealisticWage(employer, useCase) {
        let baseWage = employer.avgSalary;

        // Add some variance (±20%)
        const variance = 0.2;
        const randomFactor = 1 + (Math.random() - 0.5) * variance;
        baseWage = Math.floor(baseWage * randomFactor);

        // Ensure it meets use case requirements
        if (useCase.minWage) {
            baseWage = Math.max(baseWage, useCase.minWage + 5000);
        }
        if (useCase.maxWage) {
            baseWage = Math.min(baseWage, useCase.maxWage - 5000);
        }

        return baseWage;
    }

    /**
     * Create a complete demo scenario
     */
    createScenario({ useCaseKey, useCase, employer, employeeName, wageAmount }) {
        const employeeSecret = this.generateSecret();
        const periodNonce = Date.now() + Math.floor(Math.random() * 10000);

        // Calculate wage range for proof
        let minWageThreshold, maxWageThreshold;

        if (useCase.minWage && useCase.maxWage) {
            minWageThreshold = useCase.minWage;
            maxWageThreshold = useCase.maxWage;
        } else if (useCase.minWage) {
            minWageThreshold = useCase.minWage;
            maxWageThreshold = Math.max(wageAmount + 20000, useCase.minWage + 50000);
        } else if (useCase.maxWage) {
            minWageThreshold = Math.min(wageAmount - 20000, useCase.maxWage - 50000);
            maxWageThreshold = useCase.maxWage;
        } else {
            // Default range around wage
            minWageThreshold = Math.floor(wageAmount * 0.8);
            maxWageThreshold = Math.floor(wageAmount * 1.3);
        }

        const scenario = {
            id: `${useCaseKey}_${employer.key}_${Date.now()}`,
            title: `${employeeName} at ${employer.name}`,
            narrative: useCase.narrative,
            useCase: useCase.name,
            description: useCase.description,

            // Demo presentation data
            demo: {
                employeeName,
                employerLogo: employer.logo,
                employerName: employer.name,
                employerDescription: employer.description,
                useCaseName: useCase.name,
                proofReason: this.getProofReason(useCaseKey, wageAmount, minWageThreshold, maxWageThreshold)
            },

            // ZKP attestation data
            attestation: {
                employerSecret: employer.secret,
                employeeSecret: employeeSecret,
                wageAmount: wageAmount,
                periodNonce: periodNonce,
                employerID: employer.id,
                minWageThreshold: minWageThreshold,
                maxWageThreshold: maxWageThreshold
            },

            // Expected results
            expected: {
                proofValid: true,
                wageInRange: wageAmount >= minWageThreshold && wageAmount <= maxWageThreshold,
                employerVerified: true,
                gasEstimate: this.estimateGasUsage()
            },

            // Presentation metadata
            metadata: {
                difficulty: this.calculateDifficulty(wageAmount, minWageThreshold, maxWageThreshold),
                impressiveness: this.calculateImpressiveness(employer, useCase),
                demoTimeEstimate: "30-45 seconds",
                judgeAppeal: this.calculateJudgeAppeal(useCase, employer)
            }
        };

        this.generatedData.push(scenario);
        return scenario;
    }

    /**
     * Generate high-value scenarios for impressive demos
     */
    generateHighValueScenarios() {
        const highValueScenarios = [
            {
                title: "Executive Salary Verification",
                employer: this.employers.google,
                wageAmount: 180000,
                minWageThreshold: 150000,
                maxWageThreshold: 250000,
                narrative: "💼 Executive proving high income for luxury purchase without exact disclosure"
            },
            {
                title: "Startup Founder Equity",
                employer: this.employers.uber,
                wageAmount: 85000,
                minWageThreshold: 80000,
                maxWageThreshold: 120000,
                narrative: "🚀 Startup founder proving stable income despite equity compensation"
            }
        ];

        highValueScenarios.forEach(scenario => {
            const fullScenario = this.createScenario({
                useCaseKey: "high_value",
                useCase: {
                    name: scenario.title,
                    description: "High-value income verification",
                    narrative: scenario.narrative
                },
                employer: { key: "high_value", ...scenario.employer },
                employeeName: this.generateExecutiveName(),
                wageAmount: scenario.wageAmount
            });

            fullScenario.metadata.impressiveness = 10; // Maximum impressiveness
            this.demoScenarios.push(fullScenario);
        });
    }

    /**
     * Generate edge case scenarios
     */
    generateEdgeCaseScenarios() {
        const edgeCases = [
            {
                title: "Minimum Wage Worker",
                employer: this.employers.mcdonalds,
                wageAmount: 31000,
                minWageThreshold: 30000,
                maxWageThreshold: 35000,
                narrative: "⚖️ Proving minimum wage compliance for legal purposes"
            },
            {
                title: "Gig Economy Multiple Sources",
                employer: this.employers.uber,
                wageAmount: 42000,
                minWageThreshold: 40000,
                maxWageThreshold: 50000,
                narrative: "🔄 Proving combined gig economy income meets threshold"
            }
        ];

        edgeCases.forEach(edgeCase => {
            const scenario = this.createScenario({
                useCaseKey: "edge_case",
                useCase: {
                    name: edgeCase.title,
                    description: "Edge case demonstration",
                    narrative: edgeCase.narrative
                },
                employer: { key: "edge_case", ...edgeCase.employer },
                employeeName: this.generateEmployeeName(),
                wageAmount: edgeCase.wageAmount
            });

            scenario.metadata.difficulty = 8; // High difficulty for edge cases
            this.demoScenarios.push(scenario);
        });
    }

    /**
     * Get formatted proof reason for presentation
     */
    getProofReason(useCaseKey, wageAmount, minWage, maxWage) {
        const wage = `$${wageAmount.toLocaleString()}`;
        const range = `$${minWage.toLocaleString()} - $${maxWage.toLocaleString()}`;

        if (useCaseKey === "government_benefits") {
            return `Proving income (${wage}) is below $${maxWage.toLocaleString()} for benefits eligibility`;
        } else if (useCaseKey === "insurance_premium") {
            return `Proving income (${wage}) is in range ${range} for accurate premium calculation`;
        } else {
            return `Proving income (${wage}) meets minimum requirement of $${minWage.toLocaleString()}`;
        }
    }

    /**
     * Calculate scenario difficulty (1-10)
     */
    calculateDifficulty(wageAmount, minWage, maxWage) {
        const margin = Math.min(wageAmount - minWage, maxWage - wageAmount);
        const range = maxWage - minWage;
        const marginPercent = margin / range;

        if (marginPercent < 0.1) return 9; // Very tight margin
        if (marginPercent < 0.2) return 7; // Tight margin
        if (marginPercent < 0.4) return 5; // Moderate margin
        return 3; // Comfortable margin
    }

    /**
     * Calculate impressiveness for judges (1-10)
     */
    calculateImpressiveness(employer, useCase) {
        let score = 5;

        // Boost for recognizable brands
        if (["amazon", "google", "microsoft", "uber", "starbucks"].includes(employer.key)) {
            score += 2;
        }

        // Boost for relatable use cases
        if (["loan_application", "apartment_rental", "visa_application"].includes(useCase.name)) {
            score += 1;
        }

        // High salary scenarios are impressive
        if (employer.avgSalary > 100000) {
            score += 1;
        }

        return Math.min(score, 10);
    }

    /**
     * Calculate judge appeal (1-10)
     */
    calculateJudgeAppeal(useCase, employer) {
        let appeal = 5;

        // Universal appeal for common scenarios
        const universalUseCases = ["loan_application", "apartment_rental"];
        if (universalUseCases.some(uc => useCase.name.includes(uc))) {
            appeal += 2;
        }

        // Tech company appeal for tech judges
        const techCompanies = ["google", "microsoft", "amazon", "uber"];
        if (techCompanies.includes(employer.key)) {
            appeal += 1;
        }

        // Consumer brand recognition
        if (["starbucks", "mcdonalds", "amazon"].includes(employer.key)) {
            appeal += 1;
        }

        return Math.min(appeal, 10);
    }

    /**
     * Estimate gas usage for scenario
     */
    estimateGasUsage() {
        return 85000 + Math.floor(Math.random() * 10000); // 85k-95k gas
    }

    // Helper methods
    generateEmployeeName() {
        const firstNames = ["Alex", "Jordan", "Casey", "Taylor", "Morgan", "Riley", "Cameron", "Avery"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];

        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    generateExecutiveName() {
        const executiveNames = ["Patricia Chen", "Michael Rodriguez", "Sarah Kim", "David Thompson", "Jennifer Martinez"];
        return executiveNames[Math.floor(Math.random() * executiveNames.length)];
    }

    generateSecret() {
        return Math.floor(Math.random() * 1000000000).toString().padStart(32, '0');
    }

    /**
     * Export data to files for use in demo
     */
    exportDemoData(outputDir = './demo_data') {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Export scenarios
        const scenariosFile = path.join(outputDir, 'demo_scenarios.json');
        fs.writeFileSync(scenariosFile, JSON.stringify(this.demoScenarios, null, 2));

        // Export quick reference
        const quickRef = this.demoScenarios.map(s => ({
            id: s.id,
            title: s.title,
            narrative: s.narrative,
            employer: s.demo.employerName,
            useCase: s.demo.useCaseName,
            impressiveness: s.metadata.impressiveness,
            judgeAppeal: s.metadata.judgeAppeal
        }));

        const quickRefFile = path.join(outputDir, 'quick_reference.json');
        fs.writeFileSync(quickRefFile, JSON.stringify(quickRef, null, 2));

        // Export by category for easy selection
        const categories = {
            high_impressiveness: this.demoScenarios.filter(s => s.metadata.impressiveness >= 8),
            high_judge_appeal: this.demoScenarios.filter(s => s.metadata.judgeAppeal >= 8),
            tech_companies: this.demoScenarios.filter(s => ["google", "microsoft", "amazon", "uber"].some(c => s.demo.employerName.toLowerCase().includes(c))),
            common_use_cases: this.demoScenarios.filter(s => ["loan", "apartment", "visa"].some(uc => s.useCase.toLowerCase().includes(uc)))
        };

        Object.entries(categories).forEach(([category, scenarios]) => {
            const categoryFile = path.join(outputDir, `${category}.json`);
            fs.writeFileSync(categoryFile, JSON.stringify(scenarios, null, 2));
        });

        console.log(`📁 Demo data exported to ${outputDir}`);
        console.log(`📊 Generated ${this.demoScenarios.length} scenarios across ${Object.keys(categories).length} categories`);

        return {
            totalScenarios: this.demoScenarios.length,
            categories: Object.keys(categories),
            outputDir
        };
    }

    /**
     * Get recommended scenarios for different demo situations
     */
    getRecommendedScenarios() {
        const sorted = [...this.demoScenarios].sort((a, b) => {
            const scoreA = a.metadata.impressiveness + a.metadata.judgeAppeal;
            const scoreB = b.metadata.impressiveness + b.metadata.judgeAppeal;
            return scoreB - scoreA;
        });

        return {
            // Top 3 for main demo
            main_demo: sorted.slice(0, 3),

            // Quick backup scenarios
            backup: sorted.slice(3, 6),

            // Impressive scenarios for VIP demos
            vip_demo: sorted.filter(s => s.metadata.impressiveness >= 9),

            // Safe scenarios that are most likely to work
            safe_demo: sorted.filter(s => s.metadata.difficulty <= 5).slice(0, 3)
        };
    }
}

module.exports = DemoDataGenerator;

// CLI usage
if (require.main === module) {
    async function main() {
        console.log("🎭 HACKATHON DEMO DATA GENERATOR");
        console.log("================================");

        const generator = new DemoDataGenerator();

        // Generate scenarios
        const scenarios = generator.generateDemoScenarios();

        // Export data
        const exportResult = generator.exportDemoData();

        // Show recommendations
        const recommendations = generator.getRecommendedScenarios();

        console.log("\n🏆 RECOMMENDED SCENARIOS FOR DEMO:");
        console.log("\n📈 Main Demo (Highest Impact):");
        recommendations.main_demo.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.title} - ${s.narrative}`);
            console.log(`     Impressiveness: ${s.metadata.impressiveness}/10, Appeal: ${s.metadata.judgeAppeal}/10`);
        });

        console.log("\n🛡️ Backup Scenarios:");
        recommendations.backup.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.title} - ${s.useCase}`);
        });

        console.log("\n✅ Demo Data Generation Complete!");
        console.log(`📁 Files exported to: ${exportResult.outputDir}`);
        console.log(`🎯 Ready for hackathon demo!`);
    }

    main().catch(console.error);
}