'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Shield, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useWallet } from '@/providers/WalletProvider';
import { useAppState } from '@/providers/AppStateProvider';
import toast from 'react-hot-toast';

export function AuthenticationScreen() {
  const { state: walletState, connectWallet } = useWallet();
  const { authenticate, setUserRole } = useAppState();
  const [selectedRole, setSelectedRole] = useState<'employee' | 'employer'>('employee');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
      setUserRole(selectedRole);
      authenticate();
      toast.success('Successfully connected!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const roles = [
    {
      id: 'employee',
      title: 'Employee',
      description: 'Access your earned wages instantly',
      icon: <Wallet className="w-6 h-6" />,
      features: ['Real-time earnings', 'Instant withdrawals', 'ZK-proof privacy'],
    },
    {
      id: 'employer',
      title: 'Employer',
      description: 'Manage payroll and attestations',
      icon: <Shield className="w-6 h-6" />,
      features: ['Employee management', 'Payroll automation', 'Compliance tools'],
    },
  ] as const;

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-blue" />
            <h1 className="text-3xl font-bold text-charcoal mb-2">Welcome to Stream</h1>
            <p className="text-charcoal/70">Connect your wallet to get started</p>
          </div>

          {/* Role Selection */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mb-6"
          >
            <p className="text-charcoal/70 text-sm font-medium mb-4 text-center">
              Select your role
            </p>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => (
                <motion.button
                  key={role.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole(role.id)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-200
                    ${selectedRole === role.id
                      ? 'border-blue bg-white'
                      : 'border-border bg-white'
                    }
                  `}
                >
                  <div className="text-blue mb-2">{role.icon}</div>
                  <h3 className="text-charcoal font-semibold text-sm mb-1">{role.title}</h3>
                  <p className="text-charcoal/70 text-xs">{role.description}</p>

                  {selectedRole === role.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <div className="w-5 h-5 bg-blue rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Selected Role Features */}
          {selectedRole && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <Card className="bg-white border border-border" padding="md">
                <div className="text-charcoal">
                  <h4 className="font-semibold mb-3">
                    {roles.find(r => r.id === selectedRole)?.title} Features
                  </h4>
                  <ul className="space-y-2">
                    {roles.find(r => r.id === selectedRole)?.features.map((feature, index) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center text-sm text-charcoal/80"
                      >
                        <Check className="w-4 h-4 mr-2 text-blue" />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Connect Wallet Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Button
              onClick={handleConnect}
              loading={isConnecting || walletState.isConnecting}
              disabled={!selectedRole}
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {isConnecting || walletState.isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>

            {walletState.error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-red-600 text-sm">{walletState.error}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-charcoal/60 text-xs">
              Your wallet connection is secured with industry-standard encryption.
              Stream never stores your private keys.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}