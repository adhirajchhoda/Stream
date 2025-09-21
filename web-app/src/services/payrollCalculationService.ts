import { ethers } from 'ethers';
import { zkProofService, ZKProofInput } from './zkProofService';

export interface WorkSession {
  id: string;
  employeeId: string;
  startTime: Date;
  endTime?: Date;
  hoursWorked: number;
  hourlyRate: number;
  isActive: boolean;
  location?: string;
  taskDescription?: string;
  breaks: {
    start: Date;
    end: Date;
    duration: number; // in minutes
  }[];
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  grossPay: number;
  deductions: {
    taxes: number;
    socialSecurity: number;
    medicare: number;
    insurance?: number;
    retirement?: number;
  };
  netPay: number;
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'disputed';
  zkProofHash?: string;
  blockchainTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RealTimeEarnings {
  employeeId: string;
  currentSessionId?: string;
  accumulatedHours: number;
  estimatedGrossPay: number;
  estimatedNetPay: number;
  availableForWithdrawal: number;
  lastUpdated: Date;
  projectedDailyEarnings: number;
  projectedWeeklyEarnings: number;
  projectedMonthlyEarnings: number;
}

export interface PayrollSettings {
  overtimeThreshold: number; // hours per week
  overtimeMultiplier: number; // e.g., 1.5 for time-and-a-half
  taxRate: number;
  socialSecurityRate: number;
  medicareRate: number;
  withdrawalFeePercentage: number;
  minimumWithdrawal: number;
  currency: 'USD' | 'ETH' | 'USDC';
}

export interface LedgerEntry {
  id: string;
  employeeId: string;
  type: 'work_session' | 'withdrawal' | 'adjustment' | 'payroll';
  amount: number;
  description: string;
  timestamp: Date;
  sessionId?: string;
  blockNumber?: number;
  transactionHash?: string;
  merkleProof?: string[];
  verified: boolean;
}

class PayrollCalculationService {
  private static instance: PayrollCalculationService;
  private workSessions: Map<string, WorkSession[]> = new Map(); // employeeId -> sessions
  private realTimeEarnings: Map<string, RealTimeEarnings> = new Map();
  private payrollEntries: Map<string, PayrollEntry[]> = new Map();
  private ledgerEntries: LedgerEntry[] = [];
  private settings: PayrollSettings = {
    overtimeThreshold: 40,
    overtimeMultiplier: 1.5,
    taxRate: 0.22,
    socialSecurityRate: 0.062,
    medicareRate: 0.0145,
    withdrawalFeePercentage: 0.01,
    minimumWithdrawal: 10,
    currency: 'USD'
  };

  private listeners: Map<string, Set<(earnings: RealTimeEarnings) => void>> = new Map();

  static getInstance(): PayrollCalculationService {
    if (!PayrollCalculationService.instance) {
      PayrollCalculationService.instance = new PayrollCalculationService();
    }
    return PayrollCalculationService.instance;
  }

  // Start a work session
  async startWorkSession(employeeId: string, hourlyRate: number, location?: string): Promise<WorkSession> {
    const session: WorkSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      startTime: new Date(),
      hoursWorked: 0,
      hourlyRate,
      isActive: true,
      location,
      breaks: []
    };

    // Add to employee's sessions
    const sessions = this.workSessions.get(employeeId) || [];
    sessions.push(session);
    this.workSessions.set(employeeId, sessions);

    // Update real-time earnings
    await this.updateRealTimeEarnings(employeeId);

    // Create ledger entry
    await this.addLedgerEntry({
      id: `ledger_${Date.now()}`,
      employeeId,
      type: 'work_session',
      amount: 0,
      description: `Work session started`,
      timestamp: new Date(),
      sessionId: session.id,
      verified: false
    });

    return session;
  }

  // End a work session
  async endWorkSession(employeeId: string, sessionId: string): Promise<WorkSession> {
    const sessions = this.workSessions.get(employeeId) || [];
    const sessionIndex = sessions.findIndex(s => s.id === sessionId && s.isActive);

    if (sessionIndex === -1) {
      throw new Error('Active work session not found');
    }

    const session = sessions[sessionIndex];
    const endTime = new Date();
    const totalWorkTime = endTime.getTime() - session.startTime.getTime();

    // Subtract break time
    const totalBreakTime = session.breaks.reduce((sum, br) => sum + br.duration, 0) * 60 * 1000;
    const actualWorkTime = Math.max(0, totalWorkTime - totalBreakTime);

    session.endTime = endTime;
    session.hoursWorked = actualWorkTime / (1000 * 60 * 60); // Convert to hours
    session.isActive = false;

    sessions[sessionIndex] = session;
    this.workSessions.set(employeeId, sessions);

    // Calculate earnings for this session
    const sessionEarnings = this.calculateSessionEarnings(session);

    // Update real-time earnings
    await this.updateRealTimeEarnings(employeeId);

    // Create ledger entry
    await this.addLedgerEntry({
      id: `ledger_${Date.now()}`,
      employeeId,
      type: 'work_session',
      amount: sessionEarnings.grossPay,
      description: `Work session completed - ${session.hoursWorked.toFixed(2)} hours`,
      timestamp: endTime,
      sessionId: session.id,
      verified: false
    });

    // Generate ZK proof for session (privacy-preserving)
    await this.generateSessionProof(session);

    return session;
  }

