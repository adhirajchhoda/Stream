'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Wallet,
  Shield,
  Bell,
  Settings,
  LogOut,
  Edit3,
  Camera,
  ChevronRight,
  Globe,
  Moon,
  Smartphone
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppState } from '@/providers/AppStateProvider';
import { useWallet } from '@/providers/WalletProvider';

interface ProfileSection {
  title: string;
  items: {
    id: string;
    label: string;
    value?: string;
    icon: React.ElementType;
    action?: () => void;
    showChevron?: boolean;
  }[];
}

export function ProfileView() {
  const { state, logout, setUserRole } = useAppState();
  const { state: walletState, disconnectWallet } = useWallet();
  const [isEditing, setIsEditing] = useState(false);

  // Mock user data - would come from API in real app
  const userData = {
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    role: state.userRole,
    joinDate: '2024-01-01',
    avatar: null,
    employeeId: 'EMP-001',
    department: 'Engineering',
    hourlyRate: 18.50
  };

  const handleLogout = async () => {
    await disconnectWallet();
    logout();
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Not connected';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const profileSections: ProfileSection[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Edit Profile',
          icon: Edit3,
          action: () => setIsEditing(true),
          showChevron: true
        },
        {
          id: 'wallet',
          label: 'Wallet',
          value: formatAddress(walletState.connectedWallet?.address || ''),
          icon: Wallet,
          showChevron: true
        },
        {
          id: 'role',
          label: 'Role',
          value: state.userRole?.charAt(0).toUpperCase() + state.userRole?.slice(1),
          icon: User,
          showChevron: true
        }
      ]
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          id: 'privacy',
          label: 'Privacy Settings',
          icon: Shield,
          showChevron: true
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          showChevron: true
        },
        {
          id: 'security',
          label: 'Security',
          icon: Settings,
          showChevron: true
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'language',
          label: 'Language',
          value: 'English',
          icon: Globe,
          showChevron: true
        },
        {
          id: 'theme',
          label: 'Dark Mode',
          icon: Moon,
          showChevron: true
        },
        {
          id: 'mobile',
          label: 'Mobile App',
          icon: Smartphone,
          showChevron: true
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </motion.div>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="relative overflow-hidden" padding="xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-stream-blue to-stream-green opacity-10 rounded-full -mr-16 -mt-16" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-stream-blue to-stream-green rounded-full flex items-center justify-center">
                  {userData.avatar ? (
                    <img
                      src={userData.avatar}
                      alt={userData.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {userData.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-100">
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{userData.name}</h2>
                <p className="text-gray-600 mb-2">{userData.email}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {userData.role?.charAt(0).toUpperCase() + userData.role?.slice(1)}
                  </span>
                  {userData.department && (
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      {userData.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <Button
                variant="outline"
                leftIcon={<Edit3 className="w-4 h-4" />}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        {state.userRole === 'employee' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <Card padding="lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ${userData.hourlyRate}/hr
                </div>
                <p className="text-gray-600">Current Rate</p>
              </div>
            </Card>

            <Card padding="lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {userData.employeeId}
                </div>
                <p className="text-gray-600">Employee ID</p>
              </div>
            </Card>

            <Card padding="lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {new Date(userData.joinDate).getFullYear()}
                </div>
                <p className="text-gray-600">Member Since</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          {profileSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + sectionIndex * 0.1 }}
            >
              <Card padding="lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {section.title}
                </h3>

                <div className="space-y-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={item.action}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Icon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{item.label}</p>
                            {item.value && (
                              <p className="text-sm text-gray-600">{item.value}</p>
                            )}
                          </div>
                        </div>
                        {item.showChevron && (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Logout Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Card padding="lg">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-600"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Sign Out</p>
                  <p className="text-sm text-red-500">Disconnect wallet and sign out</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </motion.button>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}