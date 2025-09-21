'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Clock, DollarSign, Calendar, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppState } from '@/providers/AppStateProvider';
import { EmployeeManagementView } from '@/components/employer/EmployeeManagementView';
import { usePayroll, useCurrentSession, useRealTimeEarnings } from '@/providers/PayrollProvider';

export function WorkSessionView() {
  const { state } = useAppState();
  const { startWorkSession, endWorkSession, state: payrollState, clearError } = usePayroll();
  const currentSessionData = useCurrentSession();
  const realTimeEarnings = useRealTimeEarnings();

  // Show employee management for employers
  if (state.userRole === 'employer') {
    return <EmployeeManagementView />;
  }

  // Mock hourly rate - would come from API/attestation
  const hourlyRate = 18.50;

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    try {
      await startWorkSession(hourlyRate, 'Office');
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleStopSession = async () => {
    try {
      await endWorkSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const currentEarnings = realTimeEarnings?.estimatedGrossPay || 0;

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-title-1 font-bold text-gradient mb-2">Work Session</h1>
          <p className="text-body text-gray-700">Track your work time and see real-time earnings with zero-knowledge privacy</p>
        </motion.div>

        {/* Main Timer Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="card-premium text-center relative overflow-hidden" padding="xl">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-mesh-blue animate-gradient-x opacity-30" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-stream-blue-200/20 rounded-full -mr-32 -mt-32 animate-float" />
            <div className="relative z-10">
            {/* Timer Display */}
            <motion.div
              key={currentSessionData.elapsedTime}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="mb-8"
            >
              <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
                {formatTime(currentSessionData.elapsedTime)}
              </div>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {currentSessionData.isActive ? 'Active' : 'Stopped'}
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  ${hourlyRate}/hour
                </div>
              </div>
            </motion.div>

            {/* Real-time Earnings */}
            <motion.div
              key={currentEarnings}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
            >
              <div className="text-3xl font-bold text-green-700 mb-2">
                ${currentEarnings.toFixed(2)}
              </div>
              <p className="text-green-600">Current session earnings</p>
            </motion.div>

            {/* Control Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <AnimatePresence mode="wait">
                {!currentSessionData.isActive ? (
                  <motion.div
                    key="start"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Button
                      onClick={handleStartSession}
                      loading={payrollState.isLoading}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-8"
                      leftIcon={<Play className="w-5 h-5" />}
                    >
                      Start Session
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="controls"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex space-x-4"
                  >
                    <Button
                      onClick={handleStopSession}
                      loading={payrollState.isLoading}
                      variant="outline"
                      size="lg"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      leftIcon={<Square className="w-5 h-5" />}
                    >
                      End Session
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Display */}
            {payrollState.error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 glass-subtle border border-red-200/50 rounded-xl"
              >
                <p className="text-red-700 text-callout font-medium">{payrollState.error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="mt-2 text-red-600 hover:glass transition-all duration-200"
                >
                  Dismiss
                </Button>
              </motion.div>
            )}
            </div>
          </Card>
        </motion.div>

        {/* Session Info */}
        {currentSessionData.session && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Card padding="lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Started</p>
                  <p className="font-semibold text-gray-900">
                    {currentSessionData.session.startTime.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rate</p>
                  <p className="font-semibold text-gray-900">${currentSessionData.session.hourlyRate}/hour</p>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-semibold text-gray-900">{currentSessionData.session.location || 'Office'}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Real-Time Earnings Summary */}
        {realTimeEarnings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Card padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">
                    ${realTimeEarnings.availableForWithdrawal.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-600">Available Now</p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">
                    {realTimeEarnings.accumulatedHours.toFixed(2)}h
                  </p>
                  <p className="text-sm text-blue-600">Total Hours</p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">
                    ${realTimeEarnings.estimatedGrossPay.toFixed(2)}
                  </p>
                  <p className="text-sm text-purple-600">Gross Pay</p>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-700">
                    ${realTimeEarnings.estimatedNetPay.toFixed(2)}
                  </p>
                  <p className="text-sm text-orange-600">Net Pay</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Recent Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>

            <div className="space-y-4">
              {payrollState.sessions.filter(session => !session.isActive).slice(0, 5).map((session) => {
                const durationHours = Math.floor(session.hoursWorked);
                const durationMinutes = Math.floor((session.hoursWorked % 1) * 60);
                const earnings = session.hoursWorked * session.hourlyRate;

                return (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Clock className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {session.startTime.toLocaleDateString() === new Date().toLocaleDateString()
                            ? 'Today'
                            : session.startTime.toLocaleDateString()
                          }
                        </p>
                        <p className="text-sm text-gray-600">
                          {durationHours}h {durationMinutes}m
                        </p>
                        {session.location && (
                          <p className="text-xs text-gray-500">{session.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${earnings.toFixed(2)}</p>
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        completed
                      </span>
                    </div>
                  </div>
                );
              })}

              {payrollState.sessions.filter(session => !session.isActive).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No completed sessions yet</p>
                  <p className="text-sm">Start your first work session to see it here</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}