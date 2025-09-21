'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  WalletConnection,
  EthereumWallet,
  ConnectionStatus,
  BlockchainNetwork
} from '@/types/models';

interface WalletState {
  connectedWallet: WalletConnection | null;
  connectionStatus: ConnectionStatus;
  supportedChains: BlockchainNetwork[];
  balance: string;
  isConnecting: boolean;
  error: string | null;
}

interface WalletContextType {
  state: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getBalance: () => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  sendTransaction: (to: string, value: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

type WalletAction =
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: WalletConnection }
  | { type: 'SET_DISCONNECTED' }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_BALANCE'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUPPORTED_CHAINS'; payload: BlockchainNetwork[] };

const supportedNetworks: BlockchainNetwork[] = [
  {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    symbol: 'ETH',
  },
  {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    symbol: 'MATIC',
  },
  {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    symbol: 'SEP',
  },
  {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://localhost:8545',
    symbol: 'ETH',
  },
];

const initialState: WalletState = {
  connectedWallet: null,
  connectionStatus: 'disconnected',
  supportedChains: supportedNetworks,
  balance: '0',
  isConnecting: false,
  error: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'SET_CONNECTING':
      return {
        ...state,
        isConnecting: action.payload,
        error: action.payload ? null : state.error,
      };

    case 'SET_CONNECTED':
      return {
        ...state,
        connectedWallet: action.payload,
        connectionStatus: 'connected',
        isConnecting: false,
        error: null,
      };

    case 'SET_DISCONNECTED':
      return {
        ...state,
        connectedWallet: null,
        connectionStatus: 'disconnected',
        isConnecting: false,
        balance: '0',
        error: null,
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
      };

    case 'SET_BALANCE':
      return {
        ...state,
        balance: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isConnecting: false,
        connectionStatus: action.payload ? 'error' : state.connectionStatus,
      };

    case 'SET_SUPPORTED_CHAINS':
      return {
        ...state,
        supportedChains: action.payload,
      };

    default:
      return state;
  }
}

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Listen for account and network changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const ethereum = window.ethereum;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          dispatch({ type: 'SET_DISCONNECTED' });
        } else if (state.connectedWallet && accounts[0] !== state.connectedWallet.address) {
          // Account changed, update the connected wallet
          connectWallet();
        }
      };

      const handleChainChanged = (chainId: string) => {
        // Reload the page to handle network changes properly
        window.location.reload();
      };

      const handleDisconnect = () => {
        dispatch({ type: 'SET_DISCONNECTED' });
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);
      ethereum.on('disconnect', handleDisconnect);

      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
        ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [state.connectedWallet]);

  const checkConnection = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const wallet: EthereumWallet = {
            address: accounts[0],
            chainId: parseInt(chainId, 16),
            isConnected: true,
          };
          dispatch({ type: 'SET_CONNECTED', payload: wallet });
          await updateBalance(accounts[0]);
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'MetaMask is not installed. Please install MetaMask to continue.'
      });
      return;
    }

    dispatch({ type: 'SET_CONNECTING', payload: true });

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Get current chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      const wallet: EthereumWallet = {
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        isConnected: true,
      };

      dispatch({ type: 'SET_CONNECTED', payload: wallet });
      await updateBalance(accounts[0]);

    } catch (error: any) {
      let errorMessage = 'Failed to connect wallet';

      if (error.code === 4001) {
        errorMessage = 'Connection rejected by user';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request pending. Please check MetaMask.';
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Wallet connection error:', error);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    dispatch({ type: 'SET_DISCONNECTED' });
    // Clear any persisted wallet data
    localStorage.removeItem('stream-wallet-connection');
  }, []);

  const switchNetwork = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        const network = supportedNetworks.find(n => n.chainId === chainId);
        if (network) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: {
                  name: network.symbol,
                  symbol: network.symbol,
                  decimals: 18,
                },
              },
            ],
          });
        }
      } else {
        throw error;
      }
    }
  }, []);

  const updateBalance = async (address: string) => {
    try {
      if (window.ethereum) {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        const balanceInEth = ethers.formatEther(balance);
        dispatch({ type: 'SET_BALANCE', payload: balanceInEth });
      }
    } catch (error) {
      console.error('Error getting balance:', error);
    }
  };

  const getBalance = useCallback(async (): Promise<string> => {
    if (!state.connectedWallet) {
      throw new Error('Wallet not connected');
    }

    await updateBalance(state.connectedWallet.address);
    return state.balance;
  }, [state.connectedWallet, state.balance]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!window.ethereum || !state.connectedWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, state.connectedWallet.address],
      });
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }, [state.connectedWallet]);

  const sendTransaction = useCallback(async (to: string, value: string): Promise<string> => {
    if (!window.ethereum || !state.connectedWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: state.connectedWallet.address,
            to,
            value: ethers.parseEther(value).toString(16),
          },
        ],
      });
      return txHash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }, [state.connectedWallet]);

  const contextValue: WalletContextType = {
    state,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    getBalance,
    signMessage,
    sendTransaction,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}