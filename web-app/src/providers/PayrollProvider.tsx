'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  payrollCalculationService,
  WorkSession,
  RealTimeEarnings,
  PayrollEntry,
  LedgerEntry,
  PayrollSettings
} from '@/services/payrollCalculationService';
import { useAppState } from './AppStateProvider';

interface PayrollState {
  currentSession: WorkSession | null;
  realTimeEarnings: RealTimeEarnings | null;
  sessions: WorkSession[];
  ledgerEntries: LedgerEntry[];
  isSessionActive: boolean;
  sessionStartTime: Date | null;
  elapsedTime: number; // in seconds
  isLoading: boolean;
  error: string | null;
  settings: PayrollSettings;
}

interface PayrollContextType {
  state: PayrollState;
  startWorkSession: (hourlyRate: number, location?: string) => Promise<void>;
  endWorkSession: () => Promise<void>;
  addBreak: (startTime: Date, endTime: Date) => Promise<void>;
  processWithdrawal: (amount: number) => Promise<string>;
  updateSettings: (settings: Partial<PayrollSettings>) => void;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

type PayrollAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_SESSION'; payload: WorkSession | null }
  | { type: 'SET_REAL_TIME_EARNINGS'; payload: RealTimeEarnings | null }
  | { type: 'SET_SESSIONS'; payload: WorkSession[] }
  | { type: 'SET_LEDGER_ENTRIES'; payload: LedgerEntry[] }
  | { type: 'UPDATE_ELAPSED_TIME'; payload: number }
  | { type: 'SET_SETTINGS'; payload: PayrollSettings }
  | { type: 'SESSION_STARTED'; payload: { session: WorkSession; startTime: Date } }
  | { type: 'SESSION_ENDED' };

const initialState: PayrollState = {
  currentSession: null,
  realTimeEarnings: null,
  sessions: [],
  ledgerEntries: [],
  isSessionActive: false,
  sessionStartTime: null,
  elapsedTime: 0,
  isLoading: false,
  error: null,
  settings: payrollCalculationService.getSettings(),
};

function payrollReducer(state: PayrollState, action: PayrollAction): PayrollState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSession: action.payload,
        isSessionActive: action.payload?.isActive || false,
      };

    case 'SET_REAL_TIME_EARNINGS':
      return {
        ...state,
        realTimeEarnings: action.payload,
      };

    case 'SET_SESSIONS':
      return {
        ...state,
        sessions: action.payload,
      };

    case 'SET_LEDGER_ENTRIES':
      return {
        ...state,
        ledgerEntries: action.payload,
      };

    case 'UPDATE_ELAPSED_TIME':
      return {
        ...state,
        elapsedTime: action.payload,
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
      };

    case 'SESSION_STARTED':
      return {
        ...state,
        currentSession: action.payload.session,
        isSessionActive: true,
        sessionStartTime: action.payload.startTime,
        elapsedTime: 0,
      };

    case 'SESSION_ENDED':
      return {
        ...state,
        currentSession: null,
        isSessionActive: false,
        sessionStartTime: null,
        elapsedTime: 0,
      };

    default:
      return state;
  }
}

interface PayrollProviderProps {
  children: React.ReactNode;
}

