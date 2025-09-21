'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stream-blue to-stream-green flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center text-white"
      >
        {/* App Logo */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-stream-blue to-stream-green rounded-xl" />
            </div>
          </div>
          <h1 className="text-4xl font-bold font-system-rounded mb-2">Stream</h1>
          <p className="text-lg text-white/80">Real-time Earned Wage Access</p>
        </motion.div>

        {/* Loading Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-white/60">Loading your workspace...</p>
        </motion.div>

        {/* Progress Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="flex justify-center space-x-2 mt-8"
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
              }}
              className="w-2 h-2 bg-white/40 rounded-full"
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}