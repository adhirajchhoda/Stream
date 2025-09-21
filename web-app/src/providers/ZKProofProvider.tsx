'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ZKProofData, ZKProofRecord, ProofStats, WitnessData, ProofStatus } from '@/types/models';
import { zkProofService, ZKProofInput, ZKProofOutput } from '@/services/zkProofService';
import { useWallet } from './WalletProvider';

interface ZKProofState {
  activeProofs: ZKProofRecord[];
  completedProofs: ZKProofRecord[];
  proofStats: ProofStats;
  isGenerating: boolean;
  generationProgress: number;
  currentProofId: string | null;
  error: string | null;
}

interface ZKProofContextType {
  state: ZKProofState;
  generateProof: (witnessData: WitnessData) => Promise<ZKProofData>;
  generateSalaryProof: (input: ZKProofInput) => Promise<ZKProofOutput>;
  generateWorkHoursProof: (input: ZKProofInput) => Promise<ZKProofOutput>;
  generateEmploymentProof: (input: ZKProofInput) => Promise<ZKProofOutput>;
  verifyProof: (proofData: ZKProofData) => Promise<boolean>;
  submitProofToBlockchain: (proofOutput: ZKProofOutput, contractAddress: string) => Promise<string>;
  getProofById: (id: string) => ZKProofRecord | null;
  updateProofStatus: (id: string, status: ProofStatus) => void;
  clearError: () => void;
  isZKSupported: boolean;
}

const ZKProofContext = createContext<ZKProofContextType | undefined>(undefined);

