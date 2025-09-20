/**
 * Stream Protocol Employer Simulation Service
 * Creates realistic mock employer profiles and wage scenarios for testing
 */

const { EmployerKeyManager } = require('./EmployerKeyManager');
const { WageAttestation, EMPLOYMENT_TYPES } = require('../models/WageAttestation');
const crypto = require('crypto');

/**
 * Mock Employer Profiles
 */
const MOCK_EMPLOYERS = {
  starbucks: {
    companyName: 'Starbucks Corporation',
    domain: 'starbucks.com',
    employeeCount: 383000,
    payrollFrequency: 'BIWEEKLY',
    contactEmail: 'payroll@starbucks.com',
    industry: 'Food Service',
    avgHourlyRate: 1800, // $18/hour
    employmentTypes: ['HOURLY', 'PART_TIME'],
    shiftPatterns: {
      opening: { hours: 8, rate: 1900 },
      mid: { hours: 6, rate: 1750 },
      closing: { hours: 8, rate: 1850 }
    }
  },
  amazon: {
    companyName: 'Amazon.com Inc',
    domain: 'amazon.com',
    employeeCount: 1608000,
    payrollFrequency: 'WEEKLY',
    contactEmail: 'payroll@amazon.com',
    industry: 'E-commerce/Logistics',
    avgHourlyRate: 2200, // $22/hour
    employmentTypes: ['HOURLY', 'SALARY'],
    shiftPatterns: {
      warehouse_day: { hours: 10, rate: 2200 },
      warehouse_night: { hours: 10, rate: 2400 },
      delivery: { hours: 8, rate: 2100 },
      seasonal: { hours: 12, rate: 2000 }
    }
  },
  mcdonalds: {
    companyName: "McDonald's Corporation",
    domain: 'mcdonalds.com',
    employeeCount: 205000,
    payrollFrequency: 'BIWEEKLY',
    contactEmail: 'payroll@mcdonalds.com',
    industry: 'Fast Food',
    avgHourlyRate: 1600, // $16/hour
    employmentTypes: ['HOURLY', 'PART_TIME'],
    shiftPatterns: {
      breakfast: { hours: 6, rate: 1600 },
      lunch: { hours: 8, rate: 1650 },
      dinner: { hours: 6, rate: 1600 },
      overnight: { hours: 8, rate: 1750 }
    }
  },
  uber: {
    companyName: 'Uber Technologies Inc',
    domain: 'uber.com',
    employeeCount: 32800,
    payrollFrequency: 'WEEKLY',
    contactEmail: 'payroll@uber.com',
    industry: 'Gig Economy',
    avgHourlyRate: 2500, // $25/hour equivalent
    employmentTypes: ['GIG', 'HOURLY'],
    shiftPatterns: {
      peak_hours: { hours: 6, rate: 3500 },
      regular: { hours: 8, rate: 2200 },
      weekend: { hours: 10, rate: 2800 },
      surge: { hours: 4, rate: 4500 }
    }
  },
  target: {
    companyName: 'Target Corporation',
    domain: 'target.com',
    employeeCount: 450000,
    payrollFrequency: 'BIWEEKLY',
    contactEmail: 'payroll@target.com',
    industry: 'Retail',
    avgHourlyRate: 1900, // $19/hour
    employmentTypes: ['HOURLY', 'PART_TIME', 'SALARY'],
    shiftPatterns: {
      opening: { hours: 8, rate: 1900 },
      mid: { hours: 6, rate: 1850 },
      closing: { hours: 8, rate: 1950 },
      overnight: { hours: 8, rate: 2100 }
    }
  },
  techcorp: {
    companyName: 'TechCorp Innovations',
    domain: 'techcorp.io',
    employeeCount: 2500,
    payrollFrequency: 'MONTHLY',
    contactEmail: 'payroll@techcorp.io',
    industry: 'Technology',
    avgHourlyRate: 5000, // $50/hour
    employmentTypes: ['SALARY', 'HOURLY'],
    shiftPatterns: {
      standard: { hours: 8, rate: 5000 },
      overtime: { hours: 10, rate: 7500 },
      oncall: { hours: 4, rate: 6000 },
      contract: { hours: 6, rate: 8000 }
    }
  }
};

