/**
 * Admin Panel Dashboard Test Suite
 * 
 * This file contains tests for the admin panel features, focusing on user management functionality.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminPanel from '../client/src/pages/AdminPanel';
import UserManagementScreen from '../client/src/pages/admin/UserManagementScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API responses
global.fetch = jest.fn();

const mockUsers = [
  { id: 1, username: 'admin', email: 'admin@filmflex.com', role: 'admin', status: 'active', lastLogin: '2025-05-03T08:30:45Z' },
  { id: 2, username: 'cuongtm2012', email: 'cuongtm2012@example.com', role: 'user', status: 'active', lastLogin: '2025-05-02T14:22:10Z' },
  { id: 3, username: 'moderator', email: 'moderator@filmflex.com', role: 'moderator', status: 'active', lastLogin: '2025-05-01T18:45:30Z' },
  { id: 4, username: 'inactiveuser', email: 'inactive@example.com', role: 'user', status: 'inactive', lastLogin: '2025-04-15T10:20:15Z' },
  { id: 5, username: 'testuser', email: 'test@example.com', role: 'user', status: 'active', lastLogin: '2025-05-03T09:15:00Z' }
];

// Create a fresh QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper component with necessary providers
const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock authentication context
jest.mock('../client/src/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'admin', email: 'admin@filmflex.com', role: 'admin' },
    isLoading: false,
    loginMutation: { mutate: jest.fn(), isPending: false },
    logoutMutation: { mutate: jest.fn(), isPending: false }
  })
}));

describe('Admin Panel - User Management Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock fetch for user list
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: mockUsers,
            total: mockUsers.length,
            page: 1,
            limit: 10
          })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  // UM-01: Login with admin account
  test('UM-01: Login with admin account', async () => {
    // Set up specific response for this test
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url.includes('/api/login') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            id: 1, 
            username: 'admin', 
            email: 'admin@filmflex.com', 
            role: 'admin' 
          })
        });
      }
      return Promise.resolve({
        ok: false
      });
    });

    // Render login component
    renderWithProviders(<AdminPanel />);
    
    // Find login form elements
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    // Fill in credentials
    await userEvent.type(usernameInput, 'admin');
    await userEvent.type(passwordInput, 'Cuongtm2012$');
    fireEvent.click(loginButton);
    
    // Check that we're redirected to the admin dashboard
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
  });

  // UM-02: Display user list
  test('UM-02: Display user list', async () => {
    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the user list to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
      expect(screen.getByText(/ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Username/i)).toBeInTheDocument();
      expect(screen.getByText(/Email/i)).toBeInTheDocument();
      expect(screen.getByText(/Role/i)).toBeInTheDocument();
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Login/i)).toBeInTheDocument();
      expect(screen.getByText(/Actions/i)).toBeInTheDocument();
    });
    
    // Check that the mock users are displayed
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('cuongtm2012')).toBeInTheDocument();
      expect(screen.getByText('moderator')).toBeInTheDocument();
    });
  });

  // UM-03: Search user
  test('UM-03: Search user', async () => {
    // Mock search API response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/admin/users') && url.includes('search=admin')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: [mockUsers[0]], // Only return the admin user
            total: 1,
            page: 1,
            limit: 10
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find and interact with the search box
    const searchInput = screen.getByPlaceholderText(/Search users/i);
    await userEvent.type(searchInput, 'admin');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    // Verify filtered results
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.queryByText('cuongtm2012')).not.toBeInTheDocument();
    });
  });

  // UM-04: Filter by user status
  test('UM-04: Filter by user status', async () => {
    // Mock status filter API response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/admin/users') && url.includes('status=active')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: mockUsers.filter(user => user.status === 'active'),
            total: 4, // 4 active users
            page: 1,
            limit: 10
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find and click the status filter dropdown
    const statusFilter = screen.getByText(/All Status/i);
    fireEvent.click(statusFilter);
    
    // Select "Active" from the dropdown
    const activeOption = screen.getByText(/^Active$/i);
    fireEvent.click(activeOption);
    
    // Verify filtered results - should only see active users
    await waitFor(() => {
      expect(screen.getAllByText(/active/i).length).toBeGreaterThan(1);
      expect(screen.queryByText('inactive')).not.toBeInTheDocument();
    });
  });

  // UM-05: Filter by user role
  test('UM-05: Filter by user role', async () => {
    // Mock role filter API response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/admin/users') && url.includes('role=admin')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            data: [mockUsers[0]], // Only the admin user
            total: 1,
            page: 1,
            limit: 10
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find and click the role filter dropdown
    const roleFilter = screen.getByText(/All Roles/i);
    fireEvent.click(roleFilter);
    
    // Select "admin" from the dropdown
    const adminOption = screen.getByText(/^admin$/i);
    fireEvent.click(adminOption);
    
    // Verify filtered results - should only see admin users
    await waitFor(() => {
      expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);
      expect(screen.queryByText('moderator')).not.toBeInTheDocument();
      expect(screen.queryByText('user')).not.toBeInTheDocument();
    });
  });

  // UM-06: Add new user
  test('UM-06: Add new user', async () => {
    // Mock user creation API response
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url.includes('/api/admin/users') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            id: 6,
            username: 'newuser',
            email: 'newuser@example.com',
            role: 'user',
            status: 'active',
            lastLogin: null
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Click the "New User" button
    const newUserButton = screen.getByText(/New User/i);
    fireEvent.click(newUserButton);
    
    // Fill in the new user form
    await waitFor(() => {
      expect(screen.getByText(/Add New User/i)).toBeInTheDocument();
    });
    
    const usernameInput = screen.getByLabelText(/Username/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const roleSelect = screen.getByLabelText(/Role/i);
    const saveButton = screen.getByText(/Save/i);
    
    await userEvent.type(usernameInput, 'newuser');
    await userEvent.type(emailInput, 'newuser@example.com');
    await userEvent.type(passwordInput, 'Password123');
    // Select "user" role
    fireEvent.change(roleSelect, { target: { value: 'user' } });
    
    // Submit the form
    fireEvent.click(saveButton);
    
    // Verify success message and updated user list
    await waitFor(() => {
      expect(screen.getByText(/User added successfully/i)).toBeInTheDocument();
    });
  });

  // UM-07: Edit user information
  test('UM-07: Edit user information', async () => {
    // Mock user update API response
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url.includes('/api/admin/users/2') && options.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            id: 2,
            username: 'cuongtm2012',
            email: 'updated_email@example.com',
            role: 'moderator',
            status: 'active'
          })
        });
      } else if (url.includes('/api/admin/users/2') && options.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers[1])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find and click the edit button for user "cuongtm2012"
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    // Find the specific edit button near the cuongtm2012 row
    const targetRow = screen.getByText('cuongtm2012').closest('tr');
    const editButton = targetRow?.querySelector('button[aria-label="Edit user"]');
    if (editButton) {
      fireEvent.click(editButton);
    }
    
    // Wait for edit form to appear
    await waitFor(() => {
      expect(screen.getByText(/Edit User/i)).toBeInTheDocument();
    });
    
    // Change email and role
    const emailInput = screen.getByLabelText(/Email/i);
    const roleSelect = screen.getByLabelText(/Role/i);
    const saveButton = screen.getByText(/Save Changes/i);
    
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'updated_email@example.com');
    fireEvent.change(roleSelect, { target: { value: 'moderator' } });
    
    // Submit the form
    fireEvent.click(saveButton);
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/User updated successfully/i)).toBeInTheDocument();
    });
  });

  // UM-08: View user details
  test('UM-08: View user details', async () => {
    // Mock user details API response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/admin/users/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ...mockUsers[0],
            createdAt: '2025-01-15T10:30:00Z',
            lastActivity: '2025-05-03T09:45:20Z',
            loginCount: 128,
            watchedMovies: 45,
            watchlistItems: 12
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find and click the view button for user "admin"
    const targetRow = screen.getByText('admin').closest('tr');
    const viewButton = targetRow?.querySelector('button[aria-label="View user"]');
    if (viewButton) {
      fireEvent.click(viewButton);
    }
    
    // Wait for user details modal to appear
    await waitFor(() => {
      expect(screen.getByText(/User Details/i)).toBeInTheDocument();
      expect(screen.getByText(/admin@filmflex.com/i)).toBeInTheDocument();
      expect(screen.getByText(/Login Count: 128/i)).toBeInTheDocument();
      expect(screen.getByText(/Watched Movies: 45/i)).toBeInTheDocument();
    });
    
    // Close the modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText(/User Details/i)).not.toBeInTheDocument();
    });
  });

  // UM-09: Bulk action - Activate Users
  test('UM-09: Bulk action - Activate Users', async () => {
    // Mock bulk update API response
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url.includes('/api/admin/users/bulk') && options.method === 'PUT') {
        const data = JSON.parse(options.body as string);
        if (data.action === 'activate' && data.userIds?.includes(4)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              success: true,
              message: 'Users activated successfully',
              count: 1
            })
          });
        }
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          data: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10
        })
      });
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find and check the checkbox for the inactive user
    const checkboxes = screen.getAllByRole('checkbox');
    const inactiveUserRow = screen.getByText('inactiveuser').closest('tr');
    const checkbox = inactiveUserRow?.querySelector('input[type="checkbox"]');
    if (checkbox) {
      fireEvent.click(checkbox);
    }
    
    // Select "Activate Users" from the bulk actions dropdown
    const bulkActionsDropdown = screen.getByLabelText(/Bulk Actions/i);
    fireEvent.change(bulkActionsDropdown, { target: { value: 'activate' } });
    
    // Click Apply button
    const applyButton = screen.getByText(/Apply/i);
    fireEvent.click(applyButton);
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/Users activated successfully/i)).toBeInTheDocument();
    });
  });

  // UM-10: Export user list to CSV
  test('UM-10: Export user list to CSV', async () => {
    // Mock window.URL.createObjectURL
    const createObjectURLMock = jest.fn();
    global.URL.createObjectURL = createObjectURLMock;
    
    // Mock anchor element click
    const mockAnchorElement = { click: jest.fn(), remove: jest.fn() };
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') return mockAnchorElement as unknown as HTMLElement;
      return document.createElement(tagName);
    });

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find and click the Export CSV button
    const exportButton = screen.getByText(/Export CSV/i);
    fireEvent.click(exportButton);
    
    // Verify that download was initiated
    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(mockAnchorElement.click).toHaveBeenCalled();
    });
  });

  // User Management Permissions Tests
  
  // UM-PERM-01: User has permission to create new user
  test('UM-PERM-01: User has permission to create new user', async () => {
    // Use the admin user (which has permission)
    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Verify that New User button is visible
    const newUserButton = screen.getByText(/New User/i);
    expect(newUserButton).toBeInTheDocument();
    expect(newUserButton).toBeEnabled();
  });

  // UM-PERM-02: User has no permission to create new user
  test('UM-PERM-02: User has no permission to create new user', async () => {
    // Mock authentication context with a user that doesn't have permission
    jest.spyOn(require('../client/src/hooks/use-auth'), 'useAuth').mockImplementation(() => ({
      user: { id: 3, username: 'moderator', email: 'moderator@filmflex.com', role: 'moderator' },
      isLoading: false,
      loginMutation: { mutate: jest.fn(), isPending: false },
      logoutMutation: { mutate: jest.fn(), isPending: false }
    }));

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Verify that New User button is not visible
    expect(screen.queryByText(/New User/i)).not.toBeInTheDocument();
  });

  // UM-PERM-03: User has permission to edit users
  test('UM-PERM-03: User has permission to edit users', async () => {
    // Use the admin user (which has permission)
    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Find the edit buttons and verify they are visible
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons.length).toBeGreaterThan(0);
  });

  // UM-PERM-04: User has no permission to edit users
  test('UM-PERM-04: User has no permission to edit users', async () => {
    // Mock authentication context with a user that doesn't have permission
    jest.spyOn(require('../client/src/hooks/use-auth'), 'useAuth').mockImplementation(() => ({
      user: { id: 5, username: 'testuser', email: 'test@example.com', role: 'user' },
      isLoading: false,
      loginMutation: { mutate: jest.fn(), isPending: false },
      logoutMutation: { mutate: jest.fn(), isPending: false }
    }));

    renderWithProviders(<UserManagementScreen />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
    
    // Verify that Edit buttons are not visible
    expect(screen.queryAllByRole('button', { name: /edit/i })).toHaveLength(0);
  });
});