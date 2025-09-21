'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Shield, Zap, Lock } from 'lucide-react';

export function LoadingScreen() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by rendering simple version on server
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 rounded-md bg-blue" />
          <h1 className="text-2xl font-bold text-charcoal mb-2">Stream</h1>
          <div className="flex flex-col items-center">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue" />
            <p className="text-charcoal/70">Loading your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center">
        {/* Enhanced App Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="w-10 h-10 mx-auto mb-4 rounded-md bg-blue" />
          <h1 className="text-3xl font-bold font-system-rounded mb-2 text-charcoal">Stream</h1>
          <p className="text-charcoal/70">Real-time Earned Wage Access</p>
        </motion.div>

        {/* Enhanced Loading Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative mb-6">
            <Loader2 className="w-10 h-10 animate-spin text-blue" />
          </div>
          <p className="text-charcoal/70 text-callout font-medium">Loading your workspace...</p>
        </motion.div>

        {/* Minimal spacer */}
        <div className="h-2" />

        {/* Progress Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="flex justify-center space-x-3 mb-6"
        >
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
                ease: 'easeInOut',
              }}
              className="w-2.5 h-2.5 bg-blue/80 rounded-full"
            />
          ))}
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.4 }}
        >
          <div className="w-64 h-1 bg-charcoal/10 rounded-full overflow-hidden mx-auto">
            <motion.div
              className="h-full bg-blue rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}