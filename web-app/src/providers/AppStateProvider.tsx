'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, AppFlowState, MainTab, UserRole } from '@/types/models';

interface AppStateContextType {
  state: AppState;
  setFlowState: (flowState: AppFlowState) => void;
  setCurrentTab: (tab: MainTab) => void;
  setUserRole: (role: UserRole) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  completeOnboarding: () => void;
  authenticate: () => void;
  logout: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

type AppStateAction =
  | { type: 'SET_FLOW_STATE'; payload: AppFlowState }
  | { type: 'SET_CURRENT_TAB'; payload: MainTab }
  | { type: 'SET_USER_ROLE'; payload: UserRole }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_ONBOARDING_COMPLETED'; payload: boolean }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'AUTHENTICATE' }
  | { type: 'LOGOUT' }
  | { type: 'LOAD_PERSISTED_STATE'; payload: Partial<AppState> };

const initialState: AppState = {
  flowState: 'loading',
  currentTab: 'dashboard',
  userRole: 'employee',
  isAuthenticated: false,
  hasCompletedOnboarding: false,
};

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'SET_FLOW_STATE':
      return { ...state, flowState: action.payload };

    case 'SET_CURRENT_TAB':
      return { ...state, currentTab: action.payload };

    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };

    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };

    case 'SET_ONBOARDING_COMPLETED':
      return { ...state, hasCompletedOnboarding: action.payload };

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        hasCompletedOnboarding: true,
        flowState: 'authentication',
      };

    case 'AUTHENTICATE':
      return {
        ...state,
        isAuthenticated: true,
        flowState: 'main',
      };

    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        flowState: 'authentication',
      };

    case 'LOAD_PERSISTED_STATE':
      return {
        ...state,
        ...action.payload,
        flowState: 'loading', // Always start with loading to determine the correct flow
        // Ensure isAuthenticated is properly restored from persistence
        isAuthenticated: action.payload.isAuthenticated || false,
      };

    default:
      return state;
  }
}

interface AppStateProviderProps {
  children: React.ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const persisted = localStorage.getItem('stream-app-state');
        if (persisted) {
          const parsed = JSON.parse(persisted);
          dispatch({ type: 'LOAD_PERSISTED_STATE', payload: parsed });
        }
      } catch (error) {
        console.warn('Failed to load persisted app state:', error);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(loadPersistedState, 100);
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    if (state.flowState !== 'loading') {
      try {
        const stateToPersist = {
          userRole: state.userRole,
          hasCompletedOnboarding: state.hasCompletedOnboarding,
          currentTab: state.currentTab,
          isAuthenticated: state.isAuthenticated,
        };
        localStorage.setItem('stream-app-state', JSON.stringify(stateToPersist));
      } catch (error) {
        console.warn('Failed to persist app state:', error);
      }
    }
  }, [state]);

  // Determine the correct flow state based on persisted data
  useEffect(() => {
    if (state.flowState === 'loading') {
      console.log('Stream App: Initializing flow state transition...', {
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isAuthenticated: state.isAuthenticated,
      });

      // Simulate initialization delay
      const timer = setTimeout(() => {
        if (!state.hasCompletedOnboarding) {
          console.log('Stream App: Transitioning to onboarding');
          dispatch({ type: 'SET_FLOW_STATE', payload: 'onboarding' });
        } else if (!state.isAuthenticated) {
          console.log('Stream App: Transitioning to authentication');
          dispatch({ type: 'SET_FLOW_STATE', payload: 'authentication' });
        } else {
          console.log('Stream App: Transitioning to main app');
          dispatch({ type: 'SET_FLOW_STATE', payload: 'main' });
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [state.flowState, state.hasCompletedOnboarding, state.isAuthenticated]);

  const contextValue: AppStateContextType = {
    state,
    setFlowState: (flowState) => dispatch({ type: 'SET_FLOW_STATE', payload: flowState }),
    setCurrentTab: (tab) => dispatch({ type: 'SET_CURRENT_TAB', payload: tab }),
    setUserRole: (role) => dispatch({ type: 'SET_USER_ROLE', payload: role }),
    setAuthenticated: (authenticated) => dispatch({ type: 'SET_AUTHENTICATED', payload: authenticated }),
    setOnboardingCompleted: (completed) => dispatch({ type: 'SET_ONBOARDING_COMPLETED', payload: completed }),
    completeOnboarding: () => dispatch({ type: 'COMPLETE_ONBOARDING' }),
    authenticate: () => dispatch({ type: 'AUTHENTICATE' }),
    logout: () => dispatch({ type: 'LOGOUT' }),
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}