type ZKProofAction =
  | { type: 'START_GENERATION'; payload: { proofId: string } }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'GENERATION_SUCCESS'; payload: ZKProofRecord }
  | { type: 'GENERATION_FAILED'; payload: { proofId: string; error: string } }
  | { type: 'UPDATE_PROOF_STATUS'; payload: { id: string; status: ProofStatus } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_PROOFS'; payload: ZKProofRecord[] }
  | { type: 'UPDATE_STATS'; payload: ProofStats };

const initialStats: ProofStats = {
  totalGenerated: 0,
  successRate: 100,
  averageTime: 0,
  byStatus: {
    generating: 0,
    completed: 0,
    failed: 0,
    verifying: 0,
  },
};

const initialState: ZKProofState = {
  activeProofs: [],
  completedProofs: [],
  proofStats: initialStats,
  isGenerating: false,
  generationProgress: 0,
  currentProofId: null,
  error: null,
};

function zkProofReducer(state: ZKProofState, action: ZKProofAction): ZKProofState {
  switch (action.type) {
    case 'START_GENERATION':
      return {
        ...state,
        isGenerating: true,
        generationProgress: 0,
        currentProofId: action.payload.proofId,
        error: null,
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        generationProgress: action.payload,
      };

    case 'GENERATION_SUCCESS': {
      const newProof = action.payload;
      const updatedActiveProofs = state.activeProofs.filter(p => p.id !== newProof.id);
      const updatedCompletedProofs = [...state.completedProofs, newProof];

      return {
        ...state,
        activeProofs: updatedActiveProofs,
        completedProofs: updatedCompletedProofs,
        isGenerating: false,
        generationProgress: 100,
        currentProofId: null,
      };
    }

    case 'GENERATION_FAILED': {
      const { proofId, error } = action.payload;
      const updatedActiveProofs = state.activeProofs.map(proof =>
        proof.id === proofId
          ? { ...proof, status: 'failed' as ProofStatus }
          : proof
      );

      return {
        ...state,
        activeProofs: updatedActiveProofs,
        isGenerating: false,
        generationProgress: 0,
        currentProofId: null,
        error,
      };
    }

    case 'UPDATE_PROOF_STATUS': {
      const { id, status } = action.payload;

      const updateProofInArray = (proofs: ZKProofRecord[]) =>
        proofs.map(proof => proof.id === id ? { ...proof, status } : proof);

      return {
        ...state,
        activeProofs: updateProofInArray(state.activeProofs),
        completedProofs: updateProofInArray(state.completedProofs),
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'LOAD_PROOFS':
      const proofs = action.payload;
      const active = proofs.filter(p => p.status === 'generating' || p.status === 'verifying');
      const completed = proofs.filter(p => p.status === 'completed' || p.status === 'failed');

      return {
        ...state,
        activeProofs: active,
        completedProofs: completed,
      };

    case 'UPDATE_STATS':
      return {
        ...state,
        proofStats: action.payload,
      };

    default:
      return state;
  }
}

interface ZKProofProviderProps {
  children: React.ReactNode;
}

export function ZKProofProvider({ children }: ZKProofProviderProps) {
  const [state, dispatch] = useReducer(zkProofReducer, initialState);
  const { state: walletState } = useWallet();
  const [isZKSupported, setIsZKSupported] = React.useState(false);

  // Initialize ZK-proof service and check WebAssembly support
  useEffect(() => {
    const initializeZK = async () => {
      try {
        setIsZKSupported(typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function');
        await zkProofService.initialize();
        await zkProofService.preloadCircuits();
      } catch (error) {
        console.error('Failed to initialize ZK-proof service:', error);
        setIsZKSupported(false);
      }
    };

    initializeZK();
  }, []);

  // Real ZK-proof generation using snarkjs and WebAssembly
  const generateProof = useCallback(async (witnessData: WitnessData): Promise<ZKProofData> => {
    if (!isZKSupported) {
      throw new Error('WebAssembly not supported in this browser');
    }

    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create initial proof record
    const proofRecord: ZKProofRecord = {
      id: proofId,
      title: 'Salary Proof',
      subtitle: `${witnessData.hoursWorked}h @ $${witnessData.hourlyRate}/hr`,
      amount: witnessData.wageAmount,
      status: 'generating',
      progress: 0,
      createdAt: new Date(),
      proofType: 'wage_proof',
      generationTime: 0,
      circuitVersion: 'v1.0.0',
      circuitId: 'salary_v1',
      publicSignalsCount: 4,
    };

    dispatch({ type: 'START_GENERATION', payload: { proofId } });

    try {
      const startTime = Date.now();

      // Progress updates
      dispatch({ type: 'UPDATE_PROGRESS', payload: 10 });

      // Prepare input for ZK circuit
      const zkInput: ZKProofInput = {
        salary: witnessData.wageAmount,
        hoursWorked: witnessData.hoursWorked,
        hourlyRate: witnessData.hourlyRate,
        periodStart: new Date(witnessData.timestamp.getTime() - 7 * 24 * 60 * 60 * 1000), // Week ago
        periodEnd: witnessData.timestamp,
        employeeId: witnessData.nullifier, // Use nullifier as employee ID
        employerAttestation: 'employer_signature_placeholder'
      };

      dispatch({ type: 'UPDATE_PROGRESS', payload: 30 });

      // Generate the actual ZK proof
      const zkProofOutput = await zkProofService.generateSalaryProof(zkInput);

      dispatch({ type: 'UPDATE_PROGRESS', payload: 80 });

      const generationTime = (Date.now() - startTime) / 1000;

      // Convert to our internal format
      const proofData: ZKProofData = {
        proof: {
          pi_a: zkProofOutput.proof.pi_a,
          pi_b: zkProofOutput.proof.pi_b,
          pi_c: zkProofOutput.proof.pi_c,
          protocol: 'groth16',
          curve: 'bn254',
        },
        publicSignals: zkProofOutput.publicSignals,
        metadata: {
          circuitId: 'salary_v1',
          provingTime: generationTime,
          verificationKey: JSON.stringify(zkProofOutput.verificationKey),
          publicInputs: {
            wageAmount: String(Math.floor(witnessData.wageAmount * 1e18)),
            nullifierHash: witnessData.nullifier,
          },
        },
      };

      dispatch({ type: 'UPDATE_PROGRESS', payload: 100 });

      // Update proof record with completion
      const completedProof: ZKProofRecord = {
        ...proofRecord,
        status: 'completed',
        progress: 100,
        generationTime,
      };

      dispatch({ type: 'GENERATION_SUCCESS', payload: completedProof });

      return proofData;

    } catch (error: any) {
      dispatch({
        type: 'GENERATION_FAILED',
        payload: { proofId, error: error.message || 'Proof generation failed' }
      });
      throw error;
    }
  }, [isZKSupported]);

  // Generate salary-specific proof
  const generateSalaryProof = useCallback(async (input: ZKProofInput): Promise<ZKProofOutput> => {
    if (!isZKSupported) {
      throw new Error('WebAssembly not supported in this browser');
    }

    try {
      return await zkProofService.generateSalaryProof(input);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [isZKSupported]);

  // Generate work hours proof
  const generateWorkHoursProof = useCallback(async (input: ZKProofInput): Promise<ZKProofOutput> => {
    if (!isZKSupported) {
      throw new Error('WebAssembly not supported in this browser');
    }

    try {
      return await zkProofService.generateWorkHoursProof(input);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [isZKSupported]);

  // Generate employment proof
  const generateEmploymentProof = useCallback(async (input: ZKProofInput): Promise<ZKProofOutput> => {
    if (!isZKSupported) {
      throw new Error('WebAssembly not supported in this browser');
    }

    try {
      return await zkProofService.generateEmploymentProof(input);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [isZKSupported]);

  // Submit proof to blockchain
  const submitProofToBlockchain = useCallback(async (proofOutput: ZKProofOutput, contractAddress: string): Promise<string> => {
    if (walletState.connectionStatus !== 'connected' || !walletState.connectedWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // For now, we'll simulate the blockchain submission
      // In a real implementation, you would use the wallet's provider to get a signer
      return await zkProofService.submitProofToBlockchain(proofOutput, contractAddress, null);
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [walletState.connectionStatus, walletState.connectedWallet]);

  // Real proof verification using snarkjs
  const verifyProof = useCallback(async (proofData: ZKProofData): Promise<boolean> => {
    if (!isZKSupported) {
      console.warn('WebAssembly not supported, skipping verification');
      return false;
    }

    try {
      // Convert proof back to snarkjs format
      const proof = {
        pi_a: proofData.proof.pi_a as [string, string],
        pi_b: proofData.proof.pi_b as [[string, string], [string, string]],
        pi_c: proofData.proof.pi_c as [string, string]
      };

      // Determine proof type based on circuit ID
      let proofType: 'salary' | 'workHours' | 'employment' = 'salary';
      if (proofData.metadata.circuitId.includes('work_hours')) {
        proofType = 'workHours';
      } else if (proofData.metadata.circuitId.includes('employment')) {
        proofType = 'employment';
      }

      return await zkProofService.verifyProof(proofType, proof, proofData.publicSignals);
    } catch (error) {
      console.error('Proof verification failed:', error);
      return false;
    }
  }, [isZKSupported]);

  const getProofById = useCallback((id: string): ZKProofRecord | null => {
    const allProofs = [...state.activeProofs, ...state.completedProofs];
    return allProofs.find(proof => proof.id === id) || null;
  }, [state.activeProofs, state.completedProofs]);

  const updateProofStatus = useCallback((id: string, status: ProofStatus) => {
    dispatch({ type: 'UPDATE_PROOF_STATUS', payload: { id, status } });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const contextValue: ZKProofContextType = {
    state,
    generateProof,
    generateSalaryProof,
    generateWorkHoursProof,
    generateEmploymentProof,
    verifyProof,
    submitProofToBlockchain,
    getProofById,
    updateProofStatus,
    clearError,
    isZKSupported,
  };

  return (
    <ZKProofContext.Provider value={contextValue}>
      {children}
    </ZKProofContext.Provider>
  );
}

export function useZKProof() {
  const context = useContext(ZKProofContext);
  if (context === undefined) {
    throw new Error('useZKProof must be used within a ZKProofProvider');
  }
  return context;
}

// Utility function to generate random hex strings for mock data
function generateRandomHex(length: number = 64): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}