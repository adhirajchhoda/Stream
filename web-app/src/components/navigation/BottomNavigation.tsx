'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Clock, Shield, User } from 'lucide-react';
import { useAppState } from '@/providers/AppStateProvider';
import { cn } from '@/utils/cn';

export function BottomNavigation() {
  const { state, setCurrentTab } = useAppState();

  const getNavigationItems = () => {
    if (state.userRole === 'employer') {
      return [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Home,
        },
        {
          id: 'work-session',
          label: 'Employees',
          icon: Clock,
        },
        {
          id: 'proofs',
          label: 'Proofs',
          icon: Shield,
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
        },
      ] as const;
    }

    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
      },
      {
        id: 'work-session',
        label: 'Work',
        icon: Clock,
      },
      {
        id: 'proofs',
        label: 'Proofs',
        icon: Shield,
      },
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
      },
    ] as const;
  };

  const navigationItems = getNavigationItems();

  return (
    <motion.nav
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border"
    >
      <div className="flex items-center justify-around px-2 py-2 safe-area-pb">
        {navigationItems.map((item) => {
          const isActive = state.currentTab === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentTab(item.id)}
              className={cn(
                'relative flex flex-col items-center justify-center px-4 py-3 rounded-xl transition-colors duration-150',
                isActive
                  ? 'text-blue'
                  : 'text-charcoal/60 hover:text-blue'
              )}
            >
              {/* Enhanced active indicator */}
              {isActive && (
                <motion.div layoutId="activeTab" className="absolute -top-1 w-1 h-1 rounded-full bg-blue" />
              )}

              {/* Icon */}
              <motion.div
                className="relative z-10 mb-1"
                animate={isActive ? { y: -1 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'text-blue' : 'text-current')} />
              </motion.div>

              {/* Label */}
              <span className={cn('relative z-10 text-xs font-medium', isActive ? 'text-blue' : 'text-current')}>
                {item.label}
              </span>

              {/* Enhanced active dot */}
              {isActive && null}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}