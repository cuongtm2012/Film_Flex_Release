import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Edit, UserCheck, UserX, Download, RefreshCw, Clock, Mail, X } from 'lucide-react';
import { PasswordInput } from "@/components/ui/password-input";

// Enhanced User interface with additional fields
interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'normal';
  status: 'active' | 'suspended' | 'pending';
  displayName?: string;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  loginCount?: number;
  emailVerified?: boolean;
}

// Activity log interface
interface ActivityLog {
  id: number;
  userId: number;
  activityType: string;
  targetId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

// Enhanced filter interface
interface UserFilters {
  searchTerm: string;
  role: string;
  status: string;
  emailVerified: string;
  lastLoginRange: string;
  sortBy: 'username' | 'email' | 'role' | 'status' | 'lastLogin' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

// Bulk operation types
type BulkOperation = 'activate' | 'suspend' | 'delete' | 'export' | 'changeRole';

const UserManagement: React.FC = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showUserModal, setShowUserModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<ActivityLog[]>([]);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Enhanced filters with more options
  const [filters, setFilters] = useState<UserFilters>({
    searchTerm: '',
    role: '',
    status: '',
    emailVerified: '',
    lastLoginRange: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const userData = await response.json();
      setUsers(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      // Fallback to mock data for development
      setUsers([
        {
          id: 1,
          username: 'admin',
          email: 'admin@filmflex.com',
          role: 'admin' as const,
          status: 'active' as const,
          displayName: 'Administrator',
          lastLogin: new Date('2024-01-15T10:30:00'),
          createdAt: new Date('2024-01-01T00:00:00'),
          emailVerified: true,
          loginCount: 45
        },
        {
          id: 2,
          username: 'moderator1',
          email: 'mod@filmflex.com',
          role: 'moderator' as const,
          status: 'active' as const,
          displayName: 'Content Moderator',
          lastLogin: new Date('2024-01-14T15:45:00'),
          createdAt: new Date('2024-01-05T00:00:00'),
          emailVerified: true,
          loginCount: 23
        },
        {
          id: 3,
          username: 'user123',
          email: 'user@example.com',
          role: 'normal' as const,
          status: 'suspended' as const,
          displayName: 'Regular User',
          lastLogin: new Date('2024-01-10T09:20:00'),
          createdAt: new Date('2024-01-10T00:00:00'),
          emailVerified: false,
          loginCount: 12
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced user creation/editing
  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      setLoading(true);
      
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editingUser ? 'update' : 'create'} user`);
      }

      const savedUser = await response.json();
      
      if (editingUser) {
        setUsers(prev => prev.map(user => user.id === savedUser.id ? savedUser : user));
      } else {
        setUsers(prev => [...prev, savedUser]);
      }

      setShowUserModal(false);
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Delete user function
  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(prev => prev.filter(user => user.id !== userId));
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };
  // Bulk operations handler
  const handleBulkOperation = async () => {
    if (!bulkOperation || !selectedUsers || selectedUsers.size === 0) return;

    try {
      setLoading(true);
      const userIds = Array.from(selectedUsers);

      switch (bulkOperation) {
        case 'activate':
          await Promise.all(
            userIds.map(id => 
              fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' }),
              })
            )
          );
          setUsers(prev => prev.map(user => 
            userIds.includes(user.id) ? { ...user, status: 'active' as const } : user
          ));
          break;

        case 'suspend':
          await Promise.all(
            userIds.map(id => 
              fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'suspended' }),
              })
            )
          );
          setUsers(prev => prev.map(user => 
            userIds.includes(user.id) ? { ...user, status: 'suspended' as const } : user
          ));
          break;

        case 'delete':
          await Promise.all(
            userIds.map(id => fetch(`/api/users/${id}`, { method: 'DELETE' }))
          );
          setUsers(prev => prev.filter(user => !userIds.includes(user.id)));
          break;

        case 'export':
          const exportData = users.filter(user => userIds.includes(user.id));
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          break;
      }

      setSelectedUsers(new Set());
      setShowBulkConfirm(false);
      setBulkOperation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user activity logs
  const fetchUserActivity = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/activity`);
      if (!response.ok) throw new Error('Failed to fetch user activity');
      
      const activity = await response.json();
      setUserActivity(activity);
      setShowActivityModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user activity');
    }
  };

  // Enhanced filtering logic
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!user.username.toLowerCase().includes(searchLower) &&
            !user.email.toLowerCase().includes(searchLower) &&
            !(user.displayName?.toLowerCase().includes(searchLower))) {
          return false;
        }
      }

      // Role filter
      if (filters.role && user.role !== filters.role) return false;

      // Status filter
      if (filters.status && user.status !== filters.status) return false;

      // Email verified filter
      if (filters.emailVerified === 'verified' && !user.emailVerified) return false;
      if (filters.emailVerified === 'unverified' && user.emailVerified) return false;

      // Last login range filter
      if (filters.lastLoginRange && user.lastLogin) {
        const now = new Date();
        const lastLogin = new Date(user.lastLogin);
        const daysDiff = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);

        switch (filters.lastLoginRange) {
          case 'today':
            if (daysDiff > 1) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
          case 'never':
            if (user.lastLogin) return false;
            break;
        }
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[filters.sortBy];
      let bValue: any = b[filters.sortBy];

      // Handle date fields
      if (filters.sortBy === 'lastLogin' || filters.sortBy === 'createdAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Handle string fields
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, filters]);