export function PayrollProvider({ children }: PayrollProviderProps) {
  const [state, dispatch] = useReducer(payrollReducer, initialState);
  const { state: appState } = useAppState();
  const employeeId = appState.userRole === 'employee' ? 'current_user' : ''; // In production, get from auth

  // Timer for elapsed time updates
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (state.isSessionActive && state.sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - state.sessionStartTime!.getTime()) / 1000);
        dispatch({ type: 'UPDATE_ELAPSED_TIME', payload: elapsed });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.isSessionActive, state.sessionStartTime]);

  // Subscribe to real-time earnings updates
  useEffect(() => {
    if (!employeeId) return;

    const unsubscribe = payrollCalculationService.subscribeToEarningsUpdates(
      employeeId,
      (earnings: RealTimeEarnings) => {
        dispatch({ type: 'SET_REAL_TIME_EARNINGS', payload: earnings });
      }
    );

    // Start real-time updates
    payrollCalculationService.startRealTimeUpdates(employeeId);

    return () => {
      unsubscribe();
      payrollCalculationService.stopRealTimeUpdates(employeeId);
    };
  }, [employeeId]);

  // Load initial data
  useEffect(() => {
    if (employeeId) {
      refreshData();
    }
  }, [employeeId]);

  const startWorkSession = useCallback(async (hourlyRate: number, location?: string) => {
    if (!employeeId) {
      throw new Error('Employee ID not available');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const session = await payrollCalculationService.startWorkSession(
        employeeId,
        hourlyRate,
        location
      );

      dispatch({
        type: 'SESSION_STARTED',
        payload: {
          session,
          startTime: session.startTime
        }
      });

      // Refresh data to get updated sessions list
      await refreshData();

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to start work session' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [employeeId]);

  const endWorkSession = useCallback(async () => {
    if (!employeeId || !state.currentSession) {
      throw new Error('No active work session');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await payrollCalculationService.endWorkSession(employeeId, state.currentSession.id);

      dispatch({ type: 'SESSION_ENDED' });

      // Refresh data to get updated sessions and earnings
      await refreshData();

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to end work session' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [employeeId, state.currentSession]);

  const addBreak = useCallback(async (startTime: Date, endTime: Date) => {
    if (!employeeId || !state.currentSession) {
      throw new Error('No active work session');
    }

    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      await payrollCalculationService.addBreak(
        employeeId,
        state.currentSession.id,
        startTime,
        endTime
      );

      // Refresh current session data
      const updatedSession = payrollCalculationService.getCurrentSession(employeeId);
      dispatch({ type: 'SET_CURRENT_SESSION', payload: updatedSession });

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to add break' });
      throw error;
    }
  }, [employeeId, state.currentSession]);

  const processWithdrawal = useCallback(async (amount: number): Promise<string> => {
    if (!employeeId) {
      throw new Error('Employee ID not available');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const transactionId = await payrollCalculationService.processWithdrawal(employeeId, amount);

      // Refresh data to show updated available balance
      await refreshData();

      return transactionId;

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Withdrawal failed' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [employeeId]);

  const updateSettings = useCallback((newSettings: Partial<PayrollSettings>) => {
    payrollCalculationService.updateSettings(newSettings);
    const updatedSettings = payrollCalculationService.getSettings();
    dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
  }, []);

  const refreshData = useCallback(async () => {
    if (!employeeId) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Get current session
      const currentSession = payrollCalculationService.getCurrentSession(employeeId);
      dispatch({ type: 'SET_CURRENT_SESSION', payload: currentSession });

      // Get all sessions
      const sessions = payrollCalculationService.getAllSessions(employeeId);
      dispatch({ type: 'SET_SESSIONS', payload: sessions });

      // Get real-time earnings
      const earnings = payrollCalculationService.getRealTimeEarnings(employeeId);
      dispatch({ type: 'SET_REAL_TIME_EARNINGS', payload: earnings });

      // Get ledger entries
      const ledgerEntries = payrollCalculationService.getLedgerEntries(employeeId);
      dispatch({ type: 'SET_LEDGER_ENTRIES', payload: ledgerEntries });

      // Get settings
      const settings = payrollCalculationService.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: settings });

    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to refresh data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [employeeId]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const contextValue: PayrollContextType = {
    state,
    startWorkSession,
    endWorkSession,
    addBreak,
    processWithdrawal,
    updateSettings,
    refreshData,
    clearError,
  };

  return (
    <PayrollContext.Provider value={contextValue}>
      {children}
    </PayrollContext.Provider>
  );
}

export function usePayroll() {
  const context = useContext(PayrollContext);
  if (context === undefined) {
    throw new Error('usePayroll must be used within a PayrollProvider');
  }
  return context;
}

// Utility hooks for specific payroll data
export function useRealTimeEarnings() {
  const { state } = usePayroll();
  return state.realTimeEarnings;
}

export function useCurrentSession() {
  const { state } = usePayroll();
  return {
    session: state.currentSession,
    isActive: state.isSessionActive,
    elapsedTime: state.elapsedTime,
    startTime: state.sessionStartTime,
  };
}

export function usePayrollSettings() {
  const { state, updateSettings } = usePayroll();
  return {
    settings: state.settings,
    updateSettings,
  };
}