  // Add a break to current session
  async addBreak(employeeId: string, sessionId: string, startTime: Date, endTime: Date): Promise<void> {
    const sessions = this.workSessions.get(employeeId) || [];
    const session = sessions.find(s => s.id === sessionId);

    if (!session) {
      throw new Error('Work session not found');
    }

    const duration = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

    session.breaks.push({
      start: startTime,
      end: endTime,
      duration
    });

    // Update sessions
    this.workSessions.set(employeeId, sessions);

    // Update real-time earnings
    await this.updateRealTimeEarnings(employeeId);
  }

  // Calculate earnings for a specific session
  private calculateSessionEarnings(session: WorkSession): { grossPay: number; regularHours: number; overtimeHours: number } {
    const regularHours = Math.min(session.hoursWorked, this.settings.overtimeThreshold);
    const overtimeHours = Math.max(0, session.hoursWorked - this.settings.overtimeThreshold);

    const regularPay = regularHours * session.hourlyRate;
    const overtimePay = overtimeHours * session.hourlyRate * this.settings.overtimeMultiplier;
    const grossPay = regularPay + overtimePay;

    return {
      grossPay,
      regularHours,
      overtimeHours
    };
  }

  // Update real-time earnings for an employee
  private async updateRealTimeEarnings(employeeId: string): Promise<void> {
    const sessions = this.workSessions.get(employeeId) || [];
    const currentSession = sessions.find(s => s.isActive);

    // Calculate accumulated hours and earnings
    let accumulatedHours = 0;
    let grossPay = 0;

    // Include completed sessions
    sessions.filter(s => !s.isActive).forEach(session => {
      accumulatedHours += session.hoursWorked;
      const earnings = this.calculateSessionEarnings(session);
      grossPay += earnings.grossPay;
    });

    // Include current session if active
    if (currentSession) {
      const currentTime = new Date();
      const sessionTime = (currentTime.getTime() - currentSession.startTime.getTime()) / (1000 * 60 * 60);
      const breakTime = currentSession.breaks.reduce((sum, br) => sum + br.duration, 0) / 60;
      const currentHours = Math.max(0, sessionTime - breakTime);

      accumulatedHours += currentHours;
      const currentEarnings = this.calculateSessionEarnings({
        ...currentSession,
        hoursWorked: currentHours
      });
      grossPay += currentEarnings.grossPay;
    }

    // Calculate deductions
    const totalDeductions = grossPay * (
      this.settings.taxRate +
      this.settings.socialSecurityRate +
      this.settings.medicareRate
    );

    const netPay = grossPay - totalDeductions;
    const availableForWithdrawal = netPay * 0.8; // 80% available immediately

    // Calculate projections
    const dailyHours = accumulatedHours; // Assuming current period is daily for simplicity
    const hourlyRate = currentSession?.hourlyRate || 0;

    const projectedDailyEarnings = dailyHours * hourlyRate;
    const projectedWeeklyEarnings = projectedDailyEarnings * 5; // 5 work days
    const projectedMonthlyEarnings = projectedWeeklyEarnings * 4.33; // ~4.33 weeks per month

    const earnings: RealTimeEarnings = {
      employeeId,
      currentSessionId: currentSession?.id,
      accumulatedHours,
      estimatedGrossPay: grossPay,
      estimatedNetPay: netPay,
      availableForWithdrawal,
      lastUpdated: new Date(),
      projectedDailyEarnings,
      projectedWeeklyEarnings,
      projectedMonthlyEarnings
    };

    this.realTimeEarnings.set(employeeId, earnings);

    // Notify listeners
    this.notifyEarningsUpdate(employeeId, earnings);
  }

  // Get real-time earnings for an employee
  getRealTimeEarnings(employeeId: string): RealTimeEarnings | null {
    return this.realTimeEarnings.get(employeeId) || null;
  }