  // Pagination logic
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  // Selection handlers
  const handleSelectUser = useCallback((userId: number, checked: boolean) => {
    setSelectedUsers(prev => {
      // Ensure prev is always a Set, fallback to empty Set if undefined
      const currentSet = prev instanceof Set ? prev : new Set<number>();
      const newSet = new Set(currentSet);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set((paginatedUsers || []).map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  }, [paginatedUsers]);

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Role color helper
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'moderator': return 'text-blue-600 bg-blue-100';
      case 'normal': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <button
          onClick={() => setShowUserModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="normal">Normal</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>

          {/* Email Verified Filter */}
          <select
            value={filters.emailVerified}
            onChange={(e) => setFilters(prev => ({ ...prev, emailVerified: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Email Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>

          {/* Last Login Filter */}
          <select
            value={filters.lastLoginRange}
            onChange={(e) => setFilters(prev => ({ ...prev, lastLoginRange: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Last Login</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="never">Never</option>
          </select>

          {/* Sort Options */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder];
              setFilters(prev => ({ ...prev, sortBy, sortOrder }));
            }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="username-asc">Username A-Z</option>
            <option value="username-desc">Username Z-A</option>
            <option value="lastLogin-desc">Last Login Recent</option>
            <option value="lastLogin-asc">Last Login Oldest</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchUsers}
            className="p-2 border rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>      {/* Bulk Operations */}
      {selectedUsers && selectedUsers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setBulkOperation('activate'); setShowBulkConfirm(true); }}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
              >
                <UserCheck className="w-3 h-3" />
                Activate
              </button>
              <button
                onClick={() => { setBulkOperation('suspend'); setShowBulkConfirm(true); }}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors flex items-center gap-1"
              >
                <UserX className="w-3 h-3" />
                Suspend
              </button>
              <button
                onClick={() => { setBulkOperation('export'); setShowBulkConfirm(true); }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
              <button
                onClick={() => { setBulkOperation('delete'); setShowBulkConfirm(true); }}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">                  <input
                    type="checkbox"
                    checked={paginatedUsers && paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers && selectedUsers.has(user.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">                    <input
                      type="checkbox"
                      checked={selectedUsers ? selectedUsers.has(user.id) : false}
                      onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm text-gray-600">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName || user.username}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLogin ? (
                      <div>
                        <div>{new Date(user.lastLogin).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(user.lastLogin).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full text-green-600 bg-green-100">
                          <Mail className="w-3 h-3 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full text-yellow-600 bg-yellow-100">
                          <Mail className="w-3 h-3 mr-1" />
                          Unverified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => fetchUserActivity(user.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="View Activity"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowUserModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of{' '}
                {filteredUsers.length} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    Math.abs(page - currentPage) <= 2
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-3 py-1 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded text-sm ${
                          currentPage === page
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          onSave={handleSaveUser}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Activity Modal */}
      {showActivityModal && (
        <ActivityModal
          activity={userActivity}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {/* Bulk Confirmation Modal */}
      {showBulkConfirm && bulkOperation && (        <BulkConfirmModal
          operation={bulkOperation}
          userCount={selectedUsers ? selectedUsers.size : 0}
          onConfirm={handleBulkOperation}
          onCancel={() => {
            setShowBulkConfirm(false);
            setBulkOperation(null);
          }}
        />
      )}
    </div>
  );
};

// User Modal Component for creating/editing users
const UserModal: React.FC<{
  user: User | null;
  onSave: (userData: Partial<User>) => void;
  onClose: () => void;
}> = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    displayName: user?.displayName || '',
    role: user?.role || 'normal',
    status: user?.status || 'active',
    password: '',
    confirmPassword: '',
    emailVerified: user?.emailVerified || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!user && !formData.password) {
      newErrors.password = 'Password is required for new users';
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare data for submission
    const userData: any = {
      username: formData.username,
      email: formData.email,
      displayName: formData.displayName,
      role: formData.role,
      status: formData.status,
      emailVerified: formData.emailVerified,
    };

    if (formData.password) {
      userData.password = formData.password;
    }

    onSave(userData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {user ? 'Edit User' : 'Create User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.username ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="normal">Normal</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailVerified"
              checked={formData.emailVerified}
              onChange={(e) => setFormData(prev => ({ ...prev, emailVerified: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="emailVerified" className="ml-2 text-sm text-gray-700">
              Email Verified
            </label>
          </div>

          {(!user || formData.password) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!user && '*'}
                </label>
                <PasswordInput
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={user ? "Leave blank to keep current password" : "Enter password"}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <PasswordInput
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {user ? 'Update User' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Activity Modal Component
const ActivityModal: React.FC<{
  activity: ActivityLog[];
  onClose: () => void;
}> = ({ activity, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">User Activity Log</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activity found</p>
          ) : (
            activity.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">
                      {log.activityType.replace('_', ' ').toUpperCase()}
                    </div>
                    {log.details && (
                      <div className="text-sm text-gray-600 mt-1">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                    {log.ipAddress && (
                      <div className="text-xs text-gray-500 mt-1">
                        IP: {log.ipAddress}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Bulk Confirmation Modal Component
const BulkConfirmModal: React.FC<{
  operation: BulkOperation;
  userCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ operation, userCount, onConfirm, onCancel }) => {
  const getOperationText = () => {
    switch (operation) {
      case 'activate': return 'activate';
      case 'suspend': return 'suspend';
      case 'delete': return 'delete';
      case 'export': return 'export';
      case 'changeRole': return 'change role for';
      default: return operation;
    }
  };

  const isDestructive = operation === 'delete';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Confirm Bulk Operation
          </h2>
          <p className="text-gray-600 mt-2">
            Are you sure you want to {getOperationText()} {userCount} user{userCount > 1 ? 's' : ''}?
          </p>
          {isDestructive && (
            <p className="text-red-600 text-sm mt-2 font-medium">
              This action cannot be undone.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 rounded-lg text-white transition-colors ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isDestructive ? 'Delete' : 'Confirm'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;