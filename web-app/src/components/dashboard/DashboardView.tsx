'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, Shield, ArrowUpRight, Wallet } from 'lucide-react';
import { useAppState } from '@/providers/AppStateProvider';
import { useWallet } from '@/providers/WalletProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmployerDashboardView } from '@/components/employer/EmployerDashboardView';

export function DashboardView() {
  const { state } = useAppState();
  const { state: walletState } = useWallet();

  // Show employer dashboard if user is an employer
  if (state.userRole === 'employer') {
    return <EmployerDashboardView />;
  }

  // Mock data - would come from API in real app
  const dashboardData = {
    availableEarnings: 1250.75,
    totalEarnings: 4892.50,
    hoursWorked: 168.5,
    zkProofsGenerated: 12,
    recentWithdrawals: [
      { id: 1, amount: 150.00, date: '2024-01-15', status: 'completed' },
      { id: 2, amount: 300.00, date: '2024-01-10', status: 'completed' },
      { id: 3, amount: 75.50, date: '2024-01-08', status: 'pending' },
    ]
  };

  const quickStats = [
    {
      title: 'Available Now',
      value: `$${dashboardData.availableEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      description: 'Ready to withdraw'
    },
    {
      title: 'Total Earned',
      value: `$${dashboardData.totalEarnings.toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      description: 'This month'
    },
    {
      title: 'Hours Worked',
      value: dashboardData.hoursWorked.toString(),
      icon: Clock,
      color: 'from-orange-500 to-red-500',
      description: 'This period'
    },
    {
      title: 'ZK Proofs',
      value: dashboardData.zkProofsGenerated.toString(),
      icon: Shield,
      color: 'from-purple-500 to-pink-500',
      description: 'Privacy secured'
    }
  ];

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-6xl mx-auto relative">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-title1 font-bold text-gradient mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-body text-gray-700">
            {state.userRole === 'employee'
              ? "Here's your real-time earnings overview with privacy-preserving technology"
              : "Here's your payroll management overview with zero-knowledge proofs"
            }
          </p>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                whileHover={{ scale: 1.02, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className="group"
              >
                <Card variant="modern" className="relative overflow-hidden hover-lift group-hover:shadow-glow-blue transition-all duration-300" padding="lg">
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <motion.div
                        className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                        whileHover={{ rotate: 5 }}
                      >
                        <Icon className="w-6 h-6 text-white drop-shadow-sm" />
                      </motion.div>
                      <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-stream-blue-500 transition-colors duration-300" />
                      </motion.div>
                    </div>

                    <h3 className="text-currency font-bold text-gray-900 mb-2 group-hover:text-gradient transition-all duration-300">
                      {stat.value}
                    </h3>
                    <p className="text-callout font-semibold text-gray-700 mb-1">{stat.title}</p>
                    <p className="text-caption text-gray-500">{stat.description}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Main Actions */}
        {state.userRole === 'employee' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card variant="premium" className="bg-gradient-to-br from-stream-blue-500 via-stream-purple-500 to-stream-green-500 text-white relative overflow-hidden" padding="xl">
              {/* Animated background elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 animate-float" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16 animate-float" style={{ animationDelay: '1s' }} />

              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="mb-6 sm:mb-0">
                    <motion.h3
                      className="text-title2 font-bold mb-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      Ready to Withdraw?
                    </motion.h3>
                    <motion.p
                      className="text-white/90 mb-4 text-body"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      You have <span className="font-bold text-currency">${dashboardData.availableEarnings.toFixed(2)}</span> available for instant withdrawal
                    </motion.p>
                    <motion.div
                      className="flex items-center text-callout text-white/80 bg-white/10 rounded-lg px-3 py-2 w-fit"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Shield className="w-5 h-5 mr-2" />
                      Protected by zero-knowledge proofs
                    </motion.div>
                  </div>

                  <motion.div
                    className="flex flex-col space-y-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button
                      variant="secondary"
                      className="bg-white text-stream-blue-600 hover:bg-white/90 shadow-xl hover:shadow-2xl font-semibold"
                      leftIcon={<Wallet className="w-5 h-5" />}
                    >
                      Withdraw Now
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-white border-white/30 hover:bg-white/10 hover:border-white/50 transition-all duration-200"
                    >
                      View Details
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Recent Withdrawals */}
          <Card variant="modern" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-title3 font-semibold text-gray-900">Recent Activity</h3>
              <Button variant="ghost" size="sm" className="bg-white/5 backdrop-blur-glass hover:bg-white/10 transition-all duration-200">
                View All
              </Button>
            </div>

            <div className="space-y-3">
              {dashboardData.recentWithdrawals.map((withdrawal, index) => (
                <motion.div
                  key={withdrawal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-glass rounded-xl hover:bg-white/10 transition-all duration-200 hover-lift"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                      withdrawal.status === 'completed' ? 'bg-gradient-to-r from-stream-green-500 to-stream-green-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'
                    }`}>
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-callout">
                        ${withdrawal.amount.toFixed(2)}
                      </p>
                      <p className="text-caption text-gray-500">{withdrawal.date}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-caption font-semibold ${
                    withdrawal.status === 'completed'
                      ? 'bg-stream-green-100 text-stream-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {withdrawal.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Privacy & Security Status */}
          <Card variant="modern" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-title3 font-semibold text-gray-900">Privacy Status</h3>
              <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-glass px-3 py-2 rounded-xl">
                <div className="w-3 h-3 bg-stream-green-500 rounded-full animate-pulse shadow-glow-green" />
                <span className="text-callout text-stream-green-600 font-semibold">Active</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ZK Proofs Generated</p>
                    <p className="text-sm text-gray-500">All transactions verified</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {dashboardData.zkProofsGenerated}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Wallet Connected</p>
                    <p className="text-sm text-gray-500">
                      {walletState.connectedWallet?.address ?
                        `${walletState.connectedWallet.address.slice(0, 6)}...${walletState.connectedWallet.address.slice(-4)}` :
                        'Not connected'
                      }
                    </p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${walletState.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}