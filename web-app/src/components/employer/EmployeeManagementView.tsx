'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Shield,
  FileText,
  Download,
  Upload
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hourlyRate: number;
  startDate: Date;
  status: 'active' | 'inactive' | 'pending' | 'onboarding';
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  attestations: {
    salaryVerified: boolean;
    identityVerified: boolean;
    backgroundCheck: boolean;
  };
  totalHours: number;
  totalEarnings: number;
}

export function EmployeeManagementView() {
  const [employees] = useState<Employee[]>([
    {
      id: '1',
      name: 'Alex Johnson',
      email: 'alex.johnson@example.com',
      phone: '+1 (555) 123-4567',
      department: 'Engineering',
      position: 'Senior Developer',
      hourlyRate: 45.00,
      startDate: new Date('2023-06-15'),
      status: 'active',
      address: '123 Tech St, San Francisco, CA',
      emergencyContact: {
        name: 'Sarah Johnson',
        phone: '+1 (555) 987-6543'
      },
      attestations: {
        salaryVerified: true,
        identityVerified: true,
        backgroundCheck: true
      },
      totalHours: 1680,
      totalEarnings: 75600
    },
    {
      id: '2',
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      phone: '+1 (555) 234-5678',
      department: 'Design',
      position: 'UX Designer',
      hourlyRate: 42.00,
      startDate: new Date('2023-08-01'),
      status: 'active',
      address: '456 Design Ave, San Francisco, CA',
      attestations: {
        salaryVerified: true,
        identityVerified: true,
        backgroundCheck: true
      },
      totalHours: 1440,
      totalEarnings: 60480
    },
    {
      id: '3',
      name: 'Michael Davis',
      email: 'michael.davis@example.com',
      phone: '+1 (555) 345-6789',
      department: 'Marketing',
      position: 'Marketing Specialist',
      hourlyRate: 38.00,
      startDate: new Date('2024-01-10'),
      status: 'onboarding',
      address: '789 Marketing Blvd, San Francisco, CA',
      attestations: {
        salaryVerified: false,
        identityVerified: true,
        backgroundCheck: false
      },
      totalHours: 120,
      totalEarnings: 4560
    }
  ]);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'onboarding':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAttestationStatus = (attestations: Employee['attestations']) => {
    const completed = Object.values(attestations).filter(Boolean).length;
    const total = Object.keys(attestations).length;
    return { completed, total };
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Employee Management</h1>
              <p className="text-gray-600">Manage your team, attestations, and onboarding</p>
            </div>
            <div className="flex space-x-3 mt-4 sm:mt-0">
              <Button
                variant="outline"
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Import CSV
              </Button>
              <Button
                onClick={() => setShowAddEmployee(true)}
                className="bg-stream-blue hover:bg-stream-blue/90"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Employee
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stream-blue focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-stream-blue"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Employee List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Employee</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Department</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rate</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Attestations</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => {
                    const { completed, total } = getAttestationStatus(employee.attestations);

                    return (
                      <motion.tr
                        key={employee.id}
                        whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                        className="cursor-pointer"
                        onClick={() => setSelectedEmployee(employee)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-stream-blue to-stream-green rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{employee.name}</p>
                              <p className="text-sm text-gray-600">{employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{employee.department}</p>
                            <p className="text-sm text-gray-600">{employee.position}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">${employee.hourlyRate}/hr</p>
                          <p className="text-sm text-gray-600">{employee.totalHours}h total</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                              <div
                                className="h-full bg-stream-blue rounded-full transition-all duration-300"
                                style={{ width: `${(completed / total) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{completed}/{total}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Employee Details Modal */}
        <AnimatePresence>
          {selectedEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedEmployee(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-stream-blue to-stream-green rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                        <p className="text-gray-600">{selectedEmployee.position} • {selectedEmployee.department}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedEmployee(null)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Basic Information */}
                    <div className="lg:col-span-2">
                      <Card padding="lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-medium text-gray-900">{selectedEmployee.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Phone</p>
                              <p className="font-medium text-gray-900">{selectedEmployee.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Address</p>
                              <p className="font-medium text-gray-900">{selectedEmployee.address}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Start Date</p>
                              <p className="font-medium text-gray-900">
                                {selectedEmployee.startDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <DollarSign className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Hourly Rate</p>
                              <p className="font-medium text-gray-900">${selectedEmployee.hourlyRate}/hour</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <UserCheck className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-600">Status</p>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEmployee.status)}`}>
                                {selectedEmployee.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Attestations */}
                    <div>
                      <Card padding="lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attestations</h3>

                        <div className="space-y-4">
                          <div className={`p-3 rounded-lg border-2 ${selectedEmployee.attestations.identityVerified ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <UserCheck className={`w-4 h-4 ${selectedEmployee.attestations.identityVerified ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="font-medium text-gray-900">Identity</span>
                              </div>
                              {selectedEmployee.attestations.identityVerified ? (
                                <span className="text-green-600 text-sm">Verified</span>
                              ) : (
                                <Button size="sm" variant="outline">Verify</Button>
                              )}
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg border-2 ${selectedEmployee.attestations.salaryVerified ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <DollarSign className={`w-4 h-4 ${selectedEmployee.attestations.salaryVerified ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="font-medium text-gray-900">Salary</span>
                              </div>
                              {selectedEmployee.attestations.salaryVerified ? (
                                <span className="text-green-600 text-sm">Verified</span>
                              ) : (
                                <Button size="sm" variant="outline">Verify</Button>
                              )}
                            </div>
                          </div>

                          <div className={`p-3 rounded-lg border-2 ${selectedEmployee.attestations.backgroundCheck ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Shield className={`w-4 h-4 ${selectedEmployee.attestations.backgroundCheck ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="font-medium text-gray-900">Background</span>
                              </div>
                              {selectedEmployee.attestations.backgroundCheck ? (
                                <span className="text-green-600 text-sm">Verified</span>
                              ) : (
                                <Button size="sm" variant="outline">Verify</Button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Button
                            size="sm"
                            fullWidth
                            className="bg-stream-blue hover:bg-stream-blue/90"
                            leftIcon={<FileText className="w-4 h-4" />}
                          >
                            Generate Attestation
                          </Button>
                        </div>
                      </Card>
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