/**
 * Employee Wallet Generator
 */
class EmployeeWalletGenerator {
  constructor() {
    this.usedWallets = new Set();
  }

  generateWallet() {
    let wallet;
    do {
      // Generate random Ethereum address
      const randomBytes = crypto.randomBytes(20);
      wallet = '0x' + randomBytes.toString('hex');
    } while (this.usedWallets.has(wallet));

    this.usedWallets.add(wallet);
    return wallet;
  }

  generateEmployeePool(size = 1000) {
    const employees = [];
    for (let i = 0; i < size; i++) {
      employees.push({
        wallet: this.generateWallet(),
        employeeId: `emp_${i.toString().padStart(6, '0')}`,
        hireDate: this.randomDate(new Date(2020, 0, 1), new Date()),
        status: 'active'
      });
    }
    return employees;
  }

  randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

/**
 * Employer Simulation Service
 */
class EmployerSimulator {
  constructor() {
    this.keyManager = new EmployerKeyManager();
    this.walletGenerator = new EmployeeWalletGenerator();
    this.registeredEmployers = new Map();
    this.employeePools = new Map();
  }

  /**
   * Initialize all mock employers
   */
  async initializeEmployers() {
    const results = [];

    for (const [key, employerData] of Object.entries(MOCK_EMPLOYERS)) {
      try {
        const employer = this.keyManager.registerEmployer(employerData);
        this.registeredEmployers.set(key, employer);

        // Generate employee pool
        const employees = this.walletGenerator.generateEmployeePool(
          Math.min(employerData.employeeCount / 100, 500) // Scale down for simulation
        );
        this.employeePools.set(employer.employerId, employees);

        results.push({
          key,
          employerId: employer.employerId,
          companyName: employerData.companyName,
          employeePoolSize: employees.length,
          status: 'initialized'
        });

      } catch (error) {
        results.push({
          key,
          error: error.message,
          status: 'failed'
        });
      }
    }

    return results;
  }

  /**
   * Generate realistic wage attestation scenarios
   */
  generateAttestationScenarios(employerKey, count = 10, options = {}) {
    const employerData = MOCK_EMPLOYERS[employerKey];
    const employer = this.registeredEmployers.get(employerKey);
    const employees = this.employeePools.get(employer.employerId);

    if (!employerData || !employer || !employees) {
      throw new Error(`Employer ${employerKey} not found or not initialized`);
    }

    const scenarios = [];
    const {
      errorRate = 0.05, // 5% error scenarios
      timeRange = 30, // Days
      includeWeekends = false
    } = options;

    for (let i = 0; i < count; i++) {
      // Select random employee
      const employee = employees[Math.floor(Math.random() * employees.length)];

      // Determine if this should be an error scenario
      const isErrorScenario = Math.random() < errorRate;

      // Generate work period
      const periodEnd = this.randomWorkDay(timeRange, includeWeekends);
      const shiftType = this.selectShiftType(employerData);
      const shift = employerData.shiftPatterns[shiftType];

      let scenario;

      if (isErrorScenario) {
        scenario = this.generateErrorScenario(employerData, employee, periodEnd, shift);
      } else {
        scenario = this.generateValidScenario(employerData, employee, periodEnd, shift);
      }

      scenarios.push({
        scenarioId: `scenario_${i + 1}`,
        employerKey,
        employerId: employer.employerId,
        employee: employee.wallet,
        shiftType,
        isErrorScenario,
        ...scenario
      });
    }

    return scenarios;
  }

  /**
   * Generate valid wage attestation scenario
   */
  generateValidScenario(employerData, employee, periodEnd, shift) {
    const variation = 0.8 + Math.random() * 0.4; // 80-120% of base

    const hoursWorked = Math.round(shift.hours * variation * 10) / 10;
    const hourlyRate = Math.round(shift.rate * (0.9 + Math.random() * 0.2)); // ±10% rate variation
    const wageAmount = Math.round(hoursWorked * hourlyRate);

    // Calculate period start based on hours worked
    const periodStart = new Date(periodEnd.getTime() - (hoursWorked * 60 * 60 * 1000));

    return {
      attestationData: {
        employerId: this.registeredEmployers.get(Object.keys(MOCK_EMPLOYERS).find(k => MOCK_EMPLOYERS[k] === employerData)).employerId,
        employeeWallet: employee.wallet,
        wageAmount,
        periodStart,
        periodEnd,
        hoursWorked,
        hourlyRate
      },
      expectedValid: true,
      description: `Valid ${shift.hours}-hour shift with ${hoursWorked} hours worked at $${(hourlyRate/100).toFixed(2)}/hour`
    };
  }

