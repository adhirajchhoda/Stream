'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorScreenProps {
  error?: Error;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ErrorScreen({ error, onRetry, onGoHome }: ErrorScreenProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md w-full"
      >
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">
            We encountered an unexpected error. This might be temporary.
          </p>

          {error && (
            <details className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <summary className="cursor-pointer font-medium text-red-800 mb-2">
                Error Details
              </summary>
              <pre className="text-sm text-red-700 whitespace-pre-wrap overflow-auto">
                {error.message}
                {error.stack && '\n\n' + error.stack}
              </pre>
            </details>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="space-y-3"
        >
          <Button
            onClick={onRetry || handleReload}
            size="lg"
            fullWidth
            className="bg-red-600 hover:bg-red-700 text-white"
            leftIcon={<RefreshCw className="w-5 h-5" />}
          >
            Try Again
          </Button>

          <Button
            onClick={handleGoHome}
            variant="outline"
            size="lg"
            fullWidth
            leftIcon={<Home className="w-5 h-5" />}
          >
            Go Home
          </Button>
        </motion.div>

        {/* Support Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-8 text-sm text-gray-500"
        >
          <p>
            If this problem persists, please contact our support team.
          </p>
        </motion.div>

        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -30, 0],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: i * 0.8,
              }}
              className="absolute w-6 h-6 bg-red-200 rounded-full"
              style={{
                left: `${10 + i * 20}%`,
                top: `${20 + i * 15}%`,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}