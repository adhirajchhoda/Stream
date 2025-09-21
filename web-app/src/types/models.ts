// Core data models matching the iOS app structure

export interface WorkScenario {
  id: string;
  employer: string;
  position: string;
  hours: number;
  hourlyRate: number;
  totalWage: number;
  description: string;
  employee: string;
  difficulty: WorkDifficulty;
  theme: string;
  scenarioType: ScenarioType;
  themeColor: string;
  iconName: string;
}

export type WorkDifficulty = 'easy' | 'medium' | 'hard';

export type ScenarioType = 'starbucks' | 'amazon' | 'uber' | 'custom';

export interface AttestationRequest {
  employerId: string;
  employeeWallet: string;
  wageData: WageData;
  metadata: AttestationMetadata;
}

export interface WageData {
  amount: number;
  currency: string;
  period: PayPeriod;
  workDetails: WorkDetails;
}

export interface WorkDetails {
  startTime: Date;
  endTime: Date;
  hoursWorked: number;
  position: string;
  location?: string;
}

export interface AttestationMetadata {
  version: string;
  timestamp: Date;
  nonce: string;
}

export type PayPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface AttestationResponse {
  id: string;
  employerId: string;
  employeeWallet: string;
  wageAmount: number;
  status: AttestationStatus;
  signature: string;
  nullifierHash: string;
  createdAt: Date;
  expiresAt: Date;
  proofData?: ZKProofData;
}

export type AttestationStatus = 'pending' | 'verified' | 'claimed' | 'expired' | 'revoked';

export interface ZKProofData {
  proof: ZKProof;
  publicSignals: string[];
  metadata: ProofMetadata;
}

export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface ProofMetadata {
  circuitId: string;
  provingTime: number;
  verificationKey: string;
  publicInputs: Record<string, string>;
}

export interface VerificationResponse {
  isValid: boolean;
  attestationId: string;
  verificationTimestamp: Date;
  errors?: string[];
  warnings?: string[];
}

// Work Session Models
export interface SessionData {
  status: SessionStatus;
  elapsedTime: number;
  currentEarnings: number;
}

export type SessionStatus = 'inactive' | 'active' | 'paused';

export interface SessionStats {
  hoursWorked: number;
  totalEarned: number;
  sessionsCompleted: number;
}

export interface CompletedSession {
  id: string;
  scenarioType: ScenarioType;
  employer: string;
  position: string;
  duration: number; // in hours
  earnings: number;
  completedAt: Date;
}

// ZK Proof Models
export interface ZKProofRecord {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  status: ProofStatus;
  progress: number;
  createdAt: Date;
  proofType: ProofType;
  generationTime: number;
  circuitVersion: string;
  circuitId: string;
  publicSignalsCount: number;
}

export type ProofStatus = 'generating' | 'completed' | 'failed' | 'verifying';

export type ProofType = 'wage_proof' | 'attendance_proof' | 'identity_proof';

export interface ProofStats {
  totalGenerated: number;
  successRate: number;
  averageTime: number;
  byStatus: Record<ProofStatus, number>;
}

// Wallet Models
export interface WalletConnection {
  address: string;
  chainId: number;
  isConnected: boolean;
}

export interface EthereumWallet extends WalletConnection {
  privateKey?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface BlockchainNetwork {
  chainId: number;
  name: string;
  rpcUrl: string;
  symbol: string;
}

export interface TransactionResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  status: TransactionStatus;
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionClaimStatus {
  transactionHash: string;
  status: TransactionStatus;
  blockNumber: number;
  confirmations: number;
}

// UI State Models
export interface ClaimStatus {
  type: 'available' | 'processing' | 'completed' | 'expired';
  displayName: string;
  color: string;
}

export interface OnboardingPage {
  title: string;
  description: string;
  iconName: string;
}

export interface SettingsItem {
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
}

// API Models
export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Witness Data for ZK Proof Generation
export interface WitnessData {
  wageAmount: number;
  hoursWorked: number;
  hourlyRate: number;
  timestamp: Date;
  nullifier: string;
}

// Employer Models
export interface EmployerRegistrationRequest {
  companyName: string;
  industry: string;
  walletAddress: string;
  contactEmail: string;
  taxId?: string;
}

export interface EmployerResponse {
  id: string;
  companyName: string;
  industry: string;
  walletAddress: string;
  verificationStatus: EmployerVerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployerVerificationStatus = 'pending' | 'verified' | 'rejected';

// Service Status Models
export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  uptime: number;
  services: {
    database: ServiceHealthStatus;
    blockchain: ServiceHealthStatus;
    zkProofs: ServiceHealthStatus;
  };
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: Date;
}

export interface NullifierStatus {
  exists: boolean;
  usedAt?: Date;
  attestationId?: string;
}

// Real-time Payroll Models
export interface PayrollCalculation {
  grossPay: number;
  netPay: number;
  deductions: PayrollDeductions;
  calculatedAt: Date;
  payPeriodStart: Date;
  payPeriodEnd: Date;
}

export interface PayrollDeductions {
  federalTax: number;
  stateTax: number;
  localTax: number;
  socialSecurity: number;
  medicare: number;
  healthInsurance?: number;
  retirement?: number;
  other?: Record<string, number>;
}

export interface LiveLedgerEntry {
  id: string;
  employeeWallet: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  timestamp: Date;
  zkProofHash?: string;
  verified: boolean;
}

// App Flow State
export type AppFlowState = 'loading' | 'onboarding' | 'authentication' | 'main' | 'error';

export type UserRole = 'employee' | 'employer' | 'admin';

export interface AppState {
  flowState: AppFlowState;
  currentTab: MainTab;
  userRole: UserRole;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
}

export type MainTab = 'dashboard' | 'work-session' | 'proofs' | 'profile';