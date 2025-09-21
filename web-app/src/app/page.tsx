'use client';

import React from 'react';
import { useAppState } from '@/providers/AppStateProvider';
import { LoadingScreen } from '@/components/screens/LoadingScreen';
import { OnboardingScreen } from '@/components/screens/OnboardingScreen';
import { AuthenticationScreen } from '@/components/screens/AuthenticationScreen';
import { MainAppScreen } from '@/components/screens/MainAppScreen';
import { ErrorScreen } from '@/components/screens/ErrorScreen';

export default function HomePage() {
  const { state } = useAppState();

  // Render the appropriate screen based on the current flow state
  switch (state.flowState) {
    case 'loading':
      return <LoadingScreen />;

    case 'onboarding':
      return <OnboardingScreen />;

    case 'authentication':
      return <AuthenticationScreen />;

    case 'main':
      return <MainAppScreen />;

    case 'error':
      return <ErrorScreen />;

    default:
      return <LoadingScreen />;
  }
}