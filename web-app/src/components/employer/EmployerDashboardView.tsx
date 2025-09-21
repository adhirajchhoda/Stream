'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  Clock,
  Shield,
  TrendingUp,
  TrendingDown,
  UserCheck,
  AlertTriangle,
  Calendar,
  FileText,
  Settings,
  Plus
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppState } from '@/providers/AppStateProvider';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  hourlyRate: number;
  hoursWorked: number;
  earnings: number;
  status: 'active' | 'inactive' | 'pending';
  lastActive: Date;
}

interface PayrollSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalHours: number;
  totalPayroll: number;
  pendingApprovals: number;
  zkProofsGenerated: number;
}

export function EmployerDashboardView() {
  const { state } = useAppState();

  // Mock data - would come from API in real app
  const [payrollSummary] = useState<PayrollSummary>({
    totalEmployees: 24,
    activeEmployees: 18,
    totalHours: 672,
    totalPayroll: 12430.50,
    pendingApprovals: 3,
    zkProofsGenerated: 45
  });

  const [employees] = useState<Employee[]>([
    {
      id: '1',
      name: 'Alex Johnson',
      email: 'alex@example.com',
      department: 'Engineering',
      hourlyRate: 45.00,
      hoursWorked: 40,
      earnings: 1800.00,
      status: 'active',
      lastActive: new Date('2024-01-15T14:30:00')
    },
    {
      id: '2',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      department: 'Design',
      hourlyRate: 42.00,
      hoursWorked: 38,
      earnings: 1596.00,
      status: 'active',
      lastActive: new Date('2024-01-15T16:45:00')
    },
    {
      id: '3',
      name: 'Michael Davis',
      email: 'michael@example.com',
      department: 'Marketing',
      hourlyRate: 38.00,
      hoursWorked: 35,
      earnings: 1330.00,
      status: 'pending',
      lastActive: new Date('2024-01-14T12:15:00')
    }
  ]);

  const quickStats = [
    {
      title: 'Total Employees',
      value: payrollSummary.totalEmployees.toString(),
      change: '+2 this month',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      trend: 'up'
    },
    {
      title: 'Active Sessions',
      value: payrollSummary.activeEmployees.toString(),
      change: 'Currently working',
      icon: Clock,
      color: 'from-green-500 to-emerald-500',
      trend: 'neutral'
    },
    {
      title: 'This Period',
      value: `$${payrollSummary.totalPayroll.toLocaleString()}`,
      change: '+12.5% from last period',
      icon: DollarSign,
      color: 'from-orange-500 to-red-500',
      trend: 'up'
    },
    {
      title: 'ZK Proofs',
      value: payrollSummary.zkProofsGenerated.toString(),
      change: 'Privacy protected',
      icon: Shield,
      color: 'from-purple-500 to-pink-500',
      trend: 'neutral'
    }
  ];

  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Employer Dashboard 👔
              </h1>
              <p className="text-gray-600">
                Manage payroll, employees, and compliance
              </p>
            </div>
            <div className="flex space-x-3 mt-4 sm:mt-0">
              <Button
                variant="outline"
                leftIcon={<Calendar className="w-4 h-4" />}
              >
                Payroll Calendar
              </Button>
              <Button
                className="bg-stream-blue hover:bg-stream-blue/90"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Employee
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : null;

            return (
              <motion.div
                key={stat.title}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <Card className="relative overflow-hidden" padding="lg">
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-10 -mt-10`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      {TrendIcon && (
                        <TrendIcon className={`w-4 h-4 ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-xs text-gray-500">{stat.change}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Alerts and Pending Actions */}
        {payrollSummary.pendingApprovals > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="bg-orange-50 border-orange-200" padding="lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">
                    Pending Approvals Required
                  </h3>
                  <p className="text-orange-700 mb-4">
                    You have {payrollSummary.pendingApprovals} employees with payroll items requiring approval.
                  </p>
                  <div className="flex space-x-3">
                    <Button variant="outline" className="border-orange-300 text-orange-700">
                      Review All
                    </Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                      Approve Pending
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Employee Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card padding="lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Employee Overview</h3>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>

              <div className="space-y-4">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-stream-blue to-stream-green rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{employee.name}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-gray-600">{employee.department}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                            {employee.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${employee.earnings.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{employee.hoursWorked}h this period</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Payroll Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card padding="lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Payroll Summary</h3>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Total Hours */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Total Hours</p>
                      <p className="text-sm text-gray-600">This pay period</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{payrollSummary.totalHours}</p>
                    <p className="text-sm text-blue-500">hours</p>
                  </div>
                </div>

                {/* Total Payroll */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Total Payroll</p>
                      <p className="text-sm text-gray-600">Ready for processing</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${payrollSummary.totalPayroll.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-500">USD</p>
                  </div>
                </div>

                {/* Compliance Status */}
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Privacy Compliance</p>
                      <p className="text-sm text-gray-600">ZK-proof protected</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">100%</p>
                    <p className="text-sm text-purple-500">compliant</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      leftIcon={<FileText className="w-4 h-4" />}
                    >
                      Generate Report
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-stream-green hover:bg-stream-green/90"
                      leftIcon={<UserCheck className="w-4 h-4" />}
                    >
                      Process Payroll
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}