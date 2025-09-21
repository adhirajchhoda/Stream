'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { ZKProofData, ZKProofRecord, ProofStats, WitnessData, ProofStatus } from '@/types/models';

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
  verifyProof: (proofData: ZKProofData) => Promise<boolean>;
  getProofById: (id: string) => ZKProofRecord | null;
  updateProofStatus: (id: string, status: ProofStatus) => void;
  clearError: () => void;
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

  // Mock ZK-proof generation (in production, this would use WebAssembly and actual circuits)
  const generateProof = useCallback(async (witnessData: WitnessData): Promise<ZKProofData> => {
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create initial proof record
    const proofRecord: ZKProofRecord = {
      id: proofId,
      title: 'Wage Proof',
      subtitle: `${witnessData.hoursWorked}h @ $${witnessData.hourlyRate}/hr`,
      amount: witnessData.wageAmount,
      status: 'generating',
      progress: 0,
      createdAt: new Date(),
      proofType: 'wage_proof',
      generationTime: 0,
      circuitVersion: 'v1.0.0',
      circuitId: 'wage_proof_v1',
      publicSignalsCount: 4,
    };

    dispatch({ type: 'START_GENERATION', payload: { proofId } });

    try {
      // Simulate proof generation stages
      const stages = [
        { name: 'Loading circuit', progress: 10, delay: 300 },
        { name: 'Generating witness', progress: 25, delay: 500 },
        { name: 'Computing proof', progress: 60, delay: 1500 },
        { name: 'Verifying proof', progress: 85, delay: 800 },
        { name: 'Finalizing', progress: 100, delay: 200 },
      ];

      const startTime = Date.now();

      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, stage.delay));
        dispatch({ type: 'UPDATE_PROGRESS', payload: stage.progress });
      }

      const generationTime = (Date.now() - startTime) / 1000;

      // Create mock proof data
      const proofData: ZKProofData = {
        proof: {
          pi_a: [generateRandomHex(), generateRandomHex(), '0x1'],
          pi_b: [
            [generateRandomHex(), generateRandomHex()],
            [generateRandomHex(), generateRandomHex()],
            ['0x1', '0x0']
          ],
          pi_c: [generateRandomHex(), generateRandomHex(), '0x1'],
          protocol: 'groth16',
          curve: 'bn254',
        },
        publicSignals: [
          String(Math.floor(witnessData.wageAmount * 1e18)), // Convert to wei
          String(Math.floor(witnessData.hoursWorked * 100)),
          String(Math.floor(witnessData.hourlyRate * 100)),
          String(Math.floor(witnessData.timestamp.getTime() / 1000))
        ],
        metadata: {
          circuitId: 'wage_proof_v1',
          provingTime: generationTime,
          verificationKey: generateRandomHex(),
          publicInputs: {
            wageAmount: String(Math.floor(witnessData.wageAmount * 1e18)),
            nullifierHash: witnessData.nullifier,
          },
        },
      };

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
  }, []);

  // Mock proof verification
  const verifyProof = useCallback(async (proofData: ZKProofData): Promise<boolean> => {
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // In production, this would use snarkjs or similar to verify the proof
    // For demo purposes, we'll simulate a high success rate
    const isValid = Math.random() > 0.05; // 95% success rate

    return isValid;
  }, []);

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
    verifyProof,
    getProofById,
    updateProofStatus,
    clearError,
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