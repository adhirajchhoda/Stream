'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, Clock, AlertCircle, Download, Eye, Plus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useZKProof } from '@/providers/ZKProofProvider';

interface ZKProofRecord {
  id: string;
  type: 'salary' | 'work_hours' | 'employment';
  createdAt: Date;
  status: 'generating' | 'completed' | 'failed';
  proofHash: string;
  verificationKey: string;
  metadata: {
    periodStart: Date;
    periodEnd: Date;
    description: string;
  };
}

export function ProofsView() {
  const { state: zkState, generateProof } = useZKProof();
  const [selectedProof, setSelectedProof] = useState<ZKProofRecord | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock proof data - would come from API in real app
  const [proofs] = useState<ZKProofRecord[]>([
    {
      id: '1',
      type: 'salary',
      createdAt: new Date('2024-01-15'),
      status: 'completed',
      proofHash: '0x1a2b3c4d...',
      verificationKey: 'vk_abc123...',
      metadata: {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-15'),
        description: 'Salary verification proof for pay period'
      }
    },
    {
      id: '2',
      type: 'work_hours',
      createdAt: new Date('2024-01-14'),
      status: 'completed',
      proofHash: '0x5e6f7g8h...',
      verificationKey: 'vk_def456...',
      metadata: {
        periodStart: new Date('2024-01-08'),
        periodEnd: new Date('2024-01-14'),
        description: 'Work hours verification for week 2'
      }
    },
    {
      id: '3',
      type: 'employment',
      createdAt: new Date('2024-01-13'),
      status: 'generating',
      proofHash: '',
      verificationKey: '',
      metadata: {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        description: 'Employment status verification'
      }
    }
  ]);

  const getProofTypeInfo = (type: ZKProofRecord['type']) => {
    const types = {
      salary: {
        label: 'Salary Proof',
        description: 'Verifies salary information without revealing exact amounts',
        icon: Shield,
        color: 'from-green-500 to-emerald-500'
      },
      work_hours: {
        label: 'Work Hours Proof',
        description: 'Proves work hours completion without revealing schedule details',
        icon: Clock,
        color: 'from-blue-500 to-cyan-500'
      },
      employment: {
        label: 'Employment Proof',
        description: 'Confirms employment status while maintaining privacy',
        icon: CheckCircle,
        color: 'from-purple-500 to-pink-500'
      }
    };
    return types[type];
  };

  const getStatusInfo = (status: ZKProofRecord['status']) => {
    const statuses = {
      generating: {
        label: 'Generating',
        icon: Loader2,
        color: 'text-orange-600 bg-orange-100',
        animated: true
      },
      completed: {
        label: 'Completed',
        icon: CheckCircle,
        color: 'text-green-600 bg-green-100',
        animated: false
      },
      failed: {
        label: 'Failed',
        icon: AlertCircle,
        color: 'text-red-600 bg-red-100',
        animated: false
      }
    };
    return statuses[status];
  };

  const handleGenerateNewProof = async () => {
    setIsGenerating(true);
    try {
      // Mock proof generation - would use actual ZK circuit
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('New proof generated');
    } catch (error) {
      console.error('Failed to generate proof:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const completedProofs = proofs.filter(p => p.status === 'completed');
  const pendingProofs = proofs.filter(p => p.status === 'generating');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">ZK Proofs</h1>
              <p className="text-gray-600">Manage your zero-knowledge privacy proofs</p>
            </div>
            <Button
              onClick={handleGenerateNewProof}
              loading={isGenerating}
              className="bg-stream-blue hover:bg-stream-blue/90"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Generate New Proof
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card padding="lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedProofs.length}</p>
                <p className="text-gray-600">Completed Proofs</p>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingProofs.length}</p>
                <p className="text-gray-600">Generating</p>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">100%</p>
                <p className="text-gray-600">Privacy Protected</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Active/Pending Proofs */}
        {pendingProofs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Currently Generating</h3>
              <div className="space-y-3">
                {pendingProofs.map((proof) => {
                  const typeInfo = getProofTypeInfo(proof.type);
                  const statusInfo = getStatusInfo(proof.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div key={proof.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 bg-gradient-to-br ${typeInfo.color} rounded-lg flex items-center justify-center`}>
                          <typeInfo.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{typeInfo.label}</p>
                          <p className="text-sm text-gray-600">{proof.metadata.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`w-5 h-5 ${statusInfo.animated ? 'animate-spin' : ''} text-orange-600`} />
                        <span className="text-sm font-medium text-orange-600">{statusInfo.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Completed Proofs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Completed Proofs</h3>
              <Button variant="ghost" size="sm">
                Export All
              </Button>
            </div>

            <div className="space-y-4">
              {completedProofs.map((proof) => {
                const typeInfo = getProofTypeInfo(proof.type);
                const statusInfo = getStatusInfo(proof.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div
                    key={proof.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                    onClick={() => setSelectedProof(proof)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${typeInfo.color} rounded-lg flex items-center justify-center`}>
                          <typeInfo.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-gray-900">{typeInfo.label}</p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{proof.metadata.description}</p>
                          <p className="text-xs text-gray-500">
                            Generated on {proof.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle download
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProof(proof);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Proof Details Modal */}
        <AnimatePresence>
          {selectedProof && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedProof(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Proof Details</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProof(null)}
                    >
                      ×
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Type</label>
                      <p className="text-gray-900">{getProofTypeInfo(selectedProof.type).label}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Proof Hash</label>
                      <p className="text-sm font-mono text-gray-600 bg-gray-50 p-2 rounded break-all">
                        {selectedProof.proofHash}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Verification Key</label>
                      <p className="text-sm font-mono text-gray-600 bg-gray-50 p-2 rounded break-all">
                        {selectedProof.verificationKey}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Period</label>
                      <p className="text-gray-900">
                        {selectedProof.metadata.periodStart.toLocaleDateString()} - {selectedProof.metadata.periodEnd.toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        leftIcon={<Download className="w-4 h-4" />}
                      >
                        Download Proof
                      </Button>
                      <Button
                        className="flex-1 bg-stream-blue hover:bg-stream-blue/90"
                      >
                        Verify Proof
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}