'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Settings } from 'lucide-react';
import { useAppState } from '@/providers/AppStateProvider';
import { useWallet } from '@/providers/WalletProvider';
import { Button } from '@/components/ui/Button';

export function TopBar() {
  const { state } = useAppState();
  const { state: walletState } = useWallet();

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-blue" />
          <div>
            <h1 className="text-lg font-bold text-charcoal">Stream</h1>
            <p className="text-xs text-charcoal/60 capitalize font-medium">{state.userRole}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <motion.div className="relative">
            <Button variant="ghost" size="sm">
              <Bell className="w-5 h-5" />
            </Button>
            {/* Notification badge with animation */}
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-xs text-white font-bold">3</span>
            </motion.div>
          </motion.div>

          {/* Wallet Status */}
          {walletState.connectionStatus === 'connected' && (
            <div className="hidden sm:flex items-center space-x-2 px-4 py-2 border border-border rounded-xl">
              <div className="w-2 h-2 bg-blue rounded-full" />
              <span className="text-sm font-medium text-charcoal">
                {formatAddress(walletState.connectedWallet?.address || '')}
              </span>
            </div>
          )}

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.header>
  );
}