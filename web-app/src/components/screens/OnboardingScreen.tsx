'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Shield, Zap, DollarSign, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppState } from '@/providers/AppStateProvider';

const onboardingPages = [
  {
    title: 'Real-time Wage Access',
    description: 'Access your earned wages instantly, without waiting for traditional payroll cycles.',
    icon: <Zap className="w-16 h-16" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'Zero-Knowledge Privacy',
    description: 'Your salary and personal information remain completely private using advanced cryptographic proofs.',
    icon: <Shield className="w-16 h-16" />,
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: 'Instant Withdrawals',
    description: 'Withdraw your available earnings anytime with just a few taps. No more financial stress.',
    icon: <DollarSign className="w-16 h-16" />,
    color: 'from-orange-500 to-red-500',
  },
  {
    title: 'Get Started',
    description: 'Ready to revolutionize how you access your earned wages? Let\'s connect your wallet.',
    icon: <Check className="w-16 h-16" />,
    color: 'from-purple-500 to-pink-500',
  },
];

export function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const { completeOnboarding } = useAppState();

  const nextPage = () => {
    if (currentPage < onboardingPages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        {/* Skip Button */}
        {currentPage < onboardingPages.length - 1 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={skipOnboarding}
            className="absolute top-8 right-8 text-white/70 hover:text-white transition-colors"
          >
            Skip
          </motion.button>
        )}

        {/* Content */}
        <div className="w-full max-w-md text-center">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="mb-12">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
                className="mb-8"
              >
                <div className="w-24 h-24 mx-auto rounded-full border border-border flex items-center justify-center">
                  <div className="text-blue">{onboardingPages[currentPage].icon}</div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className="text-4xl font-bold text-charcoal mb-4 font-system-rounded">
                {onboardingPages[currentPage].title}
              </motion.h1>

              {/* Description */}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.6 }} className="text-lg text-charcoal/80 leading-relaxed px-4">
                {onboardingPages[currentPage].description}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Page Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="flex justify-center space-x-2 mb-8"
          >
            {onboardingPages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`
                  w-3 h-3 rounded-full transition-all duration-300
                  ${index === currentPage
                    ? 'bg-blue scale-125'
                    : 'bg-charcoal/20 hover:bg-charcoal/40'
                  }
                `}
              />
            ))}
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="flex justify-between items-center"
          >
            <Button onClick={prevPage} disabled={currentPage === 0} variant="ghost" className="disabled:opacity-30" leftIcon={<ChevronLeft className="w-5 h-5" />}>
              Previous
            </Button>

            <Button onClick={nextPage} variant="primary" className="px-8" rightIcon={<ChevronRight className="w-5 h-5" />}>
              {currentPage === onboardingPages.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </motion.div>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -20, 0],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                delay: i * 0.5,
              }}
              className="absolute w-4 h-4 bg-white/10 rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + i * 10}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}