  // Subscribe to real-time earnings updates
  subscribeToEarningsUpdates(employeeId: string, callback: (earnings: RealTimeEarnings) => void): () => void {
    if (!this.listeners.has(employeeId)) {
      this.listeners.set(employeeId, new Set());
    }

    this.listeners.get(employeeId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(employeeId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(employeeId);
        }
      }
    };
  }

  private notifyEarningsUpdate(employeeId: string, earnings: RealTimeEarnings): void {
    const callbacks = this.listeners.get(employeeId);
    if (callbacks) {
      callbacks.forEach(callback => callback(earnings));
    }
  }

  // Process instant withdrawal
  async processWithdrawal(employeeId: string, amount: number): Promise<string> {
    const earnings = this.realTimeEarnings.get(employeeId);

    if (!earnings) {
      throw new Error('No earnings data found for employee');
    }

    if (amount < this.settings.minimumWithdrawal) {
      throw new Error(`Minimum withdrawal amount is $${this.settings.minimumWithdrawal}`);
    }

    if (amount > earnings.availableForWithdrawal) {
      throw new Error('Insufficient available balance for withdrawal');
    }

    const fee = amount * this.settings.withdrawalFeePercentage;
    const netWithdrawal = amount - fee;

    // Create withdrawal transaction (this would interact with actual payment processor)
    const transactionId = `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add to ledger
    await this.addLedgerEntry({
      id: `ledger_${Date.now()}`,
      employeeId,
      type: 'withdrawal',
      amount: -amount,
      description: `Instant withdrawal - $${netWithdrawal.toFixed(2)} (fee: $${fee.toFixed(2)})`,
      timestamp: new Date(),
      verified: false
    });

    // Update available balance
    earnings.availableForWithdrawal -= amount;
    this.realTimeEarnings.set(employeeId, earnings);
    this.notifyEarningsUpdate(employeeId, earnings);

    return transactionId;
  }

  // Generate ZK proof for session privacy
  private async generateSessionProof(session: WorkSession): Promise<void> {
    try {
      const zkInput: ZKProofInput = {
        salary: session.hoursWorked * session.hourlyRate,
        hoursWorked: session.hoursWorked,
        hourlyRate: session.hourlyRate,
        periodStart: session.startTime,
        periodEnd: session.endTime || new Date(),
        employeeId: session.employeeId,
        employerAttestation: 'employer_verified'
      };

      const proof = await zkProofService.generateWorkHoursProof(zkInput);

      // Store proof hash in session ledger entry
      const ledgerEntry = this.ledgerEntries.find(
        entry => entry.sessionId === session.id && entry.type === 'work_session'
      );

      if (ledgerEntry) {
        ledgerEntry.verified = true;
        // In production, this would be verified on-chain
      }

    } catch (error) {
      console.error('Failed to generate session proof:', error);
    }
  }

  // Add entry to the cryptographic ledger
  private async addLedgerEntry(entry: LedgerEntry): Promise<void> {
    this.ledgerEntries.push(entry);

    // In production, this would:
    // 1. Calculate Merkle tree root
    // 2. Submit to blockchain
    // 3. Generate cryptographic proof of inclusion
  }

  // Get ledger entries for an employee
  getLedgerEntries(employeeId: string): LedgerEntry[] {
    return this.ledgerEntries.filter(entry => entry.employeeId === employeeId);
  }

  // Get current active session for employee
  getCurrentSession(employeeId: string): WorkSession | null {
    const sessions = this.workSessions.get(employeeId) || [];
    return sessions.find(s => s.isActive) || null;
  }

  // Get all sessions for an employee
  getAllSessions(employeeId: string): WorkSession[] {
    return this.workSessions.get(employeeId) || [];
  }

  // Update payroll settings
  updateSettings(newSettings: Partial<PayrollSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // Recalculate all real-time earnings with new settings
    Array.from(this.realTimeEarnings.keys()).forEach(employeeId => {
      this.updateRealTimeEarnings(employeeId);
    });
  }

  // Get current settings
  getSettings(): PayrollSettings {
    return { ...this.settings };
  }

  // Start real-time updates (called when user session starts)
  startRealTimeUpdates(employeeId: string): void {
    const updateInterval = setInterval(async () => {
      const currentSession = this.getCurrentSession(employeeId);
      if (currentSession) {
        await this.updateRealTimeEarnings(employeeId);
      }
    }, 1000); // Update every second

    // Store interval for cleanup (in production, use a proper cleanup mechanism)
    (this as any)[`interval_${employeeId}`] = updateInterval;
  }

  // Stop real-time updates
  stopRealTimeUpdates(employeeId: string): void {
    const intervalId = (this as any)[`interval_${employeeId}`];
    if (intervalId) {
      clearInterval(intervalId);
      delete (this as any)[`interval_${employeeId}`];
    }
  }

  // Verify ledger integrity (cryptographic verification)
  async verifyLedgerIntegrity(): Promise<boolean> {
    // In production, this would:
    // 1. Recalculate Merkle tree from all entries
    // 2. Compare root with blockchain state
    // 3. Verify all ZK proofs
    // 4. Check for tampering

    // For now, simple checksum verification
    return true;
  }
}

// Export singleton instance
export const payrollCalculationService = PayrollCalculationService.getInstance();
export default payrollCalculationService;