  /**
   * Generate error scenario for testing
   */
  generateErrorScenario(employerData, employee, periodEnd, shift) {
    const errorTypes = [
      'wage_calculation_mismatch',
      'excessive_hours',
      'future_work_period',
      'negative_values',
      'unrealistic_rate'
    ];

    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    let attestationData, description;

    const baseHours = shift.hours;
    const baseRate = shift.rate;

    switch (errorType) {
      case 'wage_calculation_mismatch':
        const hoursWorked = baseHours;
        const hourlyRate = baseRate;
        const incorrectWage = Math.round(hoursWorked * hourlyRate * 1.5); // 50% too high

        attestationData = {
          employerId: this.registeredEmployers.get(Object.keys(MOCK_EMPLOYERS).find(k => MOCK_EMPLOYERS[k] === employerData)).employerId,
          employeeWallet: employee.wallet,
          wageAmount: incorrectWage,
          periodStart: new Date(periodEnd.getTime() - (hoursWorked * 60 * 60 * 1000)),
          periodEnd,
          hoursWorked,
          hourlyRate
        };
        description = 'Wage amount does not match hours × rate calculation';
        break;

      case 'excessive_hours':
        const excessiveHours = 25; // More than 24 hours in a day
        attestationData = {
          employerId: this.registeredEmployers.get(Object.keys(MOCK_EMPLOYERS).find(k => MOCK_EMPLOYERS[k] === employerData)).employerId,
          employeeWallet: employee.wallet,
          wageAmount: Math.round(excessiveHours * baseRate),
          periodStart: new Date(periodEnd.getTime() - (24 * 60 * 60 * 1000)), // 24 hour period
          periodEnd,
          hoursWorked: excessiveHours,
          hourlyRate: baseRate
        };
        description = 'Excessive hours worked (>24 hours in single day)';
        break;

      case 'future_work_period':
        const futureEnd = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days future
        attestationData = {
          employerId: this.registeredEmployers.get(Object.keys(MOCK_EMPLOYERS).find(k => MOCK_EMPLOYERS[k] === employerData)).employerId,
          employeeWallet: employee.wallet,
          wageAmount: Math.round(baseHours * baseRate),
          periodStart: new Date(futureEnd.getTime() - (baseHours * 60 * 60 * 1000)),
          periodEnd: futureEnd,
          hoursWorked: baseHours,
          hourlyRate: baseRate
        };
        description = 'Work period end date is in the future';
        break;

      case 'negative_values':
        attestationData = {
          employerId: this.registeredEmployers.get(Object.keys(MOCK_EMPLOYERS).find(k => MOCK_EMPLOYERS[k] === employerData)).employerId,
          employeeWallet: employee.wallet,
          wageAmount: -Math.round(baseHours * baseRate),
          periodStart: new Date(periodEnd.getTime() - (baseHours * 60 * 60 * 1000)),
          periodEnd,
          hoursWorked: -baseHours,
          hourlyRate: baseRate
        };
        description = 'Negative wage amount and hours worked';
        break;

      case 'unrealistic_rate':
        const unrealisticRate = 100000; // $1000/hour
        attestationData = {
          employerId: this.registeredEmployers.get(Object.keys(MOCK_EMPLOYERS).find(k => MOCK_EMPLOYERS[k] === employerData)).employerId,
          employeeWallet: employee.wallet,
          wageAmount: Math.round(baseHours * unrealisticRate),
          periodStart: new Date(periodEnd.getTime() - (baseHours * 60 * 60 * 1000)),
          periodEnd,
          hoursWorked: baseHours,
          hourlyRate: unrealisticRate
        };
        description = 'Unrealistically high hourly rate';
        break;
    }

    return {
      attestationData,
      expectedValid: false,
      errorType,
      description
    };
  }

