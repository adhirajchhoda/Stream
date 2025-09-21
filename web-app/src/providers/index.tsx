'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './WalletProvider';
import { AppStateProvider } from './AppStateProvider';
import { ZKProofProvider } from './ZKProofProvider';
import { PayrollProvider } from './PayrollProvider';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry for authentication errors
        if (error?.status === 401) return false;
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <WalletProvider>
          <ZKProofProvider>
            <PayrollProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#FFFFFF',
                    color: '#1A1A1A',
                    borderRadius: '12px',
                    border: '1px solid #E0E4E7',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                    fontSize: '14px',
                    fontWeight: '500',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#FFFFFF',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#FFFFFF',
                    },
                  },
                }}
              />
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </PayrollProvider>
          </ZKProofProvider>
        </WalletProvider>
      </AppStateProvider>
    </QueryClientProvider>
  );
}