'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/providers/AppStateProvider';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { WorkSessionView } from '@/components/work-session/WorkSessionView';
import { ProofsView } from '@/components/proofs/ProofsView';
import { ProfileView } from '@/components/profile/ProfileView';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { TopBar } from '@/components/navigation/TopBar';

export function MainAppScreen() {
  const { state } = useAppState();

  const renderCurrentView = () => {
    switch (state.currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'work-session':
        return <WorkSessionView />;
      case 'proofs':
        return <ProofsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content */}
      <motion.main
        key={state.currentTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pb-20 pt-16" // Account for top bar and bottom navigation
      >
        {renderCurrentView()}
      </motion.main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}