  /**
   * Create and sign attestations from scenarios
   */
  async createAttestationsFromScenarios(scenarios) {
    const results = [];

    for (const scenario of scenarios) {
      try {
        // Create attestation
        const attestation = new WageAttestation(scenario.attestationData);

        // Sign attestation
        const signatureResult = this.keyManager.signAttestation(
          scenario.employerId,
          attestation
        );

        results.push({
          scenarioId: scenario.scenarioId,
          attestationId: attestation.attestationId,
          isValid: scenario.expectedValid,
          signed: true,
          signature: signatureResult.signatureInfo.signature,
          employerKey: scenario.employerKey,
          shiftType: scenario.shiftType,
          description: scenario.description,
          attestation: attestation.toJSON()
        });

      } catch (error) {
        results.push({
          scenarioId: scenario.scenarioId,
          isValid: false,
          signed: false,
          error: error.message,
          employerKey: scenario.employerKey,
          description: scenario.description
        });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive test suite
   */
  async generateTestSuite(options = {}) {
    const {
      attestationsPerEmployer = 20,
      errorRate = 0.1,
      timeRange = 30
    } = options;

    const testSuite = {
      generatedAt: new Date().toISOString(),
      configuration: { attestationsPerEmployer, errorRate, timeRange },
      employers: [],
      scenarios: [],
      attestations: [],
      summary: {}
    };

    // Initialize employers if not done
    if (this.registeredEmployers.size === 0) {
      const initResults = await this.initializeEmployers();
      testSuite.employers = initResults;
    }

    // Generate scenarios for each employer
    for (const [employerKey, employer] of this.registeredEmployers) {
      const scenarios = this.generateAttestationScenarios(employerKey, attestationsPerEmployer, {
        errorRate,
        timeRange,
        includeWeekends: true
      });

      testSuite.scenarios.push(...scenarios);

      // Create and sign attestations
      const attestations = await this.createAttestationsFromScenarios(scenarios);
      testSuite.attestations.push(...attestations);
    }

    // Generate summary
    testSuite.summary = {
      totalEmployers: this.registeredEmployers.size,
      totalScenarios: testSuite.scenarios.length,
      totalAttestations: testSuite.attestations.length,
      validAttestations: testSuite.attestations.filter(a => a.isValid).length,
      errorAttestations: testSuite.attestations.filter(a => !a.isValid).length,
      signedAttestations: testSuite.attestations.filter(a => a.signed).length,
      failedSignatures: testSuite.attestations.filter(a => !a.signed && a.error).length
    };

    return testSuite;
  }

  /**
   * Utility methods
   */
  randomWorkDay(daysBack, includeWeekends = false) {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * daysBack);
    const workDay = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    if (!includeWeekends) {
      // Adjust to weekday if weekend
      const dayOfWeek = workDay.getDay();
      if (dayOfWeek === 0) { // Sunday
        workDay.setDate(workDay.getDate() - 2);
      } else if (dayOfWeek === 6) { // Saturday
        workDay.setDate(workDay.getDate() - 1);
      }
    }

    // Set to end of work day
    workDay.setHours(17 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);
    return workDay;
  }

  selectShiftType(employerData) {
    const shiftTypes = Object.keys(employerData.shiftPatterns);
    return shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
  }

  /**
   * Get registered employers
   */
  getRegisteredEmployers() {
    return Array.from(this.registeredEmployers.entries()).map(([key, employer]) => ({
      key,
      employerId: employer.employerId,
      companyName: employer.companyName,
      domain: employer.domain,
      employeeCount: this.employeePools.get(employer.employerId)?.length || 0
    }));
  }

  /**
   * Clean up simulation data
   */
  cleanup() {
    this.registeredEmployers.clear();
    this.employeePools.clear();
    this.walletGenerator.usedWallets.clear();
  }
}

module.exports = {
  EmployerSimulator,
  MOCK_EMPLOYERS,
  EMPLOYMENT_TYPES
};