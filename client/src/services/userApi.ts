import { User, UserListResponse, UserResponse, UserFilters, Pagination } from '../types/api';

const API_BASE = '/api';

export class UserManagementAPI {
  // Get all users with pagination and filtering
  static async getUsers(
    page: number = 1,
    limit: number = 10,
    filters?: UserFilters
  ): Promise<UserListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`${API_BASE}/admin/users?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
  }

  // Get user by ID
  static async getUserById(id: number): Promise<UserResponse> {
    const response = await fetch(`${API_BASE}/admin/users/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    return response.json();
  }

  // Update user
  static async updateUser(id: number, userData: Partial<User>): Promise<UserResponse> {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }

    return response.json();
  }

  // Change user status (activate, deactivate, ban)
  static async changeUserStatus(id: number, status: string): Promise<UserResponse> {
    const response = await fetch(`${API_BASE}/admin/users/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to change user status: ${response.statusText}`);
    }

    return response.json();
  }

  // Delete user
  static async deleteUser(id: number): Promise<{ status: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`);
    }

    return response.json();
  }

  // Get user statistics
  static async getUserStats(): Promise<{
    status: boolean;
    stats: {
      totalUsers: number;
      activeUsers: number;
      newUsersThisMonth: number;
      bannedUsers: number;
    };
  }> {
    const response = await fetch(`${API_BASE}/admin/users/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user stats: ${response.statusText}`);
    }

    return response.json();
  }
}